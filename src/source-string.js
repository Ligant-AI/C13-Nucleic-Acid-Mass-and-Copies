const BREAK_POINTS = [0x000A, 0x000D, 0x000B, 0x000C, 0x0085, 0x2028, 0x2029];
const STRIP_RANGES = [
    [0x0000, 0x0008], [0x000E, 0x001F], [0x007F, 0x007F], [0x0080, 0x0084], [0x0086, 0x009F],
    [0x200E, 0x200F], [0x202A, 0x202E], [0x2066, 0x2069], [0x061C, 0x061C],
];
const TRIM_SINGLES = [0x0009, 0x000A, 0x000B, 0x000C, 0x000D, 0x0020, 0x00A0, 0x1680];
const TRIM_RANGES = [[0x2000, 0x200A]];
const TRIM_TAIL = [0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF];
function expand(singles, ranges, tail) {
    const out = [...singles];
    for (const [lo, hi] of ranges)
        for (let c = lo; c <= hi; c += 1)
            out.push(c);
    for (const c of tail)
        out.push(c);
    return out;
}
const STRIP_LIST = expand([], STRIP_RANGES, []);
const TRIM_LIST = expand(TRIM_SINGLES, TRIM_RANGES, TRIM_TAIL);
const BREAK_SET = new Set(BREAK_POINTS);
const STRIP_SET = new Set(STRIP_LIST);
const TRIM_SET = new Set(TRIM_LIST);
export const SOURCE_CAP = 1000;
export const SOURCE_RULE = Object.freeze({
    breaks: Object.freeze([...BREAK_POINTS]),
    strip: Object.freeze([...STRIP_LIST]),
    trim: Object.freeze([...TRIM_LIST]),
    cap: SOURCE_CAP,
});
const SPACE = 0x0020;
const CR = 0x000D;
const LF = 0x000A;
function codePointsOf(text) {
    const out = [];
    for (const ch of text)
        out.push(ch.codePointAt(0));
    return out;
}
function passBreaks(cps) {
    const out = [];
    for (let i = 0; i < cps.length; i += 1) {
        const c = cps[i];
        if (c === CR && i + 1 < cps.length && cps[i + 1] === LF) {
            out.push(SPACE);
            i += 1;
        }
        else if (BREAK_SET.has(c)) {
            out.push(SPACE);
        }
        else {
            out.push(c);
        }
    }
    return out;
}
function passStrip(cps) {
    const out = [];
    for (const c of cps)
        if (!STRIP_SET.has(c))
            out.push(c);
    return out;
}
function passTrim(cps) {
    let lo = 0;
    let hi = cps.length;
    while (lo < hi && TRIM_SET.has(cps[lo]))
        lo += 1;
    while (hi > lo && TRIM_SET.has(cps[hi - 1]))
        hi -= 1;
    return cps.slice(lo, hi);
}
function textOf(cps) {
    const pieces = [];
    for (const c of cps)
        pieces.push(String.fromCodePoint(c));
    return pieces.join('');
}
export function normaliseSource(raw, compelled) {
    if (raw !== null && raw !== undefined && typeof raw !== 'string') {
        throw new TypeError('normaliseSource takes a string');
    }
    const text = raw === null || raw === undefined ? '' : raw;
    const cps = passTrim(passStrip(passBreaks(codePointsOf(text))));
    const value = textOf(cps);
    const length = cps.length;
    if (length > SOURCE_CAP)
        return { status: 'refused', code: 'NAMC-RF-16', value, length };
    if (length === 0 && compelled === true)
        return { status: 'incomplete', code: 'NAMC-RF-01', value, length };
    return { status: 'ok', code: null, value, length };
}
