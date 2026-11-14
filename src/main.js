import '@ligant/bench-chrome/chrome.css';
import { renderHeader, renderFooter, bindCopy } from '@ligant/bench-chrome';
import { CONFIG } from './config.js';
import './engine-api.js';
import './calc.js';
import './ticks.js';
import './app.js';
const tail = ` (v${CONFIG.version}) [Computer software]. ${CONFIG.legalEntity}. ${CONFIG.publicBase.replace('https://', '')}${CONFIG.slug}/`;
document.getElementById('site-header').innerHTML = renderHeader({ path: `/${CONFIG.slug}/`, title: CONFIG.toolTitle, description: CONFIG.tagline });
const footer = document.getElementById('site-footer');
footer.innerHTML = renderFooter({
    repoUrl: CONFIG.repositoryUrl,
    citations: [{ lead: `${CONFIG.citationAuthor} (${CONFIG.citationYear}). `, title: CONFIG.toolTitle, tail }],
    citationFootnote: 'References are given as text rather than links, so the page itself sends no visit to a publisher.',
    disclaimer: CONFIG.disclaimer,
});
bindCopy(footer);
