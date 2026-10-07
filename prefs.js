// SPDX-License-Identifier: GPL-3.0-or-later
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {CURRENCIES} from './price.js';

export default class BitcoinInformerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings;
        const page = new Adw.PreferencesPage({title: 'Bitcoin Informer', icon_name: 'preferences-system-symbolic'});
        const group = new Adw.PreferencesGroup({
            title: 'Cena bitcoinu',
            description: 'Spotová cena z Coinbase. Internetové připojení je nutné; API klíč není potřeba.',
        });
        page.add(group);
        window.add(page);
        const currency = new Adw.ComboRow({
            title: 'Měna', model: Gtk.StringList.new(CURRENCIES),
            selected: CURRENCIES.indexOf(settings.get_string('currency')),
        });
        currency.connect('notify::selected', () => {
            settings.set_string('currency', CURRENCIES[currency.selected]);
        });
        const currencyId = settings.connect('changed::currency', () => {
            currency.selected = CURRENCIES.indexOf(settings.get_string('currency'));
        });
        window.connect('close-request', () => {
            settings.disconnect(currencyId);
            return false;
        });
        group.add(currency);
        const interval = new Adw.SpinRow({
            title: 'Interval obnovení (sekundy)',
            subtitle: 'Výchozí hodnota je 60 sekund.',
            adjustment: new Gtk.Adjustment({lower: 30, upper: 3600, step_increment: 30, page_increment: 60}),
            digits: 0,
        });
        settings.bind('refresh-interval', interval, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(interval);
        const decimals = new Adw.SwitchRow({title: 'Zobrazit haléře / centy v liště'});
        settings.bind('show-decimals', decimals, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(decimals);
        const info = new Adw.PreferencesGroup({
            title: 'Při výpadku připojení',
            description: 'Poslední známá cena zůstane v liště označená ⚠. V nabídce uvidíte čas jejího přijetí. Rozšíření se automaticky pokusí cenu znovu načíst.',
        });
        page.add(info);
    }
}
