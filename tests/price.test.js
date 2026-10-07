import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePrice, formatPrice, CURRENCIES} from '../price.js';
const response = (amount, currency = 'USD', base = 'BTC') => JSON.stringify({data: {amount, currency, base}});

test('accepts decimal spot prices in all supported currencies', () => {
    for (const currency of CURRENCIES)
        assert.equal(parsePrice(response('1810669.4682829024496039775', currency), currency), 1810669.4682829024496039775);
});
test('rejects malformed, mismatched and non-positive API responses', () => {
    for (const body of ['{}', 'null', 'not JSON', response('1', 'EUR'), response('1', 'USD', 'ETH'),
        ...['', '0', '-1', 'Infinity', 'NaN', '1e999', '0xFF', '9'.repeat(400), null, 123].map(value => response(value))])
        assert.throws(() => parsePrice(body, 'USD'));
});
test('formats currencies and precision using the system locale', () => {
    for (const currency of CURRENCIES) {
        for (const decimals of [false, true]) {
            const digits = decimals ? 2 : 0;
            assert.equal(formatPrice(1234.567, currency, decimals), new Intl.NumberFormat(undefined, {
                style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits,
            }).format(1234.567));
        }
    }
});
