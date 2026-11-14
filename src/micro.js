const TOKENS = ['umol', 'ug', 'uL', 'uM'];
const MICRO = 'µ';
function isLetter(c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}
function mapPlain(text) {
    let out = '';
    for (let i = 0; i < text.length; i += 1) {
        const c = text[i];
        if (c === 'u' && (i === 0 || !isLetter(text[i - 1]))) {
            let hit = '';
            for (const tok of TOKENS) {
                if (text.startsWith(tok, i)) {
                    const after = text[i + tok.length];
                    if (after === undefined || !isLetter(after)) {
                        hit = tok;
                        break;
                    }
                }
            }
            if (hit !== '') {
                out += MICRO + hit.slice(1);
                i += hit.length - 1;
                continue;
            }
        }
        out += c;
    }
    return out;
}
export function micro(text) {
    if (arguments.length !== 1)
        throw new TypeError('micro takes exactly one argument; use microParts for a line that holds a user string');
    return mapPlain(text);
}
export function microParts(parts) {
    return parts.map((p) => (p.user ? p.text : mapPlain(p.text))).join('');
}
