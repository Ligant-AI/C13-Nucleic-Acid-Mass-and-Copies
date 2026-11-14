const PROPS = new Set(['checked', 'selected', 'open']);
export function render(node, doc) {
    if (typeof node === 'string')
        return doc.createTextNode(node);
    const el = doc.createElement(node.t);
    for (const key of Object.keys(node.a)) {
        const v = node.a[key];
        if (v === null || v === undefined || v === false)
            continue;
        if (key === 'value')
            el.value = v;
        else if (PROPS.has(key))
            el[key] = true;
        else if (key === 'class')
            el.className = v;
        else if (key === 'for')
            el.htmlFor = v;
        else
            el.setAttribute(key, v === true ? '' : String(v));
    }
    for (const child of node.c)
        el.appendChild(render(child, doc));
    return el;
}
