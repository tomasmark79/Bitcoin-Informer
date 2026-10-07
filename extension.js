// SPDX-License-Identifier: GPL-3.0-or-later
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';
import St from 'gi://St';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {parsePrice, formatPrice} from './price.js';

export default class BitcoinInformer extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._session = new Soup.Session({timeout: 15, user_agent: 'BitcoinInformer/1.0'});
        this._quote = null;
        this._failed = false;
        this._request = null;
        this._timer = null;
        this._indicator = new PanelMenu.Button(0.0, 'Bitcoin Informer');
        this._label = new St.Label({
            text: '₿ …', y_align: Clutter.ActorAlign.CENTER,
            style_class: 'bitcoin-informer-label',
        });
        this._indicator.add_child(this._label);
        this._priceItem = new PopupMenu.PopupMenuItem('Načítání ceny…', {reactive: false});
        this._statusItem = new PopupMenu.PopupMenuItem('', {reactive: false});
        this._indicator.menu.addMenuItem(this._priceItem);
        this._indicator.menu.addMenuItem(this._statusItem);
        this._indicator.menu.addMenuItem(new PopupMenu.PopupMenuItem('Zdroj: Coinbase · spotová cena', {reactive: false}));
        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._refreshItem = this._indicator.menu.addAction('Obnovit nyní', () => this._refresh());
        this._indicator.menu.addAction('Nastavení…', () => this.openPreferences());
        Main.panel.addToStatusArea(this.uuid, this._indicator, 0, 'right');
        this._settingsId = this._settings.connect('changed', (_settings, key) => {
            if (key === 'show-decimals') {
                this._render();
                return;
            }
            this._cancelRequest();
            if (key === 'currency') {
                this._quote = null;
                this._failed = false;
            }
            this._startTimer();
            this._refresh();
        });
        this._startTimer();
        this._refresh();
    }

    _startTimer() {
        if (this._timer)
            GLib.source_remove(this._timer);
        this._timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT,
            this._settings.get_int('refresh-interval'), () => {
                this._refresh();
                return GLib.SOURCE_CONTINUE;
            });
    }

    _cancelRequest() {
        // Invalidate before cancelling: late callbacks must never update a new session.
        const request = this._request;
        this._request = null;
        request?.cancel();
    }

    _refresh() {
        if (this._request || !this._session)
            return;
        const currency = this._settings.get_string('currency');
        const request = new Gio.Cancellable();
        this._request = request;
        this._refreshItem.setSensitive(false);
        this._render();
        const message = Soup.Message.new('GET', `https://api.coinbase.com/v2/prices/BTC-${currency}/spot`);
        this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, request, (session, result) => {
            try {
                const bytes = session.send_and_read_finish(result);
                if (this._request !== request)
                    return;
                if (message.get_status() !== Soup.Status.OK)
                    throw new Error(`HTTP ${message.get_status()}`);
                this._quote = {
                    amount: parsePrice(new TextDecoder().decode(bytes.get_data()), currency),
                    currency,
                    time: new Date(),
                };
                this._failed = false;
            } catch (error) {
                if (this._request !== request)
                    return;
                this._failed = true;
                console.warn(`[Bitcoin Informer] ${error.message}`);
            } finally {
                if (this._request === request) {
                    this._request = null;
                    this._refreshItem.setSensitive(true);
                    this._render();
                }
            }
        });
    }

    _render() {
        const quote = this._quote;
        const currency = this._settings.get_string('currency');
        const price = quote ? formatPrice(quote.amount, quote.currency,
            this._settings.get_boolean('show-decimals')) : '…';
        this._label.text = `₿ ${quote ? price : this._failed ? '—' : '…'}${this._failed ? ' ⚠' : ''}`;
        this._priceItem.label.text = quote
            ? `1 BTC = ${formatPrice(quote.amount, quote.currency, true)}`
            : `Cena v ${currency} ${this._failed ? 'není dostupná' : 'se načítá…'}`;
        const received = quote ? `Přijato: ${quote.time.toLocaleString()}` : 'Čekám na první cenu';
        this._statusItem.label.text = this._request ? `Obnovování… · ${received}`
            : this._failed ? `Aktualizace selhala · ${received}` : received;
        this._indicator.accessible_name = `Bitcoin: ${this._priceItem.label.text}. ${this._statusItem.label.text}`;
    }

    disable() {
        if (this._timer)
            GLib.source_remove(this._timer);
        this._timer = null;
        if (this._settingsId)
            this._settings.disconnect(this._settingsId);
        this._settingsId = null;
        this._cancelRequest();
        this._session?.abort();
        this._session = null;
        this._indicator?.destroy();
        this._indicator = null;
        this._label = null;
        this._priceItem = null;
        this._statusItem = null;
        this._refreshItem = null;
        this._settings = null;
        this._quote = null;
    }
}
