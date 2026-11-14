import { CONFIG } from './config.js';
import { FAQ } from './texts.js';
export function softwareApplication() {
    return {
        '@type': 'SoftwareApplication',
        name: CONFIG.toolTitle,
        description: CONFIG.tagline,
        url: `${CONFIG.publicBase}${CONFIG.slug}/`,
        applicationCategory: 'BrowserApplication',
        operatingSystem: 'Any, in a web browser',
        publisher: { '@type': 'Organization', name: CONFIG.publisher },
    };
}
export function faqPage() {
    return {
        '@type': 'FAQPage',
        mainEntity: FAQ.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
    };
}
export function jsonLd() {
    return { '@context': 'https://schema.org', '@graph': [softwareApplication(), faqPage()] };
}
export function jsonLdText() {
    return JSON.stringify(jsonLd());
}
export function mountStructuredData(doc) {
    if (doc.getElementById('structured-data'))
        return;
    const s = doc.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'structured-data';
    s.textContent = jsonLdText();
    doc.head.appendChild(s);
}
