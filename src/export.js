import { micro, microParts } from './micro.js';
import { CONFIG } from './config.js';
import { MATERIALS, UNIT_TABLE, MW_UNIT, SHARE_UNIT, COPIES_UNIT, } from './constants.js';
import { SOURCES } from './sources.js';
import { UI, RF, FL, EX, LABEL, fill, } from './texts.js';
const GUARD = '=+-@\t\r';
export const UNIT_TOKENS = Object.freeze(new Set([
    ...UNIT_TABLE.mass, ...UNIT_TABLE.massConc, ...UNIT_TABLE.volume, ...UNIT_TABLE.amount, ...UNIT_TABLE.molarConc,
    COPIES_UNIT, MW_UNIT, SHARE_UNIT, 'bp', 'nt',
].map((u) => micro(u))));
const isDigit = (c) => c >= '0' && c <= '9';
export function isN1(s) {
    let i = s[0] === '-' ? 1 : 0;
    let digits = 0;
    let dots = 0;
    for (; i < s.length; i += 1) {
        const c = s[i];
        if (isDigit(c))
            digits += 1;
        else if (c === '.')
            dots += 1;
        else
            return false;
    }
    return digits >= 1 && dots <= 1;
}
export function isN2(s) {
    let i = s[0] === '-' ? 1 : 0;
    let d = 0;
    while (i < s.length && isDigit(s[i])) {
        i += 1;
        d += 1;
    }
    if (d === 0)
        return false;
    if (i === s.length)
        return true;
    if (s[i] !== '/')
        return false;
    i += 1;
    let e = 0;
    while (i < s.length && isDigit(s[i])) {
        i += 1;
        e += 1;
    }
    return e > 0 && i === s.length;
}
function isSci(s) {
    let i = s[0] === '-' ? 1 : 0;
    if (!(isDigit(s[i]) && s[i + 1] === '.' && isDigit(s[i + 2]) && isDigit(s[i + 3])))
        return false;
    i += 4;
    const mid = ' × 10^';
    if (s.slice(i, i + mid.length) !== mid)
        return false;
    i += mid.length;
    if (s[i] === '-')
        i += 1;
    let d = 0;
    while (i < s.length && isDigit(s[i])) {
        i += 1;
        d += 1;
    }
    return d > 0 && i === s.length;
}
export function isN3(s) {
    if (isN1(s) || isSci(s))
        return true;
    const k = s.lastIndexOf(' ');
    if (k <= 0)
        return false;
    const head = s.slice(0, k);
    return UNIT_TOKENS.has(s.slice(k + 1)) && (isN1(head) || isSci(head));
}
export function isNumberCell(s) {
    return isN1(s) || isN2(s) || isN3(s);
}
export function csvCell(text, numberSlot = false) {
    let s = String(text);
    if (s.length > 0 && GUARD.includes(s[0]) && !(numberSlot === true && isNumberCell(s)))
        s = `'${s}`;
    return `"${s.split('"').join('""')}"`;
}
const NUMERIC_IDS = new Set([
    'length', 'mass', 'conc', 'a260', 'dilution', 'volume', 'amount', 'copies', 'ownA', 'ownB', 'factor', 'genomeMass', 'genomeSize',
]);
const exactText = (e) => (e.den === '1' ? e.num : `${e.num}/${e.den}`);
export function buildRecord(result, ctx) {
    if (!result || result.status !== 'ok')
        return null;
    const mat = MATERIALS[result.material];
    const inputs = result.inputsUsed.map((x) => {
        let value = x.value;
        if (x.id === 'ownClass' || x.id === 'factorClass')
            value = UI[`UI.ownClass.${x.value}`];
        if (x.id === 'outputUnit')
            value = micro(x.value);
        return {
            id: x.id,
            label: x.label,
            value,
            unit: micro(x.unit || ''),
            role: x.role,
            used: x.used !== false,
            numeric: NUMERIC_IDS.has(x.id),
        };
    });
    const constants = [];
    const rel = result.inputsUsed.find((x) => x.id === 'relation');
    if (rel) {
        constants.push({ label: fill(LABEL.ownA, { '[bp or nt]': mat.lengthUnit }), value: rel.a, unit: micro(`g/mol per ${mat.lengthUnit}`), source: SOURCES.relationSource[result.material] });
        constants.push({ label: LABEL.ownB, value: rel.b, unit: MW_UNIT, source: SOURCES.relationSource[result.material] });
    }
    if (result.inputsUsed.some((x) => x.id === 'factor' && x.role === 'constant')) {
        const f = result.inputsUsed.find((x) => x.id === 'factor');
        constants.push({ label: LABEL.factor, value: f.value, unit: micro('ug/mL per A260'), source: SOURCES.factorSource });
    }
    const formI = result.inputsUsed.some((x) => x.id === 'genomeMass');
    if (!formI)
        constants.push({ label: EX['EX.item.avogadro'], value: EX['EX.avogadro.value'], unit: EX['EX.avogadro.unit'], source: EX['EX.avogadro.source'] });
    const v = result.values;
    const results = [];
    const addValue = (key, label, val) => {
        if (!val)
            return;
        results.push({
            key, label, display: val.display, unit: micro(val.unit || ''), exact: { num: val.exact.num, den: val.exact.den }, role: EX['EX.role.calculated'],
        });
    };
    addValue('aNeat', UI['UI.row.aNeat'], v.aNeat);
    addValue('concentration', UI['UI.row.conc'], v.concentration);
    addValue('aliquotMass', UI['UI.row.aliquot'], v.aliquotMass);
    addValue('mw', UI['UI.row.mw'], v.mw);
    addValue('endGroupShare', EX['EX.item.endGroup'], v.endGroupShare);
    let resLabel = UI['UI.row.copies'];
    if (v.result.kind === 'mass')
        resLabel = UI['UI.row.mass'];
    if (v.result.kind === 'amount')
        resLabel = UI['UI.row.amount'];
    const hd = result.inputsUsed.find((x) => x.id === 'haploidOrDiploid');
    if (result.flags.fl03 && hd)
        resLabel = fill(UI['UI.row.genome'], { '[haploid or diploid]': hd.value });
    addValue('result', resLabel, v.result);
    const notes = [];
    const f = result.flags;
    if (f.fl01)
        notes.push(f.fl01.text);
    if (f.fl02)
        notes.push(f.parts.fl02 ? microParts(f.parts.fl02) : micro(f.fl02));
    if (f.fl03)
        notes.push(microParts(f.parts.fl03));
    if (f.fl04)
        notes.push(microParts(f.parts.fl04));
    if (f.fl06 && f.fl06.shown)
        notes.push(f.fl06.text);
    if (f.fl07 && f.fl07.relation)
        notes.push(f.fl07.relation);
    if (f.fl07 && f.fl07.factor)
        notes.push(f.fl07.factor);
    if (f.fl11)
        notes.push(micro(f.fl11));
    if (result.material === 'ssDNA' && result.route === 'c')
        notes.push(FL['FL-05']);
    for (const n of result.notices)
        notes.push(micro(n.text));
    const sources = [];
    const namesVendors = (t) => t.includes('QIAGEN') || t.includes('Thermo');
    if (rel)
        sources.push({ label: EX['EX.item.relationSource'], text: SOURCES.relationSource[result.material] });
    if (result.inputsUsed.some((x) => x.id === 'factor' && x.role === 'constant'))
        sources.push({ label: EX['EX.item.factorSource'], text: SOURCES.factorSource });
    if (!formI)
        sources.push({ label: EX['EX.item.avogadroSource'], text: EX['EX.avogadro.source'] });
    const vendorNotice = [...sources.map((s) => s.text), ...notes].some(namesVendors) ? SOURCES.notice : null;
    const labels = Array.isArray(ctx.exampleLabels) ? ctx.exampleLabels : [];
    const tail = ` (v${CONFIG.version}) [Computer software]. ${CONFIG.legalEntity}. ${CONFIG.publicBase.replace('https://', '')}${CONFIG.slug}/`;
    return {
        title: UI['UI.title'],
        exampleLine: labels.length > 0 ? UI['UI.banner.lead'] + labels.join(RF['RF-01.separator']) : null,
        exampleLabels: labels,
        toolVersion: CONFIG.version,
        engine: { versionLine: result.engine.versionLine, commit: result.engine.commit },
        date: ctx.date,
        citation: `${CONFIG.citationAuthor} (${CONFIG.citationYear}). ${CONFIG.toolTitle}${tail}`,
        inputs,
        constants,
        results,
        notes,
        sources,
        vendorNotice,
    };
}
export const CSV_COLUMNS = EX['EX.csv.columns'];
function csvRows(r) {
    const rows = [];
    const add = (cells, nums) => rows.push({ cells, nums: nums || [false, false, false, false, false, false] });
    const S = (k) => EX[`EX.section.${k}`];
    add([S('record'), EX['EX.item.title'], r.title, '', '', '']);
    if (r.exampleLine)
        add([S('record'), EX['EX.item.example'], r.exampleLine, '', '', '']);
    add([S('record'), EX['EX.item.toolVersion'], r.toolVersion, '', '', '']);
    add([S('record'), EX['EX.item.engine'], r.engine.versionLine, '', '', '']);
    add([S('record'), EX['EX.item.engineCommit'], r.engine.commit, '', '', '']);
    add([S('record'), EX['EX.item.date'], r.date, '', '', '']);
    for (const x of r.inputs) {
        const note = x.used ? x.role : UI['UI.notUsed'];
        add([S('input'), x.label, x.value, x.unit, '', note], [false, false, x.numeric, false, false, false]);
    }
    for (const c of r.constants)
        add([S('constant'), c.label, c.value, c.unit, '', 'constant'], [false, false, false, false, false, false]);
    for (const x of r.results) {
        add([S('result'), x.label, x.display, x.unit, exactText(x.exact), x.role], [false, false, true, false, true, false]);
    }
    for (const n of r.notes)
        add([S('note'), EX['EX.item.note'], n, '', '', '']);
    for (const s of r.sources)
        add([S('source'), s.label, s.text, '', '', '']);
    if (r.vendorNotice)
        add([S('source'), EX['EX.item.notice'], r.vendorNotice, '', '', '']);
    add([S('record'), EX['EX.item.citation'], r.citation, '', '', '']);
    return rows;
}
export function toCsv(r) {
    const out = [csvCell(EX['EX.csv.header']), CSV_COLUMNS.map((c) => csvCell(c)).join(',')];
    for (const row of csvRows(r))
        out.push(row.cells.map((c, i) => csvCell(c, row.nums[i])).join(','));
    return `${out.join('\r\n')}\r\n`;
}
export const SCHEMA_ID = 'ligant-nucleic-acid-mass-and-copies-record';
export const SCHEMA_VERSION = 1;
const STRING = { type: 'string' };
const EXACT = {
    type: 'object',
    required: ['num', 'den'],
    additionalProperties: false,
    properties: { num: STRING, den: STRING },
};
export const RECORD_SCHEMA = Object.freeze({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'Nucleic acid mass and copies: record',
    type: 'object',
    required: ['schema', 'schemaVersion', 'title', 'exampleValuesInUse', 'toolVersion', 'engine', 'date', 'citation', 'inputs', 'constants', 'results', 'notes', 'sources', 'vendorNotice'],
    additionalProperties: false,
    properties: {
        schema: { const: SCHEMA_ID },
        schemaVersion: { const: SCHEMA_VERSION },
        title: STRING,
        exampleValuesInUse: { type: 'array', items: STRING },
        toolVersion: STRING,
        engine: {
            type: 'object', required: ['versionLine', 'commit'], additionalProperties: false, properties: { versionLine: STRING, commit: STRING },
        },
        date: STRING,
        citation: STRING,
        inputs: {
            type: 'array',
            items: {
                type: 'object',
                required: ['id', 'label', 'value', 'unit', 'role', 'used'],
                additionalProperties: false,
                properties: {
                    id: STRING, label: STRING, value: STRING, unit: STRING, role: { enum: ['entered', 'declared', 'constant'] }, used: { type: 'boolean' },
                },
            },
        },
        constants: {
            type: 'array',
            items: {
                type: 'object', required: ['label', 'value', 'unit', 'source'], additionalProperties: false, properties: { label: STRING, value: STRING, unit: STRING, source: STRING },
            },
        },
        results: {
            type: 'array',
            items: {
                type: 'object',
                required: ['key', 'label', 'display', 'unit', 'exact', 'role'],
                additionalProperties: false,
                properties: {
                    key: STRING, label: STRING, display: STRING, unit: STRING, exact: EXACT, role: STRING,
                },
            },
        },
        notes: { type: 'array', items: STRING },
        sources: {
            type: 'array',
            items: {
                type: 'object', required: ['label', 'text'], additionalProperties: false, properties: { label: STRING, text: STRING },
            },
        },
        vendorNotice: { type: ['string', 'null'] },
    },
});
export function jsonBody(r) {
    return {
        schema: SCHEMA_ID,
        schemaVersion: SCHEMA_VERSION,
        title: r.title,
        exampleValuesInUse: r.exampleLabels,
        toolVersion: r.toolVersion,
        engine: r.engine,
        date: r.date,
        citation: r.citation,
        inputs: r.inputs.map((x) => ({
            id: x.id, label: x.label, value: x.value, unit: x.unit, role: x.role, used: x.used,
        })),
        constants: r.constants,
        results: r.results,
        notes: r.notes,
        sources: r.sources,
        vendorNotice: r.vendorNotice,
    };
}
export function toJson(r) {
    return `${JSON.stringify(jsonBody(r), null, 2)}\n`;
}
export function toSavedRecord(r) {
    return `${JSON.stringify({ kind: EX['EX.kind.saved'], savedOn: r.date, record: jsonBody(r) }, null, 2)}\n`;
}
const withUnit = (value, unit) => (unit === '' ? value : `${value} ${unit}`);
export function toNotebook(r) {
    const out = [r.title];
    if (r.exampleLine)
        out.push(r.exampleLine);
    out.push(`${EX['EX.item.date']}: ${r.date}`);
    out.push(`${EX['EX.item.toolVersion']}: ${r.toolVersion}`);
    out.push(`${EX['EX.item.engine']}: ${r.engine.versionLine} (${r.engine.commit})`);
    out.push('', EX['EX.nb.inputs']);
    for (const x of r.inputs)
        out.push(`${x.label}: ${withUnit(x.value, x.unit)}${x.used ? '' : ` ${UI['UI.notUsed']}`}`);
    if (r.constants.length > 0) {
        out.push('', EX['EX.nb.constants']);
        for (const c of r.constants)
            out.push(`${c.label}: ${withUnit(c.value, c.unit)}`);
    }
    out.push('', EX['EX.nb.results']);
    for (const x of r.results) {
        const exact = exactText(x.exact);
        out.push(`${x.label}: ${withUnit(x.display, x.unit)} (exact ${exact}${x.unit === '' ? '' : ` ${x.unit}`})`);
    }
    if (r.notes.length > 0) {
        out.push('', EX['EX.nb.notes']);
        for (const n of r.notes)
            out.push(n);
    }
    if (r.sources.length > 0 || r.vendorNotice) {
        out.push('', EX['EX.nb.sources']);
        for (const s of r.sources)
            out.push(`${s.label}: ${s.text}`);
        if (r.vendorNotice)
            out.push(r.vendorNotice);
    }
    out.push('', r.citation);
    return `${out.join('\n')}\n`;
}
export function fileName(r, ext) {
    return `${EX['EX.file.stem']}-${r.date}.${ext}`;
}
