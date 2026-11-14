import { SOURCE_RULE } from './source-string.js';
const ZERO = 0x30;
const NINE = 0x39;
const TRIM_SET = new Set(SOURCE_RULE.trim);
export const NUMERIC_TRIM_POINTS = Object.freeze([...SOURCE_RULE.trim]);
export function trimNumeric(text) {
    let lo = 0;
    let hi = text.length;
    while (lo < hi && TRIM_SET.has(text.charCodeAt(lo)))
        lo += 1;
    while (hi > lo && TRIM_SET.has(text.charCodeAt(hi - 1)))
        hi -= 1;
    return text.slice(lo, hi);
}
export function scanNumber(raw) {
    if (raw === null || raw === undefined)
        return { status: 'empty' };
    if (typeof raw !== 'string')
        return { status: 'invalid', code: 'NAMC-RF-02' };
    const text = trimNumeric(raw);
    if (text === '')
        return { status: 'empty' };
    const invalid = { status: 'invalid', code: 'NAMC-RF-02' };
    let i = 0;
    let negative = false;
    if (text[0] === '-') {
        negative = true;
        i = 1;
    }
    let intDigits = '';
    let fracDigits = '';
    let hasPoint = false;
    for (; i < text.length; i += 1) {
        const c = text.charCodeAt(i);
        if (c >= ZERO && c <= NINE) {
            if (hasPoint)
                fracDigits += text[i];
            else
                intDigits += text[i];
        }
        else if (c === 0x2E && !hasPoint) {
            hasPoint = true;
        }
        else {
            return invalid;
        }
    }
    if (intDigits.length + fracDigits.length === 0)
        return invalid;
    return { status: 'ok', text, negative, intDigits, fracDigits, hasPoint };
}
