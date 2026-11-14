import { MATERIALS, MW_UNIT, SHARE_UNIT } from './constants.js';
import { OU, W } from './texts.js';
const TIMES = '×';
const DIVIDED = '÷';
function call(c) {
    return `Engine call: ${c.fn}(${c.args.map((a) => JSON.stringify(a)).join(', ')})`;
}
export function workingLines(result) {
    const lines = [];
    const say = (text) => lines.push({ text, raw: false });
    const raw = (text) => lines.push({ text, raw: true });
    if (result.status !== 'ok')
        return lines;
    const used = (id) => result.inputsUsed.find((x) => x.id === id);
    const v = result.values;
    const mat = MATERIALS[result.material];
    const calls = result.engineCalls;
    const callOf = (fn) => calls.find((c) => c.fn === fn);
    const withUnit = (e) => (e.unit ? `${e.value} ${e.unit}` : e.value);
    if (v.mw) {
        const rel = used('relation');
        const own = used('ownA');
        let a;
        let b;
        if (own) {
            a = used('ownA').value;
            b = used('ownB').value;
            say(`Declared relation: a = ${a} g/mol per ${mat.lengthUnit}, b = ${b} g/mol. The default for ${result.material} is a = ${mat.a}, b = ${mat.b}.`);
        }
        else {
            a = rel.a;
            b = rel.b;
            say(`Relation for ${result.material}: a = ${a} g/mol per ${mat.lengthUnit}, b = ${b} g/mol.`);
        }
        const gsize = used('genomeSize');
        const len = gsize || used('length');
        say(`Molecular weight = a ${TIMES} length + b = ${a} ${TIMES} ${len.value} + ${b} = ${v.mw.text}`);
        say(`End-group term: b = ${b} ${MW_UNIT}, added once per molecule. Its share of the molecular weight is ${v.endGroupShare.display} ${SHARE_UNIT}.`);
        say(W['W-3']);
    }
    if (result.direction === 'toCopies') {
        if (result.route === 'a')
            say(`Mass entered: ${withUnit(used('mass'))}.`);
        if (result.route === 'b') {
            say(`Mass in the aliquot = concentration ${TIMES} volume = ${withUnit(used('conc'))} ${TIMES} ${withUnit(used('volume'))} = ${v.aliquotMass.text}.`);
            raw(call(callOf('amountFromConcentration')));
        }
        if (result.route === 'c') {
            say(`A260 after dilution = A260 ${TIMES} dilution = ${used('a260').value} ${TIMES} ${used('dilution').value} = ${v.aNeat.display}.`);
            say(`A260 concentration = ${v.aNeat.display} ${TIMES} ${used('factor').value} ug/mL per A260 = ${v.concentration.text}.`);
            say(`Mass in the aliquot = concentration ${TIMES} volume = ${v.concentration.text} ${TIMES} ${withUnit(used('volume'))} = ${v.aliquotMass.text}.`);
            raw(call(callOf('amountFromConcentration')));
        }
        if (result.route === 'd') {
            say(OU['OU-03.moles']);
            raw(call(callOf('molesToCopies')));
        }
        else if (callOf('scaleUnit')) {
            say(OU['OU-03.formI']);
            raw(call(callOf('scaleUnit')));
            say(`Copies of one genome = mass ${DIVIDED} mass per genome copy. The exact quotient is ${v.result.exact.num} over ${v.result.exact.den}.`);
        }
        else {
            say(`Copies = mass ${DIVIDED} molecular weight ${TIMES} the Avogadro constant.`);
            raw(call(callOf('massToCopies')));
        }
        if (result.workingLines.some((l) => l.id === 'OU-03.formII'))
            say(OU['OU-03.formII']);
        say(`Result: ${v.result.text}.`);
    }
    else {
        if (v.mw) {
            say(`${v.result.kind === 'mass' ? 'Mass' : 'Amount'} = copies ${DIVIDED} the Avogadro constant ${TIMES} molecular weight.`);
            raw(call(callOf('copiesToMass')));
        }
        else {
            say(OU['OU-03.moles']);
            raw(call(callOf('copiesToMoles')));
        }
        say(`Result: ${v.result.text}.`);
    }
    if (result.flags.fl06 && result.flags.fl06.shown)
        say(result.flags.fl06.text);
    say(W['W-8']);
    return lines;
}
