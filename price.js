// SPDX-License-Identifier: GPL-3.0-or-later
export const CURRENCIES = ['USD', 'EUR', 'CZK'];

export function parsePrice(body, currency) {
    const {data} = JSON.parse(body);
    if (!data || data.base !== 'BTC' || data.currency !== currency ||
        typeof data.amount !== 'string' || !/^\d+(\.\d+)?$/.test(data.amount))
        throw new Error('Neplatná odpověď cenového API');
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0)
        throw new Error('Neplatná cena');
    return amount;
}

export function formatPrice(amount, currency, decimals = false) {
    return new Intl.NumberFormat(undefined, {
        style: 'currency', currency,
        minimumFractionDigits: decimals ? 2 : 0,
        maximumFractionDigits: decimals ? 2 : 0,
    }).format(amount);
}
