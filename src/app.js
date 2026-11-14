import { buildPage } from './page.js';
import { render } from './dom.js';
import { initialState, loadExample, clearAll, setField, removeGenome, taggedLabels, } from './state.js';
import { compute } from './calc.js';
import { buildRecord, toCsv, toJson, toNotebook, toSavedRecord, fileName, } from './export.js';
import { LABEL, UI_EXPORT } from './texts.js';
import { mountStructuredData } from './structured.js';
export function mount(container, doc) {
    let state = initialState();
    const ui = { open: {}, release: import.meta.env ? import.meta.env.PROD === true : false };
    function draw() {
        const active = doc.activeElement;
        const focusId = active && active.id ? active.id : '';
        const caret = active && typeof active.selectionStart === 'number' && active.type !== 'radio'
            ? [active.selectionStart, active.selectionEnd] : null;
        const { root } = buildPage(state, ui);
        container.replaceChildren(render(root, doc));
        if (focusId !== '') {
            const el = doc.getElementById(focusId);
            if (el) {
                el.focus();
                if (caret && typeof el.setSelectionRange === 'function') {
                    try {
                        el.setSelectionRange(caret[0], caret[1]);
                    }
                    catch (e) { }
                }
            }
        }
    }
    container.addEventListener('input', (e) => {
        const t = e.target;
        const field = t.getAttribute && t.getAttribute('data-field');
        if (!field || t.type === 'radio' || t.tagName === 'SELECT')
            return;
        state = setField(state, field, t.value);
        draw();
    });
    container.addEventListener('change', (e) => {
        const t = e.target;
        const field = t.getAttribute && t.getAttribute('data-field');
        if (!field || !(t.type === 'radio' || t.tagName === 'SELECT'))
            return;
        state = setField(state, field, t.value);
        draw();
    });
    function download(name, text, type) {
        const url = URL.createObjectURL(new Blob([text], { type }));
        const a = doc.createElement('a');
        a.href = url;
        a.download = name;
        doc.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }
    function doExport(kind) {
        const record = buildRecord(compute(state.inputs), {
            date: new Date().toISOString().slice(0, 10),
            exampleLabels: taggedLabels(state, (tag) => LABEL[tag]),
            release: ui.release,
        });
        if (record === null)
            return;
        if (kind === 'csv')
            download(fileName(record, 'csv'), toCsv(record), 'text/csv;charset=utf-8');
        else if (kind === 'json')
            download(fileName(record, 'json'), toJson(record), 'application/json');
        else if (kind === 'record')
            download(`${fileName(record, 'json').replace('.json', '-saved.json')}`, toSavedRecord(record), 'application/json');
        else if (kind === 'copy') {
            const text = toNotebook(record);
            const clip = typeof navigator !== 'undefined' ? navigator.clipboard : null;
            if (clip && typeof clip.writeText === 'function') {
                clip.writeText(text).then(() => { state = { ...state, status: UI_EXPORT['UI.export.copied'] }; draw(); }, () => { state = { ...state, status: UI_EXPORT['UI.export.copyFailed'] }; draw(); });
            }
            else {
                state = { ...state, status: UI_EXPORT['UI.export.copyFailed'] };
                draw();
            }
        }
    }
    container.addEventListener('click', (e) => {
        const t = e.target;
        const act = t.getAttribute && t.getAttribute('data-act');
        if (!act)
            return;
        if (act.startsWith('export-')) {
            doExport(act.slice('export-'.length));
            return;
        }
        if (act === 'load')
            state = loadExample();
        else if (act === 'clear')
            state = clearAll();
        else if (act === 'remove')
            state = removeGenome(state);
        else
            return;
        draw();
    });
    container.addEventListener('toggle', (e) => {
        const t = e.target;
        const id = t.getAttribute && t.getAttribute('data-open-id');
        if (id)
            ui.open[id] = t.open === true;
    }, true);
    mountStructuredData(doc);
    draw();
}
if (typeof document !== 'undefined') {
    const host = document.getElementById('app');
    if (host)
        mount(host, document);
}
