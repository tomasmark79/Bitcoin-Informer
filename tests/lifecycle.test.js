import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {parsePrice, formatPrice} from '../price.js';

async function fixture() {
    const pending = [];
    const timers = new Set();
    let nextTimer = 0;
    const settings = {
        values: {currency: 'USD', 'refresh-interval': 60, 'show-decimals': false},
        get_string(key) { return this.values[key]; },
        get_int(key) { return this.values[key]; },
        get_boolean(key) { return this.values[key]; },
        connect(_signal, callback) { this.callback = callback; return 1; },
        disconnect() { this.callback = null; },
        change(key, value) { this.values[key] = value; this.callback(this, key); },
    };
    class Item {
        constructor(text) { this.label = {text}; }
        setSensitive(value) { this.sensitive = value; }
    }
    class Button {
        constructor() {
            this.menu = {addMenuItem() {}, addAction() { return new Item(''); }};
        }
        add_child() {}
        destroy() { this.destroyed = true; }
    }
    class Session {
        send_and_read_async(message, _priority, cancellable, callback) {
            pending.push({message, cancellable, callback, session: this});
        }
        send_and_read_finish(result) {
            if (result.error) throw result.error;
            return {get_data: () => new TextEncoder().encode(result.body)};
        }
        abort() {}
    }
    const context = vm.createContext({
        Clutter: {ActorAlign: {CENTER: 0}},
        Gio: {Cancellable: class { cancel() { this.cancelled = true; } }},
        GLib: {PRIORITY_DEFAULT: 0, SOURCE_CONTINUE: true,
            timeout_add_seconds() { timers.add(++nextTimer); return nextTimer; },
            source_remove(id) { timers.delete(id); }},
        Soup: {Session, Status: {OK: 200}, Message: {new(_method, url) { return {url, get_status: () => 200}; }}},
        St: {Label: class { constructor(properties) { Object.assign(this, properties); } }},
        Extension: class { getSettings() { return settings; } },
        Main: {panel: {addToStatusArea() {}}}, PanelMenu: {Button},
        PopupMenu: {PopupMenuItem: Item, PopupSeparatorMenuItem: Item},
        parsePrice, formatPrice, TextDecoder, Date, console: {warn() {}},
    });
    const source = (await readFile(new URL('../extension.js', import.meta.url), 'utf8'))
        .replace(/^import .*;\n/gm, '').replace('export default class', 'class');
    vm.runInContext(`${source}\nthis.instance = new BitcoinInformer();`, context);
    const extension = context.instance;
    extension.enable();
    function complete(request, currency = 'USD', error = null) {
        request.callback(request.session, {error, body: JSON.stringify({data: {base: 'BTC', currency, amount: '90000.25'}})});
    }
    return {extension, settings, pending, timers, complete};
}

test('ignores late responses across currency changes and disable/enable', async () => {
    const {extension, settings, pending, timers, complete} = await fixture();
    const first = pending[0];
    extension._refresh();
    assert.equal(pending.length, 1, 'no overlapping requests');
    settings.change('currency', 'CZK');
    assert.equal(first.cancellable.cancelled, true);
    assert.equal(timers.size, 1);
    complete(first);
    assert.equal(extension._quote, null, 'old USD response ignored');
    complete(pending[1], 'CZK');
    assert.equal(extension._quote.currency, 'CZK');
    extension._refresh();
    const old = pending[2];
    extension.disable();
    assert.equal(old.cancellable.cancelled, true);
    assert.equal(timers.size, 0);
    extension.enable();
    complete(old, 'CZK');
    assert.equal(extension._quote, null, 'old session cannot update new indicator');
    complete(pending[3], 'CZK');
    assert.equal(extension._quote.currency, 'CZK');
    extension.disable();
});

test('keeps and marks last known price on failure, recovers on success', async () => {
    const {extension, pending, complete} = await fixture();
    complete(pending[0]);
    const quote = extension._quote;
    extension._refresh();
    complete(pending[1], 'USD', new Error('offline'));
    assert.equal(extension._quote, quote);
    assert.match(extension._label.text, /⚠/);
    assert.equal(extension._refreshItem.sensitive, true);
    extension._refresh();
    complete(pending[2]);
    assert.doesNotMatch(extension._label.text, /⚠/);
    extension.disable();
});
