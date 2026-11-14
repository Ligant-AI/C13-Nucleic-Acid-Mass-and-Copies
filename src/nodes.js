export function h(t, a, ...children) {
    const c = [];
    for (const x of children.flat(Infinity)) {
        if (x === null || x === undefined || x === false)
            continue;
        c.push(x);
    }
    return { t, a: a || {}, c };
}
export const isNode = (x) => x !== null && typeof x === 'object' && typeof x.t === 'string';
export function textOf(node) {
    if (typeof node === 'string')
        return node;
    if (!isNode(node))
        return '';
    if (node.a && node.a.hidden === true)
        return '';
    const parts = [];
    for (const child of node.c) {
        const s = textOf(child);
        if (s !== '')
            parts.push(s);
    }
    return parts.join('\n');
}
export function walk(node, visit) {
    if (!isNode(node))
        return;
    visit(node);
    for (const child of node.c)
        walk(child, visit);
}
export function findAll(node, test) {
    const out = [];
    walk(node, (n) => { if (test(n))
        out.push(n); });
    return out;
}
