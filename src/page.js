import { h } from './nodes.js';
import { micro, microParts } from './micro.js';
import { compute, genomeState } from './calc.js';
import { trimNumeric } from './scan.js';
import { workingLines } from './working.js';
import { taggedLabels } from './state.js';
import { MATERIALS, MATERIAL_KEYS, UNIT_TABLE, } from './constants.js';
import { FL, RF, IN, W, OU, LABEL, UI, UI_EXPORT, ABOUT, FAQ, fill, } from './texts.js';
import { SOURCES, RELATION_SOURCE_NAME } from './sources.js';
import { ENGINE_VERSION_LINE, ENGINE_COMMIT } from './engine-api.js';
const labelOfTag = (tag) => LABEL[tag];
function isMolesOnly(I) {
    if (I.direction === 'toCopies' && I.route === 'd')
        return true;
    return I.direction === 'fromCopies' && UNIT_TABLE.amount.includes(I.outputUnit);
}
function outKindOf(state) {
    const u = state.inputs.outputUnit;
    if (UNIT_TABLE.mass.includes(u))
        return 'mass';
    if (UNIT_TABLE.amount.includes(u))
        return 'amount';
    return state.outKind;
}
export function buildPage(state, ui = { open: {} }) {
    const I = state.inputs;
    const result = compute(I);
    const refused = result.status === 'refused' ? result.refusals : [];
    const byField = {};
    for (const r of refused) {
        if (!byField[r.field])
            byField[r.field] = [];
        byField[r.field].push(r);
    }
    const mat = MATERIALS[I.material] || null;
    const genome = genomeState(I);
    const lenUnit = mat ? mat.lengthUnit : 'bp or nt';
    const tagged = (t) => state.tags.includes(t);
    const open = (id) => ui.open[id] === true;
    const tagNode = (t) => (tagged(t) ? h('span', { class: 'example-tag' }, UI['UI.example.tag']) : null);
    const labelNode = (id, text, t) => h('label', { for: id }, text, t ? tagNode(t) : null);
    const errOf = (field) => {
        const list = (byField[field] || []).filter((r) => !(field === 'length' && r.code === 'NAMC-RF-15'));
        return list.length > 0 ? list[0].text : null;
    };
    const errNode = (id, text) => (text ? h('p', { class: 'refusal', id: `${id}-err` }, micro(text)) : null);
    const describe = (id, hint, err) => {
        const ids = [];
        if (hint)
            ids.push(`${id}-hint`);
        if (err)
            ids.push(`${id}-err`);
        return ids.length > 0 ? ids.join(' ') : null;
    };
    const hintNode = (id, text) => (text ? h('p', { class: 'hint', id: `${id}-hint` }, micro(text)) : null);
    const why = (id, fieldLabel, text) => h('details', { class: 'why', 'data-open-id': `why-${id}`, open: open(`why-${id}`) }, h('summary', { 'aria-label': fill(UI['UI.why.name'], { '[field label]': fieldLabel }) }, UI['UI.why.summary']), h('p', {}, micro(text)));
    function numberField(field, label, unitText, o = {}) {
        const id = `f-${field}`;
        const err = o.err === undefined ? errOf(o.errField || field) : o.err;
        return h('div', { class: 'field' }, labelNode(id, unitText ? `${label} (${micro(unitText)})` : label, o.tag), hintNode(id, o.hint), h('input', {
            type: 'text', id, 'data-field': field, value: I[field], inputmode: 'decimal', enterkeyhint: 'next', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-invalid': err ? 'true' : null, 'aria-describedby': describe(id, o.hint, err),
        }), errNode(id, err), o.after || null);
    }
    function valueUnit(field, unitField, label, units, o = {}) {
        const id = `f-${field}`;
        const uid = `f-${unitField}`;
        const err = errOf(field);
        return h('div', { class: 'field' }, labelNode(id, label, o.tag), hintNode(id, o.hint), h('div', { class: 'row' }, h('input', {
            type: 'text', id, 'data-field': field, value: I[field], inputmode: 'decimal', enterkeyhint: 'next', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-invalid': err ? 'true' : null, 'aria-describedby': describe(id, o.hint, err),
        }), select(uid, unitField, `${label} unit`, units, I[unitField])), errNode(id, err), o.after || null);
    }
    function select(id, field, name, units, current) {
        return h('select', { id, 'data-field': field, 'aria-label': name }, h('option', { value: '', selected: current === '' }, UI['UI.unit.choose']), units.map((u) => h('option', { value: u, selected: current === u }, micro(u))));
    }
    function radios(field, legend, options, current, o = {}) {
        const err = o.err || null;
        return h('fieldset', { class: 'field picker', id: `f-${field}`, 'aria-describedby': err ? `f-${field}-err` : null }, h('legend', {}, legend, o.tag ? tagNode(o.tag) : null), options.map((opt) => h('label', { class: 'radio-row', for: `f-${field}-${opt.value}` }, h('input', {
            type: 'radio', id: `f-${field}-${opt.value}`, name: field, 'data-field': field, value: opt.value, checked: current === opt.value,
        }), h('span', {}, opt.text))), o.after || null, errNode(`f-${field}`, err));
    }
    function textarea(field, label, hintText, o = {}) {
        const id = `f-${field}`;
        const err = o.err === undefined ? errOf(field) : o.err;
        return h('div', { class: 'field' }, labelNode(id, label, o.tag), hintNode(id, hintText), h('textarea', {
            id, 'data-field': field, rows: 2, value: I[field], autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-invalid': err ? 'true' : null, 'aria-describedby': describe(id, hintText, err),
        }), errNode(id, err));
    }
    function panel(id, step, title, body, o = {}) {
        return h('section', { class: `panel${o.sticky ? ' sticky' : ''}`, id }, h('div', { class: 'panel-head' }, h('div', { class: 'titles' }, step ? h('span', { class: 'step', 'aria-hidden': 'true' }, String(step)) : null, h('h2', {}, title)), o.headNote ? h('span', { class: 'optional' }, o.headNote) : null), h('div', { class: 'panel-body stack' }, body));
    }
    const molesOnly = isMolesOnly(I);
    const lengthNote = molesOnly && trimNumeric(I.length) !== '' ? IN['IN-02.notice'] : null;
    const lengthErr = errOf('length') || errOf('mw');
    const s1 = panel('s1', 1, UI['UI.s1.title'], [
        radios('material', LABEL.material, MATERIAL_KEYS.map((k) => ({ value: k, text: UI[`UI.material.${k}`] })), I.material, { tag: 'material', err: errOf('material') }),
        why('material', LABEL.material, W['W-1']),
        h('div', { class: 'field' }, [
            labelNode('f-length', `${LABEL.length} (${lenUnit})`, 'length'),
            h('input', {
                type: 'text', id: 'f-length', 'data-field': 'length', value: I.length, inputmode: 'decimal', enterkeyhint: 'next', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-invalid': lengthErr || (byField.length || []).length > 0 ? 'true' : null, 'aria-describedby': lengthErr ? 'f-length-err' : null,
            }),
            errNode('f-length', lengthErr),
            lengthNote ? h('p', { class: 'hint' }, lengthNote) : null,
        ]),
        why('length', LABEL.length, W['W-2']),
        state.notices.map((n) => h('p', { class: 'notice' }, micro(n.text))),
    ]);
    const echo = mat
        ? fill(UI['UI.relation.echo'], { '[a]': mat.a, '[bp or nt]': mat.lengthUnit, '[b]': mat.b })
        : null;
    const own = I.relationChoice === 'own';
    const s2 = panel('s2', 2, UI['UI.s2.title'], [
        radios('relationChoice', UI['UI.relation.group'], [
            { value: 'default', text: UI['UI.relation.default'] },
            { value: 'own', text: UI['UI.relation.own'] },
        ], I.relationChoice),
        !own && echo ? h('p', { class: 'echo mono' }, `${echo} (${RELATION_SOURCE_NAME[I.material]})`) : null,
        own ? [
            numberField('ownA', fill(LABEL.ownA, { '[bp or nt]': lenUnit }), `g/mol per ${lenUnit}`),
            numberField('ownB', LABEL.ownB, 'g/mol'),
            radios('ownClass', LABEL.ownClass, [
                { value: 'ds', text: UI['UI.ownClass.ds'] },
                { value: 'ss', text: UI['UI.ownClass.ss'] },
            ], I.ownClass, { err: errOf('ownClass') }),
            textarea('ownSource', LABEL.ownSource, IN['IN-12.hint']),
        ] : null,
    ]);
    const kind = outKindOf(state);
    const routeFields = [];
    if (I.direction === 'toCopies') {
        routeFields.push(radios('route', LABEL.startingQuantity, ['a', 'b', 'c', 'd'].map((k) => ({ value: k, text: UI[`UI.route.${k}`] })), I.route, { tag: 'startingQuantity' }));
        if (I.route === 'a')
            routeFields.push(valueUnit('mass', 'massUnit', LABEL.mass, UNIT_TABLE.mass));
        if (I.route === 'b') {
            routeFields.push(valueUnit('conc', 'concUnit', LABEL.conc, UNIT_TABLE.massConc));
            routeFields.push(valueUnit('volume', 'volumeUnit', LABEL.volume, UNIT_TABLE.volume, { tag: 'volume' }));
            routeFields.push(why('volume', LABEL.volume, W['W-5']));
        }
        if (I.route === 'c') {
            routeFields.push(numberField('a260', LABEL.a260, '', { tag: 'a260', hint: IN['IN-07.hint'] }));
            routeFields.push(numberField('dilution', LABEL.dilution, '', { tag: 'dilution', hint: UI['UI.dilution.hint'] }));
            const factorOptions = [];
            if (mat)
                factorOptions.push({ value: 'preset', text: micro(IN[`IN-08.${I.material}`]) });
            factorOptions.push({ value: 'own', text: micro(IN['IN-08.own']) });
            routeFields.push(radios('factorChoice', LABEL.factor, factorOptions, I.factorChoice, {
                tag: 'factor',
                after: I.material === 'ssDNA' ? h('p', { class: 'flag' }, FL['FL-05']) : null,
            }));
            if (I.factorChoice === 'own') {
                routeFields.push(numberField('factorOwn', LABEL.factor, 'ug/mL per A260', { errField: 'factor' }));
                routeFields.push(radios('factorClass', LABEL.factorClass, [
                    { value: 'ds', text: UI['UI.ownClass.ds'] },
                    { value: 'ss', text: UI['UI.ownClass.ss'] },
                ], I.factorClass, { err: errOf('factorClass') }));
                routeFields.push(textarea('factorSource', LABEL.factorSource, IN['IN-12.hint']));
            }
            routeFields.push(why('factor', LABEL.factor, W['W-4']));
            routeFields.push(valueUnit('volume', 'volumeUnit', LABEL.volume, UNIT_TABLE.volume, { tag: 'volume' }));
            routeFields.push(why('volume', LABEL.volume, W['W-5']));
        }
        if (I.route === 'd')
            routeFields.push(valueUnit('amount', 'amountUnit', LABEL.amount, UNIT_TABLE.amount));
    }
    if (I.direction === 'fromCopies') {
        routeFields.push(numberField('copies', LABEL.copies, 'copies'));
        routeFields.push(radios('outKind', UI['UI.out.group'], [
            { value: 'mass', text: UI['UI.out.mass'] },
            { value: 'amount', text: UI['UI.out.amount'] },
        ], kind));
        if (kind === 'mass' || kind === 'amount') {
            const units = kind === 'mass' ? UNIT_TABLE.mass : UNIT_TABLE.amount;
            routeFields.push(h('div', { class: 'field' }, labelNode('f-outputUnit', LABEL.outputUnit), select('f-outputUnit', 'outputUnit', LABEL.outputUnit, units, I.outputUnit), errNode('f-outputUnit', errOf('outputUnit'))));
        }
    }
    const s3 = panel('s3', 3, UI['UI.s3.title'], [
        radios('direction', LABEL.direction, [
            { value: 'toCopies', text: UI['UI.direction.toCopies'] },
            { value: 'fromCopies', text: UI['UI.direction.fromCopies'] },
        ], I.direction, { tag: 'direction' }),
        routeFields,
    ]);
    const offered = I.material === 'dsDNA' && I.direction === 'toCopies' && ['a', 'b', 'c'].includes(I.route);
    let genomeBlock = null;
    if (offered || genome.inUse) {
        const order = [
            ['genomeBoth', null], ['genomeMass', null], ['genomeSize', null], ['genomeSource', null], ['genome', null], ['length', 'NAMC-RF-15'],
        ];
        let gmsg = null;
        for (const [f, code] of order) {
            const hit = (byField[f] || []).find((r) => code === null || r.code === code);
            if (hit) {
                gmsg = hit.text;
                break;
            }
        }
        if (!gmsg && genome.both)
            gmsg = RF['RF-10'];
        const gerr = (f) => (gmsg && (byField[f] || []).some((r) => r.text === gmsg) ? gmsg : null);
        let declaration = null;
        if (genome.showRadios) {
            const form = genome.declForm || genome.form;
            declaration = radios('genomeChoice', LABEL.haploidOrDiploid, ['haploid', 'diploid'].map((c) => ({
                value: c, text: IN[`IN-11.declaration.${form}.${c}`],
            })), genome.choice);
        }
        genomeBlock = panel('genome', 0, UI['UI.genome.heading'], [
            !genome.hasM && !genome.hasG ? h('p', { class: 'hint' }, IN['IN-11.hint']) : null,
            numberField('genomeMass', LABEL.genomeMass, UI['UI.genome.massUnit'], { err: gerr('genomeMass') }),
            numberField('genomeSize', LABEL.genomeSize, 'bp', { err: gerr('genomeSize') }),
            textarea('genomeSource', LABEL.genomeSource, IN['IN-12.hint'], { err: gerr('genomeSource') }),
            declaration,
            genome.showRadios ? why('genome', LABEL.haploidOrDiploid, W['W-6']) : null,
            gmsg && !['genomeMass', 'genomeSize', 'genomeSource'].some((f) => gerr(f)) ? h('p', { class: 'refusal', id: 'f-genome-err' }, micro(gmsg)) : null,
            genome.inUse ? h('button', { type: 'button', class: 'secondary', 'data-act': 'remove' }, IN['IN-11.remove']) : null,
        ], { headNote: UI['UI.optional'] });
    }
    const r4 = [];
    if (result.status === 'incomplete') {
        r4.push(h('p', { class: 'state' }, micro(result.text)));
    }
    else if (result.status === 'refused') {
        const genomeCodes = refused.some((r) => r.code === 'NAMC-RF-14' || r.code === 'NAMC-RF-15');
        if (genomeCodes)
            r4.push(h('p', { class: 'state' }, IN['IN-11.pointer']));
        else {
            r4.push(h('p', { class: 'state' }, UI['UI.refused.head']));
            for (const r of refused)
                r4.push(h('p', { class: 'state' }, micro(r.text)));
        }
    }
    else {
        const f = result.flags;
        r4.push(h('p', { class: 'headline mono' }, micro(result.values.result.text)));
        if (f.fl01)
            r4.push(h('p', { class: 'flag' }, f.fl01.text));
        for (const n of result.notices)
            r4.push(h('p', { class: 'notice' }, n.text));
    }
    const statusNode = h('div', { class: 'status', role: 'status', 'aria-live': 'polite' }, state.status);
    const r4panel = panel('r4', 4, UI['UI.r4.title'], [h('div', { class: 'live', 'aria-live': 'polite' }, r4), statusNode], {
        sticky: true, headNote: state.tags.length > 0 ? UI['UI.status.example'] : null,
    });
    const r5 = [];
    if (result.status === 'ok') {
        const v = result.values;
        const f = result.flags;
        const row = (key, label, text, flags) => h('div', { class: 'result-row', 'data-row': key }, h('p', { class: 'row-label' }, label), h('p', { class: 'row-value mono' }, text), flags.filter(Boolean).map((t) => h('p', { class: 'flag' }, t)));
        if (v.aNeat)
            r5.push(row('aNeat', UI['UI.row.aNeat'], v.aNeat.display, []));
        if (v.concentration)
            r5.push(row('conc', UI['UI.row.conc'], micro(v.concentration.text), [microParts(f.parts.fl04)]));
        if (v.aliquotMass)
            r5.push(row('aliquot', UI['UI.row.aliquot'], v.aliquotMass.text, []));
        if (v.mw) {
            const rel = [f.parts.fl02 ? microParts(f.parts.fl02) : micro(f.fl02)];
            if (f.fl07.relation)
                rel.push(f.fl07.relation);
            r5.push(row('mw', UI['UI.row.mw'], v.mw.text, rel));
        }
        const res = v.result;
        let label = UI['UI.row.copies'];
        if (res.kind === 'mass')
            label = UI['UI.row.mass'];
        if (res.kind === 'amount')
            label = UI['UI.row.amount'];
        if (f.fl03)
            label = fill(UI['UI.row.genome'], { '[haploid or diploid]': result.inputsUsed.find((x) => x.id === 'haploidOrDiploid').value });
        r5.push(row('result', label, micro(res.text), [f.fl01 ? f.fl01.text : null, f.fl03 ? microParts(f.parts.fl03) : null, f.fl07.factor]));
        const lines = workingLines(result);
        r5.push(h('details', { class: 'working', 'data-open-id': 'working', open: open('working') }, h('summary', {}, UI['UI.working.summary']), lines.map((l) => h('p', { class: l.raw ? 'mono' : '' }, micro(l.text)))));
    }
    else {
        r5.push(h('p', { class: 'hint' }, result.status === 'incomplete' ? result.text : UI['UI.refused.head']));
    }
    const r5panel = panel('r5', 5, UI['UI.r5.title'], r5);
    const exportBody = result.status === 'ok'
        ? h('div', { class: 'export-row' }, ['csv', 'json', 'record', 'copy'].map((k) => h('button', {
            type: 'button', class: 'secondary', 'data-act': `export-${k}`, id: `btn-export-${k}`,
        }, UI_EXPORT[`UI.export.${k}`])))
        : h('p', { class: 'hint' }, UI['UI.export.none']);
    const r8 = panel('r8', 0, UI_EXPORT['UI.r8.title'], [exportBody]);
    const src = [];
    src.push(h('h3', {}, UI['UI.sources.relations']));
    for (const k of MATERIAL_KEYS) {
        const m = MATERIALS[k];
        src.push(h('div', { class: 'source' }, h('p', {}, `${k}: ${UI['UI.sources.relation.words']}`), h('p', { class: 'mono' }, fill(UI['UI.sources.relation.formula'], { '[a]': m.a, '[unit]': m.lengthUnit, '[b]': m.b })), h('p', { class: 'cite' }, fill(UI['UI.sources.relation.source'], { '[source]': SOURCES.relationSource[k] }))));
    }
    src.push(h('h3', {}, UI['UI.sources.factor']));
    for (const k of MATERIAL_KEYS) {
        src.push(h('p', {}, micro(IN[`IN-08.${k}`])));
    }
    src.push(h('p', { class: 'cite' }, SOURCES.factorSource));
    src.push(h('h3', {}, UI['UI.sources.quotes']));
    for (const fnote of SOURCES.footnotes) {
        src.push(h('p', { class: 'cite' }, fnote.id === 'ssDNA' ? SOURCES.thermoAttribution : SOURCES.thermoSameAttribution));
        src.push(h('p', {}, fnote.leadIn));
        src.push(h('blockquote', {}, fnote.quote));
    }
    src.push(h('p', { class: 'cite' }, SOURCES.a320.attribution));
    src.push(h('blockquote', {}, SOURCES.a320.quote));
    src.push(h('p', {}, SOURCES.a320.context));
    src.push(h('p', { class: 'cite' }, SOURCES.converter));
    src.push(h('p', {}, micro(UI['UI.sources.avogadro'])));
    src.push(h('p', { class: 'mono wrap' }, fill(UI['UI.sources.engine'], { '[line]': ENGINE_VERSION_LINE, '[commit]': ENGINE_COMMIT })));
    src.push(h('p', { class: 'notice-vendor' }, SOURCES.notice));
    const r6 = panel('r6', 0, UI['UI.r6.title'], src);
    const notdo = [
        UI['UI.notdo.1'], FL['FL-08'], UI['UI.notdo.2'], UI['UI.notdo.3'], UI['UI.notdo.4'], UI['UI.notdo.5'],
        OU['OU-06.path'], OU['OU-06.range'], OU['OU-06.dsRNA'], OU['OU-06.genome'], OU['OU-06.extinction'],
    ];
    const r7 = panel('r7', 0, UI['UI.r7.title'], [h('ul', {}, notdo.map((t) => h('li', {}, t)))]);
    const exampleRow = h('section', { class: 'example-row', 'aria-label': UI['UI.example.heading'] }, h('button', { type: 'button', class: 'secondary', 'data-act': 'load', id: 'btn-load' }, UI['UI.example.load']), h('button', { type: 'button', class: 'secondary', 'data-act': 'clear', id: 'btn-clear' }, UI['UI.clear']));
    const banner = state.tags.length > 0
        ? h('p', { class: 'banner' }, UI['UI.banner.lead'] + taggedLabels(state, labelOfTag).join(RF['RF-01.separator']))
        : null;
    const questions = h('div', { class: 'faq', id: 'questions' }, h('h4', {}, UI['UI.faq.title']), h('dl', { class: 'faq-list' }, FAQ.map((f) => [h('dt', {}, f.q), h('dd', {}, f.a)]).flat()));
    const about = h('section', { class: 'about', id: 'about' }, h('h2', {}, UI['UI.about.title']), ABOUT.map((s) => h('div', { class: 'about-section' }, h('h3', {}, s.title), s.body.map(aboutBlock), s.title === 'How to use it' ? questions : null)));
    const intro = h('section', { class: 'intro' }, h('h1', {}, UI['UI.title']), h('p', {}, UI['UI.plain.1']), h('p', {}, UI['UI.plain.2']));
    const root = h('div', { class: 'tool' }, intro, exampleRow, h('div', { class: 'layout' }, h('div', { class: 'stack' }, s1, s2, s3, genomeBlock), h('div', { class: 'rail' }, banner, r4panel, r5panel, r8, r6, r7)), about);
    return { root, result, panels: { r4: r4panel, r5: r5panel, r8, r6, r7, about, questions } };
}
function aboutBlock(b) {
    if (typeof b === 'string')
        return h('p', {}, b);
    if (b.kind === 'formula')
        return h('p', { class: 'mono' }, b.text);
    if (b.kind === 'ol' || b.kind === 'ul')
        return h(b.kind, {}, b.items.map((t) => h('li', {}, t)));
    return h('table', { class: 'constants' }, h('caption', {}, b.caption), h('thead', {}, h('tr', {}, b.head.map((t) => h('th', { scope: 'col' }, t)))), h('tbody', {}, b.rows.map((r) => h('tr', {}, r.map((t) => h('td', {}, t))))));
}
