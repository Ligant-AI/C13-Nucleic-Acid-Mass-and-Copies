import { R, cmp, div, sub, parse, toNumber, incomplete, rejected, done, missingOf, registerModule } from '../core.js';
export const MODULE = 'E10';
export const MODULE_VERSION = '0.2.0';
registerModule(MODULE, MODULE_VERSION);
const M = MODULE;
export { scaleUnit, massToMolar, molarToMass, massToMoles, molesToMass, molesToCopies, copiesToMoles, massToCopies, copiesToMass, amountFromConcentration, } from './conversions.js';
export { UNITS, N_A } from './units.js';
export function strengthFactor(P, dyeNamed = null) {
    const miss = missingOf([['P', P]]);
    if (miss.length)
        return incomplete(M, miss);
    const p = parse(P);
    if (!p || cmp(p, R(1)) < 0)
        return rejected(M, 'CCS-RF-03', ['P']);
    const flags = dyeNamed === true && cmp(p, R(1)) === 0 ? ['CCS-FL-01'] : [];
    return done(M, { f: toNumber(p), flags });
}
export function splitVolumes(Vnew, N) {
    const miss = missingOf([['Vnew', Vnew], ['N', N]]);
    if (miss.length)
        return incomplete(M, miss);
    const v = parse(Vnew);
    const n = parse(N);
    const bad = [];
    if (!v || cmp(v, R(0)) <= 0)
        bad.push('Vnew');
    if (!n || cmp(n, R(1)) < 0)
        bad.push('N');
    if (bad.length)
        return rejected(M, 'CCS-RF-03', bad);
    const tr = div(v, n);
    return done(M, { Vtr: toNumber(tr), Vmedium: toNumber(sub(v, tr)) });
}
