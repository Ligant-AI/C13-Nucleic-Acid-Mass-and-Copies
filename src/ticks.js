import { copiesToMass, copiesToMoles } from './engine-api.js';
import { floorLog10, pow10, ratCmp, ratMul, ratDiv, ratFromExact, exactOf, } from './calc.js';
import { WINDOW_BELOW, WINDOW_ABOVE } from './constants.js';
export function powerOfTenText(k) {
    if (!Number.isInteger(k))
        throw new RangeError('k must be a whole number');
    if (k >= 0)
        return '1'.concat('0'.repeat(k));
    return '0.'.concat('0'.repeat(-k - 1), '1');
}
function ceilLog10(r) {
    const f = floorLog10(r);
    return ratCmp(pow10(f), r) === 0 ? f : f + 1;
}
export function windowAndTicks(result) {
    const none = { window: null, ticks: [], calls: [] };
    if (!result || result.status !== 'ok' || result.zero)
        return none;
    const basis = result.tickBasis;
    if (!basis)
        return none;
    const marker = ratFromExact(basis.marker);
    if (marker.n <= 0n)
        return none;
    const exponent = floorLog10(marker);
    const lowExp = exponent - WINDOW_BELOW;
    const highExp = exponent + WINDOW_ABOVE;
    const low = pow10(lowExp);
    const high = pow10(highExp);
    const win = { exponent, lowExponent: lowExp, highExponent: highExp };
    const q = basis.kind === 'genomeI'
        ? ratFromExact(basis.mgc)
        : ratDiv(marker, ratFromExact(basis.copies));
    if (q.n <= 0n)
        return { window: win, ticks: [], calls: [] };
    const kFirst = ceilLog10(ratDiv(low, q));
    const kLast = floorLog10(ratDiv(high, q));
    const ticks = [];
    const calls = [];
    for (let k = kFirst; k <= kLast; k += 1) {
        let position;
        if (basis.kind === 'genomeI') {
            position = ratMul(q, pow10(k));
        }
        else {
            const text = powerOfTenText(k);
            const res = basis.kind === 'mass'
                ? copiesToMass(text, basis.mwText, basis.topUnit)
                : copiesToMoles(text, basis.topUnit);
            calls.push({
                fn: basis.kind === 'mass' ? 'copiesToMass' : 'copiesToMoles',
                args: basis.kind === 'mass' ? [text, basis.mwText, basis.topUnit] : [text, basis.topUnit],
            });
            if (res.status !== 'result')
                continue;
            position = ratFromExact(res.exact);
        }
        if (ratCmp(position, low) < 0 || ratCmp(position, high) > 0)
            continue;
        ticks.push({ k, position: exactOf(position) });
    }
    return { window: win, ticks, calls };
}
