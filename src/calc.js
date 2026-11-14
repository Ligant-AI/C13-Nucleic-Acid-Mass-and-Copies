import { scanNumber, trimNumeric } from './scan.js';
import { RELATION_SOURCE_NAME } from './sources.js';
import { normaliseSource } from './source-string.js';
import { windowAndTicks } from './ticks.js';
import { massToCopies, copiesToMass, molesToCopies, copiesToMoles, amountFromConcentration, scaleUnit, ENGINE_VERSION_LINE, ENGINE_COMMIT, } from './engine-api.js';
import { MATERIALS, UNIT_TABLE, ALIQUOT_UNIT, CONC_UNIT, COPIES_UNIT, MW_UNIT, SHARE_UNIT, DILUTION_MIN, FIELD_ORDER, SIG3_TO_SCI3_EXPONENT, } from './constants.js';
import { FL, RF, IN, OU, UI, LABEL, fill } from './texts.js';
const GENOME_UNIT_MASS = 'pg';
const GENOME_UNIT_SIZE = 'bp';
const ZERO = 0n;
const ONE = 1n;
const TEN = 10n;
function bgcd(a, b) {
    let x = a < ZERO ? -a : a;
    let y = b < ZERO ? -b : b;
    while (y !== ZERO) {
        const t = x % y;
        x = y;
        y = t;
    }
    return x;
}
export function rat(n, d = ONE) {
    let num = n;
    let den = d;
    if (den < ZERO) {
        num = -num;
        den = -den;
    }
    const g = bgcd(num, den) || ONE;
    return { n: num / g, d: den / g };
}
export const ratMul = (a, b) => rat(a.n * b.n, a.d * b.d);
export const ratDiv = (a, b) => rat(a.n * b.d, a.d * b.n);
export const ratAdd = (a, b) => rat(a.n * b.d + b.n * a.d, a.d * b.d);
export const ratCmp = (a, b) => {
    const x = a.n * b.d;
    const y = b.n * a.d;
    if (x < y)
        return -1;
    return x > y ? 1 : 0;
};
export const ratIsZero = (a) => a.n === ZERO;
export const pow10 = (k) => (k >= 0 ? rat(TEN ** BigInt(k)) : rat(ONE, TEN ** BigInt(-k)));
export const exactOf = (r) => ({ num: r.n.toString(), den: r.d.toString() });
export const ratFromExact = (e) => rat(BigInt(e.num), BigInt(e.den));
function ratFromScan(s) {
    const digits = s.intDigits + s.fracDigits;
    const n = BigInt(digits === '' ? '0' : digits);
    const r = rat(s.negative ? -n : n, TEN ** BigInt(s.fracDigits.length));
    return r;
}
function ratFromPlain(text) {
    const s = scanNumber(text);
    return ratFromScan(s);
}
export function ratToPlain(r) {
    let den = r.d;
    let twos = 0;
    let fives = 0;
    while (den % 2n === ZERO) {
        den /= 2n;
        twos += 1;
    }
    while (den % 5n === ZERO) {
        den /= 5n;
        fives += 1;
    }
    if (den !== ONE)
        return null;
    const places = twos > fives ? twos : fives;
    const neg = r.n < ZERO;
    const mag = neg ? -r.n : r.n;
    const scaled = (mag * TEN ** BigInt(places)) / r.d;
    let digits = scaled.toString();
    if (places > 0) {
        digits = digits.padStart(places + 1, '0');
        digits = `${digits.slice(0, digits.length - places)}.${digits.slice(digits.length - places)}`;
    }
    return neg ? `-${digits}` : digits;
}
export function floorLog10(r) {
    if (r.n <= ZERO)
        throw new RangeError('floorLog10 needs a value above 0');
    const atLeast = (k) => (k >= 0 ? r.n >= TEN ** BigInt(k) * r.d : r.n * TEN ** BigInt(-k) >= r.d);
    let lo;
    let hi;
    if (atLeast(0)) {
        lo = 0;
        hi = 1;
        while (atLeast(hi)) {
            lo = hi;
            hi *= 2;
        }
    }
    else {
        hi = 0;
        lo = -1;
        while (!atLeast(lo)) {
            hi = lo;
            lo *= 2;
        }
    }
    while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if (atLeast(mid))
            lo = mid;
        else
            hi = mid;
    }
    return lo;
}
function roundHalfUp(n, d) {
    const q = n / d;
    return (n % d) * 2n >= d ? q + ONE : q;
}
function sig3Parts(abs) {
    let exp = floorLog10(abs);
    const shift = 2 - exp;
    const scaled = shift >= 0 ? rat(abs.n * TEN ** BigInt(shift), abs.d) : rat(abs.n, abs.d * TEN ** BigInt(-shift));
    let m = roundHalfUp(scaled.n, scaled.d);
    if (m >= 1000n) {
        m /= TEN;
        exp += 1;
    }
    return { digits: m.toString(), exp };
}
function sci3Text(digits, exp) {
    return `${digits[0]}.${digits.slice(1)} × 10^${exp}`;
}
function plainDigits(digits, exp) {
    const places = 2 - exp;
    if (places <= 0)
        return digits + '0'.repeat(-places);
    const s = digits.padStart(places + 1, '0');
    return `${s.slice(0, s.length - places)}.${s.slice(s.length - places)}`;
}
export function displayNumber(r, mode) {
    if (r.n === ZERO)
        return '0';
    const neg = r.n < ZERO;
    const abs = neg ? rat(-r.n, r.d) : r;
    const { digits, exp } = sig3Parts(abs);
    let body;
    if (mode === 'sci3' || exp >= SIG3_TO_SCI3_EXPONENT)
        body = sci3Text(digits, exp);
    else
        body = plainDigits(digits, exp);
    return neg ? `-${body}` : body;
}
export const EMPTY_INPUTS = Object.freeze({
    material: '', length: '',
    relationChoice: 'default', ownA: '', ownB: '', ownClass: '', ownSource: '',
    direction: '', route: '',
    mass: '', massUnit: '', conc: '', concUnit: '', volume: '', volumeUnit: '',
    a260: '', dilution: '', factorChoice: '', factorOwn: '', factorClass: '', factorSource: '',
    amount: '', amountUnit: '',
    genomeMass: '', genomeSize: '', genomeSource: '', genomeChoice: '', genomeForm: '',
    copies: '', outputUnit: '',
});
function unitDimension(u) {
    for (const dim of Object.keys(UNIT_TABLE))
        if (UNIT_TABLE[dim].includes(u))
            return dim;
    return null;
}
function startingFactorChoice(material) {
    const m = MATERIALS[material];
    return m && m.presetFactorPreselected ? 'preset' : '';
}
export function changeMaterial(inputs, material) {
    const prev = inputs.material;
    const next = { ...inputs, material };
    const notices = [];
    if (!MATERIALS[material])
        return { inputs: next, notices };
    if (inputs.factorChoice !== 'own')
        next.factorChoice = startingFactorChoice(material);
    if (MATERIALS[prev] && prev !== material) {
        if (inputs.factorChoice !== 'own') {
            notices.push({ id: 'NAMC-FL-10', text: fill(FL['FL-10'], { '[material]': MATERIALS[material].short, '[state]': FL[`FL-10.${material}`] }) });
        }
        const was = MATERIALS[prev].lengthUnit;
        const now = MATERIALS[material].lengthUnit;
        if (scanNumber(inputs.length).status !== 'empty' && was !== now) {
            notices.push({ id: 'NAMC-FL-09', text: fill(FL['FL-09'], { '[bp or nt]': was, '[nt or bp]': now, '[new unit]': now }) });
        }
    }
    return { inputs: next, notices };
}
const isZeroScan = (s) => !(s.intDigits + s.fracDigits).split('').some((c) => c !== '0');
const isNegativeScan = (s) => s.negative && !isZeroScan(s);
function isWholeScan(s) { return !s.fracDigits.split('').some((c) => c !== '0'); }
function lengthUnitOf(material) { return MATERIALS[material] ? MATERIALS[material].lengthUnit : 'bp or nt'; }
function labelOf(id, material) {
    if (id === 'aliquotMass')
        return UI['UI.row.aliquot'];
    if (id === 'ownA')
        return fill(LABEL.ownA, { '[bp or nt]': lengthUnitOf(material) });
    return LABEL[id];
}
function fillParts(template, map, userKey) {
    let t = template;
    for (const key of Object.keys(map))
        if (key !== userKey)
            t = t.split(key).join(map[key]);
    if (!userKey)
        return [{ text: t, user: false }];
    const parts = [];
    t.split(userKey).forEach((piece, i) => {
        if (i > 0)
            parts.push({ text: map[userKey], user: true });
        if (piece !== '')
            parts.push({ text: piece, user: false });
    });
    return parts;
}
const joinParts = (parts) => parts.map((p) => p.text).join('');
function refusal(code, field, text, engineCode) {
    const r = { code, field, text };
    if (engineCode)
        r.engineCode = engineCode;
    return r;
}
export function engineRefusal(res, fieldId, material) {
    const label = fieldId === '' ? '' : labelOf(fieldId, material);
    const engineCode = res.code || res.status;
    if (engineCode === 'E10-RC-01' || engineCode === 'E10-RC-02') {
        return refusal('NAMC-RF-11', fieldId, fill(RF['RF-11'], { '[Field]': label }), engineCode);
    }
    return refusal('NAMC-ENGINE', fieldId, label, engineCode);
}
function strandText(kind, cls, material, fieldLabel) {
    const short = MATERIALS[material].short;
    let text;
    if (cls === 'ds') {
        text = fill(RF['RF-09.a'], {
            '[Field]': fieldLabel, '[relation or factor]': kind, '[ssDNA or ssRNA]': short, '[material]': short,
        });
    }
    else {
        text = fill(RF['RF-09.b'], { '[Field]': fieldLabel, '[relation or factor]': kind });
    }
    return kind === 'relation' ? `${text} ${RF['RF-09.relationSentence']}` : text;
}
const CHOICES = Object.freeze(['haploid', 'diploid']);
export function genomeState(inputs) {
    const I = { ...EMPTY_INPUTS, ...inputs };
    const hasM = scanNumber(I.genomeMass).status !== 'empty';
    const hasG = scanNumber(I.genomeSize).status !== 'empty';
    const source = normaliseSource(I.genomeSource, false);
    const hasSource = source.value !== '';
    const choice = CHOICES.includes(I.genomeChoice) ? I.genomeChoice : '';
    let form = null;
    if (hasM && !hasG)
        form = 'i';
    else if (hasG && !hasM)
        form = 'ii';
    const both = hasM && hasG;
    const declForm = choice === '' ? null : (I.genomeForm === 'i' || I.genomeForm === 'ii' ? I.genomeForm : form);
    return {
        inUse: hasM || hasG || hasSource || choice !== '',
        hasM, hasG, hasSource, both, form, choice, declForm,
        showRadios: (hasM !== hasG) || (both && choice !== ''),
        declaration: choice !== '' && declForm !== null ? IN[`IN-11.declaration.${declForm}.${choice}`] : null,
        source,
    };
}
export function setGenomeField(inputs, field, text) {
    if (field !== 'genomeMass' && field !== 'genomeSize' && field !== 'genomeSource') {
        throw new RangeError('not a genome field');
    }
    const next = { ...EMPTY_INPUTS, ...inputs, [field]: text };
    let cleared = false;
    if (next.genomeChoice !== '' && (next.genomeForm === 'i' || next.genomeForm === 'ii')) {
        const g = genomeState(next);
        const madeForFilled = next.genomeForm === 'i' ? g.hasM : g.hasG;
        const otherFilled = next.genomeForm === 'i' ? g.hasG : g.hasM;
        if (!madeForFilled && otherFilled) {
            next.genomeChoice = '';
            next.genomeForm = '';
            cleared = true;
        }
    }
    return { inputs: next, cleared };
}
export function chooseGenome(inputs, choice) {
    if (!CHOICES.includes(choice))
        throw new RangeError('not a genome choice');
    const next = { ...EMPTY_INPUTS, ...inputs, genomeChoice: choice };
    const g = genomeState(next);
    next.genomeForm = g.form === null ? (next.genomeForm || '') : g.form;
    return next;
}
export function removeGenomeEntries(inputs) {
    return {
        inputs: { ...EMPTY_INPUTS, ...inputs, genomeMass: '', genomeSize: '', genomeSource: '', genomeChoice: '', genomeForm: '' },
        notice: { id: 'NAMC-IN-11', text: IN['IN-11.removed'] },
    };
}
function planOf(I) {
    const direction = I.direction;
    const route = direction === 'toCopies' ? I.route : '';
    const outDim = I.outputUnit === '' ? '' : unitDimension(I.outputUnit);
    let usesMW;
    if (direction === 'toCopies')
        usesMW = route !== 'd';
    else if (direction === 'fromCopies')
        usesMW = outDim !== 'amount';
    else
        usesMW = true;
    const offered = I.material === 'dsDNA' && direction === 'toCopies' && (route === 'a' || route === 'b' || route === 'c');
    const genome = genomeState(I);
    const genomeActive = offered && genome.inUse;
    const formI = genomeActive && genome.form === 'i';
    const formII = genomeActive && genome.form === 'ii';
    if (formI)
        usesMW = false;
    return {
        direction, route, outDim, usesMW,
        genome, genomeOffered: offered, genomeInUse: genome.inUse, genomeActive, formI, formII,
        lengthCompelled: usesMW && !genome.inUse,
        ownRelationShown: I.relationChoice === 'own',
        factorShown: direction === 'toCopies' && route === 'c',
    };
}
export function compute(inputs) {
    const I = { ...EMPTY_INPUTS, ...inputs };
    const P = planOf(I);
    const mat = MATERIALS[I.material] || null;
    const num = (text) => scanNumber(text);
    const nameOf = (id) => labelOf(id, I.material);
    const own = { source: normaliseSource(I.ownSource, true) };
    const factor = { source: normaliseSource(I.factorSource, true) };
    const needed = new Set();
    if (I.material === '' || !mat)
        needed.add('material');
    if (P.lengthCompelled && num(I.length).status === 'empty')
        needed.add('length');
    if (P.ownRelationShown && P.usesMW) {
        if (num(I.ownA).status === 'empty')
            needed.add('ownA');
        if (num(I.ownB).status === 'empty')
            needed.add('ownB');
        if (I.ownClass === '')
            needed.add('ownClass');
        if (own.source.status === 'incomplete')
            needed.add('ownSource');
    }
    if (I.direction === '')
        needed.add('direction');
    if (P.direction === 'toCopies' && P.route === '')
        needed.add('startingQuantity');
    const valueUnitMissing = (v, u) => num(v).status === 'empty' || u === '';
    if (P.route === 'a' && valueUnitMissing(I.mass, I.massUnit))
        needed.add('mass');
    if (P.route === 'b') {
        if (valueUnitMissing(I.conc, I.concUnit))
            needed.add('conc');
        if (valueUnitMissing(I.volume, I.volumeUnit))
            needed.add('volume');
    }
    if (P.route === 'c') {
        if (num(I.a260).status === 'empty')
            needed.add('a260');
        if (num(I.dilution).status === 'empty')
            needed.add('dilution');
        if (I.factorChoice === '')
            needed.add('factor');
        if (I.factorChoice === 'own') {
            if (num(I.factorOwn).status === 'empty')
                needed.add('factor');
            if (I.factorClass === '')
                needed.add('factorClass');
            if (factor.source.status === 'incomplete')
                needed.add('factorSource');
        }
        if (valueUnitMissing(I.volume, I.volumeUnit))
            needed.add('volume');
    }
    if (P.route === 'd' && valueUnitMissing(I.amount, I.amountUnit))
        needed.add('amount');
    if (P.genomeActive) {
        if (!P.genome.hasM && !P.genome.hasG)
            needed.add('genomeValue');
        if (!P.genome.hasSource)
            needed.add('genomeSource');
        if (P.genome.choice === '')
            needed.add('haploidOrDiploid');
    }
    if (P.direction === 'fromCopies') {
        if (num(I.copies).status === 'empty')
            needed.add('copies');
        if (I.outputUnit === '')
            needed.add('outputUnit');
    }
    if (needed.size > 0) {
        const ids = FIELD_ORDER.filter((id) => needed.has(id));
        const labels = ids.map(nameOf);
        return {
            status: 'incomplete',
            needed: ids,
            neededLabels: labels,
            text: fill(RF['RF-01'], { '[field labels]': labels.join(RF['RF-01.separator']) }),
            engineCalls: [],
        };
    }
    const unitFields = [];
    if (P.route === 'a')
        unitFields.push(['mass', I.massUnit, 'mass']);
    if (P.route === 'b')
        unitFields.push(['conc', I.concUnit, 'massConc'], ['volume', I.volumeUnit, 'volume']);
    if (P.route === 'c')
        unitFields.push(['volume', I.volumeUnit, 'volume']);
    if (P.route === 'd')
        unitFields.push(['amount', I.amountUnit, 'amount']);
    const unknown = [];
    const wrong = [];
    for (const [id, u, want] of unitFields) {
        const dim = unitDimension(u);
        if (dim === null)
            unknown.push(refusal('NAMC-RF-11', id, fill(RF['RF-11'], { '[Field]': nameOf(id) }), 'E10-RC-01'));
        else if (dim !== want)
            wrong.push(refusal('NAMC-RF-11', id, fill(RF['RF-11'], { '[Field]': nameOf(id) }), 'E10-RC-02'));
    }
    if (P.direction === 'fromCopies') {
        const dim = unitDimension(I.outputUnit);
        if (dim === null)
            unknown.push(refusal('NAMC-RF-11', 'outputUnit', fill(RF['RF-11'], { '[Field]': nameOf('outputUnit') }), 'E10-RC-01'));
        else if (dim !== 'mass' && dim !== 'amount')
            wrong.push(refusal('NAMC-RF-11', 'outputUnit', fill(RF['RF-11'], { '[Field]': nameOf('outputUnit') }), 'E10-RC-02'));
    }
    if (unknown.length + wrong.length > 0) {
        return { status: 'refused', step: 2, refusals: [...unknown, ...wrong], engineCalls: [] };
    }
    const byField = new Map();
    const add = (id, r) => { if (!byField.has(id))
        byField.set(id, []); byField.get(id).push(r); };
    const scans = {};
    const check = (id, text, rule) => {
        const s = num(text);
        scans[id] = s;
        if (s.status === 'invalid') {
            add(id, refusal('NAMC-RF-02', id, fill(RF['RF-02'], { '[Field]': nameOf(id) })));
            return;
        }
        if (s.status === 'ok')
            rule(s);
    };
    const nonNegative = (id) => (s) => {
        if (isNegativeScan(s))
            add(id, refusal('NAMC-RF-05', id, fill(RF['RF-05'], { '[Field]': nameOf(id) })));
    };
    if (P.lengthCompelled) {
        check('length', I.length, (s) => {
            if (s.negative || isZeroScan(s) || !isWholeScan(s)) {
                add('length', refusal('NAMC-RF-03', 'length', fill(RF['RF-03'], { '[Field]': nameOf('length'), '[bp or nt]': lengthUnitOf(I.material) })));
            }
        });
    }
    if (P.ownRelationShown) {
        const typedA = num(I.ownA).status !== 'empty';
        const typedB = num(I.ownB).status !== 'empty';
        if (P.usesMW || typedA) {
            check('ownA', I.ownA, (s) => {
                if (s.negative || isZeroScan(s)) {
                    add('ownA', refusal('NAMC-RF-12', 'ownA', fill(RF['RF-12'], { '[bp or nt]': lengthUnitOf(I.material) })));
                }
            });
        }
        if (P.usesMW || typedB)
            check('ownB', I.ownB, () => { });
        if (own.source.status === 'refused') {
            add('ownSource', refusal('NAMC-RF-16', 'ownSource', fill(RF['RF-16'], { '[Field]': nameOf('ownSource') })));
        }
    }
    if (P.route === 'a')
        check('mass', I.mass, nonNegative('mass'));
    if (P.route === 'b') {
        check('conc', I.conc, nonNegative('conc'));
    }
    if (P.route === 'c') {
        check('a260', I.a260, (s) => {
            if (isNegativeScan(s))
                add('a260', refusal('NAMC-RF-08', 'a260', RF['RF-08']));
        });
        check('dilution', I.dilution, (s) => {
            if (ratCmp(ratFromScan(s), ratFromPlain(DILUTION_MIN)) < 0) {
                add('dilution', refusal('NAMC-RF-07', 'dilution', fill(RF['RF-07'], { '[Field]': nameOf('dilution') })));
            }
        });
        if (I.factorChoice === 'own') {
            check('factor', I.factorOwn, (s) => {
                if (s.negative || isZeroScan(s))
                    add('factor', refusal('NAMC-RF-17', 'factor', RF['RF-17']));
            });
            if (factor.source.status === 'refused') {
                add('factorSource', refusal('NAMC-RF-16', 'factorSource', fill(RF['RF-16'], { '[Field]': nameOf('factorSource') })));
            }
        }
    }
    if (P.route === 'b' || P.route === 'c') {
        check('volume', I.volume, (s) => {
            if (s.negative || isZeroScan(s))
                add('volume', refusal('NAMC-RF-06', 'volume', RF['RF-06']));
        });
    }
    if (P.route === 'd')
        check('amount', I.amount, nonNegative('amount'));
    if (P.direction === 'fromCopies')
        check('copies', I.copies, nonNegative('copies'));
    const gsrc = normaliseSource(I.genomeSource, true);
    if (P.genomeInUse) {
        if (P.genome.both)
            add('genomeBoth', refusal('NAMC-RF-10', 'genomeBoth', RF['RF-10']));
        if (P.genome.hasM) {
            check('genomeMass', I.genomeMass, (s) => {
                if (s.negative || isZeroScan(s))
                    add('genomeMass', refusal('NAMC-RF-13', 'genomeMass', RF['RF-13']));
            });
        }
        if (P.genome.hasG) {
            check('genomeSize', I.genomeSize, (s) => {
                if (s.negative || isZeroScan(s) || !isWholeScan(s)) {
                    add('genomeSize', refusal('NAMC-RF-03', 'genomeSize', fill(RF['RF-03'], { '[Field]': nameOf('genomeSize'), '[bp or nt]': GENOME_UNIT_SIZE })));
                }
            });
        }
        if (gsrc.status === 'refused') {
            add('genomeSource', refusal('NAMC-RF-16', 'genomeSource', fill(RF['RF-16'], { '[Field]': nameOf('genomeSource') })));
        }
    }
    let mw = null;
    let a = null;
    let b = null;
    if (P.usesMW && mat) {
        const lenId = P.formII ? 'genomeSize' : 'length';
        const lengthOk = scans[lenId] && scans[lenId].status === 'ok' && !byField.has(lenId);
        if (I.relationChoice === 'own') {
            const aOk = scans.ownA && scans.ownA.status === 'ok' && !byField.has('ownA');
            const bOk = scans.ownB && scans.ownB.status === 'ok' && !byField.has('ownB');
            if (aOk && bOk) {
                a = ratFromScan(scans.ownA);
                b = ratFromScan(scans.ownB);
            }
        }
        else {
            a = ratFromPlain(mat.a);
            b = ratFromPlain(mat.b);
        }
        if (lengthOk && a && b) {
            mw = ratAdd(ratMul(a, ratFromScan(scans[lenId])), b);
            if (mw.n <= ZERO) {
                add('mw', refusal('NAMC-RF-04', 'mw', fill(RF['RF-04'], { '[MW]': ratToPlain(mw) })));
            }
        }
    }
    const step3 = [];
    for (const id of [...FIELD_ORDER.slice(0, 6), 'mw', ...FIELD_ORDER.slice(6)]) {
        if (byField.has(id))
            step3.push(...byField.get(id));
    }
    if (step3.length > 0)
        return { status: 'refused', step: 3, refusals: step3, engineCalls: [] };
    const step4 = [];
    if (P.usesMW && I.relationChoice === 'own' && I.ownClass !== mat.cls) {
        step4.push(refusal('NAMC-RF-09', 'ownClass', strandText('relation', I.ownClass, I.material, nameOf('ownClass'))));
    }
    if (P.route === 'c' && I.factorChoice === 'own' && I.factorClass !== mat.cls) {
        step4.push(refusal('NAMC-RF-09', 'factorClass', strandText('factor', I.factorClass, I.material, nameOf('factorClass'))));
    }
    const rf14 = P.genomeInUse && !P.genomeOffered;
    if (rf14) {
        if (mat.cls === 'ss') {
            step4.push(refusal('NAMC-RF-14', 'genome', fill(RF['RF-14.a'], { '[material]': mat.short })));
        }
        else {
            step4.push(refusal('NAMC-RF-14', 'genome', RF['RF-14.b']));
        }
    }
    if (P.genomeInUse && !rf14 && num(I.length).status !== 'empty') {
        step4.push(refusal('NAMC-RF-15', 'length', RF['RF-15']));
    }
    if (step4.length > 0)
        return { status: 'refused', step: 4, refusals: step4, engineCalls: [] };
    const built = buildResult(I, P, mat, { scans, mw, a, b, own, factor });
    if (built.status !== 'ok')
        return built;
    const t = windowAndTicks(built);
    return { ...built, window: t.window, ticks: t.ticks, tickCalls: t.calls };
}
function value(r, mode, unit, extraText) {
    const display = displayNumber(r, mode);
    const text = unit === '' ? display : `${display} ${unit}`;
    return { exact: exactOf(r), display, unit, text: extraText ? `${display} ${extraText}` : text };
}
const ENGINE = Object.freeze({
    massToCopies, copiesToMass, molesToCopies, copiesToMoles, amountFromConcentration, scaleUnit,
});
function buildResult(I, P, mat, ctx) {
    const { scans, own, factor } = ctx;
    const calls = [];
    const engineCall = (fn, ...args) => {
        const res = ENGINE[fn](...args);
        calls.push({ fn, args });
        return res;
    };
    const refusedByEngine = (res, fieldId = '') => ({
        status: 'refused', step: 5, engineCalls: calls,
        refusals: [engineRefusal(res, fieldId, I.material)],
    });
    const values = {};
    const flags = {};
    const notices = [];
    const workingLines = [];
    let mwText = null;
    const typed = (id) => scans[id].text;
    if (P.usesMW) {
        mwText = ratToPlain(ctx.mw);
        values.mw = value(ctx.mw, 'full', MW_UNIT);
        values.mw.display = mwText;
        values.mw.text = `${mwText} ${MW_UNIT}`;
        const share = ratMul(ratDiv(ctx.b, ctx.mw), rat(100n));
        values.endGroupShare = value(share, 'sig3', SHARE_UNIT);
    }
    let copies = null;
    let aliquot = '';
    let tickBasis = null;
    if (P.direction === 'toCopies') {
        let massText;
        let massUnit;
        let marker = null;
        if (P.route === 'a') {
            massText = typed('mass');
            massUnit = I.massUnit;
            marker = ratFromScan(scans.mass);
        }
        else if (P.route === 'd') {
            const res = engineCall('molesToCopies', typed('amount'), I.amountUnit, COPIES_UNIT);
            if (res.status !== 'result')
                return refusedByEngine(res, 'amount');
            copies = ratFromExact(res.exact);
            marker = ratFromScan(scans.amount);
        }
        else {
            let cText;
            let cUnit;
            if (P.route === 'b') {
                cText = typed('conc');
                cUnit = I.concUnit;
            }
            else {
                const aNeat = ratMul(ratFromScan(scans.a260), ratFromScan(scans.dilution));
                const fText = I.factorChoice === 'own' ? typed('factor') : mat.presetFactor;
                const conc = ratMul(aNeat, ratFromPlain(fText));
                values.aNeat = value(aNeat, 'sig3', '');
                values.concentration = value(conc, 'sig3', CONC_UNIT);
                cText = ratToPlain(conc);
                cUnit = CONC_UNIT;
            }
            const res = engineCall('amountFromConcentration', cText, cUnit, typed('volume'), I.volumeUnit, ALIQUOT_UNIT);
            if (res.status !== 'result')
                return refusedByEngine(res, P.route === 'b' ? 'conc' : 'a260');
            const m = ratFromExact(res.exact);
            values.aliquotMass = value(m, 'sig3', ALIQUOT_UNIT);
            massText = ratToPlain(m);
            massUnit = ALIQUOT_UNIT;
            marker = m;
            aliquot = fill(FL['FL-11'], { '[V]': typed('volume'), '[unit]': I.volumeUnit });
            flags.fl11 = aliquot;
        }
        let mgc = null;
        if (P.formI) {
            const res = engineCall('scaleUnit', typed('genomeMass'), GENOME_UNIT_MASS, massUnit);
            if (res.status !== 'result')
                return refusedByEngine(res, 'genomeMass');
            mgc = ratFromExact(res.exact);
            copies = ratDiv(marker, mgc);
        }
        else if (P.route !== 'd') {
            const res = engineCall('massToCopies', massText, massUnit, mwText, COPIES_UNIT);
            if (res.status !== 'result')
                return refusedByEngine(res, P.route === 'a' ? 'mass' : 'aliquotMass');
            copies = ratFromExact(res.exact);
        }
        values.result = value(copies, 'sci3', COPIES_UNIT);
        values.result.kind = 'copies';
        values.result.text = aliquot === '' ? `${values.result.display} ${COPIES_UNIT}` : `${values.result.display} ${aliquot}`;
        if (P.formI)
            flags.fl01 = { variant: 'iii', text: FL['FL-01.iii'] };
        else
            flags.fl01 = { variant: P.route === 'd' ? 'ii' : 'i', text: FL[P.route === 'd' ? 'FL-01.ii' : 'FL-01.i'] };
        tickBasis = {
            kind: P.formI ? 'genomeI' : (P.route === 'd' ? 'amount' : 'mass'),
            topUnit: P.route === 'a' ? I.massUnit : (P.route === 'd' ? I.amountUnit : ALIQUOT_UNIT),
            marker: exactOf(marker),
            copies: exactOf(copies),
            mwText,
            mgc: mgc === null ? null : exactOf(mgc),
        };
    }
    else {
        const res = P.usesMW
            ? engineCall('copiesToMass', typed('copies'), mwText, I.outputUnit)
            : engineCall('copiesToMoles', typed('copies'), I.outputUnit);
        if (res.status !== 'result')
            return refusedByEngine(res, 'copies');
        values.result = value(ratFromExact(res.exact), 'sig3', I.outputUnit);
        values.result.kind = P.usesMW ? 'mass' : 'amount';
        flags.fl01 = null;
        tickBasis = {
            kind: P.usesMW ? 'mass' : 'amount',
            topUnit: I.outputUnit,
            marker: values.result.exact,
            copies: exactOf(ratFromScan(scans.copies)),
            mwText,
            mgc: null,
        };
    }
    flags.parts = {};
    if (P.usesMW) {
        if (I.relationChoice === 'own') {
            flags.parts.fl02 = fillParts(FL['FL-02.own'], { '[a]': typed('ownA'), '[bp or nt]': mat.lengthUnit, '[b]': typed('ownB'), '[string]': own.source.value }, '[string]');
            flags.fl02 = joinParts(flags.parts.fl02);
        }
        else {
            flags.fl02 = FL[`FL-02.${I.material}`];
        }
    }
    else if (P.formI) {
        workingLines.push({ id: 'OU-03.formI', text: OU['OU-03.formI'] });
    }
    else {
        workingLines.push({ id: 'OU-03.moles', text: OU['OU-03.moles'] });
        if (scanNumber(I.length).status !== 'empty')
            notices.push({ id: 'NAMC-IN-02', text: IN['IN-02.notice'] });
    }
    if (P.formII)
        workingLines.push({ id: 'OU-03.formII', text: OU['OU-03.formII'] });
    if (P.genomeActive) {
        flags.parts.fl03 = fillParts(FL['FL-03'], {
            '[haploid or diploid]': IN[`IN-11.${P.genome.choice}`],
            '[string]': P.genome.source.value,
        }, '[string]');
        flags.fl03 = joinParts(flags.parts.fl03);
    }
    if (P.route === 'c') {
        const own = I.factorChoice === 'own';
        flags.parts.fl04 = fillParts(FL['FL-04'], {
            '[f]': own ? typed('factor') : mat.presetFactor,
            '[source]': own ? factor.source.value : FL['FL-04.presetSource'],
        }, own ? '[source]' : '');
        flags.fl04 = joinParts(flags.parts.fl04);
    }
    flags.fl07 = {
        relation: P.usesMW && I.relationChoice === 'own' ? FL['FL-07.relation'] : null,
        factor: P.route === 'c' && I.factorChoice === 'own' ? FL['FL-07.factor'] : null,
    };
    flags.fl06 = {
        shown: P.direction === 'toCopies' && P.route !== 'd' && P.usesMW && I.material === 'dsDNA' && I.relationChoice === 'default',
        text: FL['FL-06'],
    };
    return {
        status: 'ok',
        direction: P.direction,
        route: P.route,
        material: I.material,
        zero: values.result.exact.num === '0',
        values,
        flags,
        notices,
        workingLines,
        inputsUsed: inputsUsedOf(I, P, mat, scans, own, factor),
        tickBasis,
        engineCalls: calls,
        engine: { versionLine: ENGINE_VERSION_LINE, commit: ENGINE_COMMIT },
    };
}
function inputsUsedOf(I, P, mat, scans, own, factor) {
    const list = [];
    const push = (id, label, val, extra = {}) => list.push({ id, label, value: val, used: true, ...extra });
    push('material', LABEL.material, mat.short, { role: 'entered' });
    const lengthEntry = trimNumeric(typeof I.length === 'string' ? I.length : '');
    if (lengthEntry !== '') {
        push('length', LABEL.length, lengthEntry, { unit: mat.lengthUnit, role: 'entered', used: P.usesMW });
    }
    if (P.usesMW) {
        if (I.relationChoice === 'own') {
            push('ownA', labelOf('ownA', I.material), scans.ownA.text, { unit: `g/mol per ${mat.lengthUnit}`, role: 'declared' });
            push('ownB', LABEL.ownB, scans.ownB.text, { unit: MW_UNIT, role: 'declared' });
            push('ownClass', LABEL.ownClass, I.ownClass, { role: 'declared' });
            push('ownSource', LABEL.ownSource, own.source.value, { role: 'declared' });
        }
        else {
            push('relation', LABEL.relation, `${RELATION_SOURCE_NAME[I.material]} (default)`, { a: mat.a, b: mat.b, role: 'constant' });
        }
    }
    if (P.genomeActive) {
        if (P.formI)
            push('genomeMass', LABEL.genomeMass, scans.genomeMass.text, { unit: GENOME_UNIT_MASS, role: 'declared' });
        else
            push('genomeSize', LABEL.genomeSize, scans.genomeSize.text, { unit: GENOME_UNIT_SIZE, role: 'declared' });
        push('genomeSource', LABEL.genomeSource, P.genome.source.value, { role: 'declared' });
        push('haploidOrDiploid', LABEL.haploidOrDiploid, P.genome.choice, { role: 'declared' });
    }
    if (P.route === 'a')
        push('mass', LABEL.mass, scans.mass.text, { unit: I.massUnit, role: 'entered' });
    if (P.route === 'b')
        push('conc', LABEL.conc, scans.conc.text, { unit: I.concUnit, role: 'entered' });
    if (P.route === 'c') {
        push('a260', LABEL.a260, scans.a260.text, { role: 'entered' });
        push('dilution', LABEL.dilution, scans.dilution.text, { role: 'entered' });
        if (I.factorChoice === 'own') {
            push('factor', LABEL.factor, scans.factor.text, { unit: 'ug/mL per A260', role: 'declared' });
            push('factorClass', LABEL.factorClass, I.factorClass, { role: 'declared' });
            push('factorSource', LABEL.factorSource, factor.source.value, { role: 'declared' });
        }
        else {
            push('factor', LABEL.factor, mat.presetFactor, { unit: 'ug/mL per A260', role: 'constant' });
        }
    }
    if (P.route === 'b' || P.route === 'c')
        push('volume', LABEL.volume, scans.volume.text, { unit: I.volumeUnit, role: 'entered' });
    if (P.route === 'd')
        push('amount', LABEL.amount, scans.amount.text, { unit: I.amountUnit, role: 'entered' });
    if (P.direction === 'fromCopies') {
        push('copies', LABEL.copies, scans.copies.text, { unit: COPIES_UNIT, role: 'entered' });
        push('outputUnit', LABEL.outputUnit, I.outputUnit, { role: 'entered' });
    }
    return list;
}
