import { EMPTY_INPUTS, changeMaterial, setGenomeField, chooseGenome, removeGenomeEntries, } from './calc.js';
import { UI } from './texts.js';
const EXAMPLE_TEXT = Object.freeze({
    length: '5000', a260: '0.100', dilution: '10', volume: '2', volumeUnit: 'uL',
});
export const EXAMPLE_TAG_ORDER = Object.freeze([
    'material', 'length', 'direction', 'startingQuantity', 'a260', 'dilution', 'factor', 'volume',
]);
const TAG_OF = Object.freeze({
    material: 'material',
    length: 'length',
    direction: 'direction',
    route: 'startingQuantity',
    a260: 'a260',
    dilution: 'dilution',
    factorChoice: 'factor',
    factorOwn: 'factor',
    factorClass: 'factor',
    factorSource: 'factor',
    volume: 'volume',
    volumeUnit: 'volume',
});
export function initialState() {
    return { inputs: { ...EMPTY_INPUTS }, tags: [], status: '', notices: [], outKind: '' };
}
function withoutTag(tags, tag) {
    return tags.filter((t) => t !== tag);
}
export function loadExample() {
    const first = changeMaterial({ ...EMPTY_INPUTS }, 'dsDNA');
    const inputs = {
        ...first.inputs,
        ...EXAMPLE_TEXT,
        direction: 'toCopies',
        route: 'c',
    };
    return {
        inputs, tags: [...EXAMPLE_TAG_ORDER], status: UI['UI.status.loaded'], notices: [], outKind: '',
    };
}
export function clearAll() {
    return { ...initialState(), status: UI['UI.status.cleared'] };
}
const GENOME_TEXT = new Set(['genomeMass', 'genomeSize', 'genomeSource']);
export function setField(state, field, value) {
    const before = state.inputs;
    let inputs;
    let notices = state.notices;
    let outKind = state.outKind;
    if (field === 'material') {
        const r = changeMaterial(before, value);
        inputs = r.inputs;
        notices = r.notices;
    }
    else if (GENOME_TEXT.has(field)) {
        inputs = setGenomeField(before, field, value).inputs;
    }
    else if (field === 'genomeChoice') {
        inputs = chooseGenome(before, value);
    }
    else if (field === 'outKind') {
        outKind = value;
        inputs = { ...before, outputUnit: '' };
    }
    else {
        inputs = { ...before, [field]: value };
    }
    if (field === 'factorChoice' || field === 'factorOwn') {
        notices = notices.filter((n) => n.id !== 'NAMC-FL-10');
    }
    if (field === 'length')
        notices = notices.filter((n) => n.id !== 'NAMC-FL-09');
    let tags = state.tags;
    if (TAG_OF[field])
        tags = withoutTag(tags, TAG_OF[field]);
    if (inputs.factorChoice !== before.factorChoice)
        tags = withoutTag(tags, 'factor');
    if (field === 'material' && inputs.material !== before.material && before.factorChoice === 'preset') {
        tags = withoutTag(tags, 'factor');
    }
    return { inputs, tags, status: '', notices, outKind };
}
export function removeGenome(state) {
    const r = removeGenomeEntries(state.inputs);
    return { ...state, inputs: r.inputs, status: r.notice.text };
}
export function taggedLabels(state, labelOf) {
    return EXAMPLE_TAG_ORDER.filter((t) => state.tags.includes(t)).map(labelOf);
}
