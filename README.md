# Bitcoin Informer

Shows the current spot price of one bitcoin in the GNOME top panel. Inspired by
[Keyboard Informer](https://github.com/tomasmark79/kbd-informer), with a Czech
interface and number formatting based on the system locale.

## Features

- USD (default), EUR and CZK
- Automatic refresh every 60 seconds, configurable from 30 to 3600 seconds
- Panel menu with the exact price, receipt time, manual refresh and Preferences
- Last known price marked with ⚠ during failures; a dash before the first successful quote
- Asynchronous HTTPS with a 15-second timeout and cancellation when disabled or the currency changes

## Requirements

Declared GNOME Shell versions: **45–50**, as listed in `metadata.json`.
Runtime requires GJS, libsoup 3, libadwaita and an internet connection.
No API key or npm dependencies are needed.

Build tools: Bash, Python 3, Node.js (syntax checks), zip and `glib-compile-schemas`.
Local installation also requires `gnome-extensions`.

## Installation

From the project directory:

```bash
./build.sh --install
```

On Wayland, log out and back in when needed to load new or changed JavaScript,
then enable the extension:

```bash
gnome-extensions enable bitcoin-informer@digitalspace.name
```

Installation updates the user copy without enabling the extension or logging you out.

## Usage

Click the panel price to open the menu, change the currency in Preferences,
or request an immediate refresh. Preferences can also be opened with:

```bash
gnome-extensions prefs bitcoin-informer@digitalspace.name
```

### Data source

Quotes come from `https://api.coinbase.com/v2/prices/BTC-USD/spot` (or EUR/CZK).
The displayed value is Coinbase's spot price. The timestamp indicates receipt of
the response, rather than the time of the last trade. The last quote is held only
in memory. Each interval or manual refresh sends one request to Coinbase.

## Development

```bash
./build.sh --check
node --experimental-default-type=module --test tests/*.test.js
./build.sh
```

The output is `dist/bitcoin-informer@digitalspace.name.zip`. `-b` and `-r` are build
aliases; `-i`, `-bi` and `-ri` build the current sources and install them.

Compare with a separately saved previous distribution archive, if available:

```bash
./build.sh --compare-zip /path/to/previous-bitcoin-informer.zip
```

This verifies identical paths and bytes for every packaged file, including metadata,
LICENSE and the compiled schema. ZIP timestamps and compression may differ.

For publication on extensions.gnome.org, keep metadata accurate and let the website
manage the submission version. The interface is currently Czech; gettext metadata
is not declared because the code does not use translation catalogs.

Verify currency changes, manual refresh, network loss and disable/enable during
a request in GNOME. Older declared Shell versions require separate verification.
The existing development notes record five automated checks, live API checks for
all three currencies and a native Preferences window. Panel display in the running
Shell has not been verified; a successful build alone does not confirm it.

## Troubleshooting

During a network failure, the last known price remains marked with ⚠ and the
extension retries on its normal schedule. Start a fresh GNOME session if an
installed code change does not appear.

## License

[GPL-3.0-or-later](LICENSE). Author: Tomáš Mark.

[Author on GitHub](https://github.com/tomasmark79) · [Donate via PayPal](https://paypal.me/TomasMark)
