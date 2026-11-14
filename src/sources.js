const THERMO_URL = 'https://www.thermofisher.com/us/en/home/references/ambion-tech-support/rna-tools-and-calculators/dna-and-rna-molecular-weights-and-conversions';
const A320_URL = 'https://www.qiagen.com/dk/knowledge-and-support/knowledge-hub/bench-guide/dna/analysing-dna/spectrophotometric-measurement-of-dna-concentration';
const CONVERTER_URL = 'https://www.qiagen.com/us/applications/enzymes/tools-and-calculators/dsdna-mass-to-moles-conventer';
export const SOURCES = Object.freeze({
    readDate: 'read 13 Nov 2026',
    thermoAttribution: `Thermo Fisher Scientific (Ambion tech support), "DNA and RNA Molecular Weights and Conversions", ${THERMO_URL}, read 13 Nov 2026`,
    thermoSameAttribution: 'Same page, read 13 Nov 2026',
    footnotes: Object.freeze([
        Object.freeze({
            id: 'ssDNA',
            leadIn: "Footnote to the page's composition-based ssDNA formula:",
            quote: `Addition of "79.0" to the M.W. takes into account the 5' monophosphate left by most restriction enzymes.`,
        }),
        Object.freeze({
            id: 'ssRNA',
            leadIn: "Footnote to the page's composition-based ssRNA formula:",
            quote: `Addition of "159" to the M.W. takes into account the M.W. of a 5' triphosphate.`,
        }),
    ]),
    a320: Object.freeze({
        attribution: `QIAGEN, "DNA Spectrophotometer: Purity & Concentration", Bench guide, ${A320_URL}, read 13 Nov 2026`,
        quote: 'Concentration (µg/mL) = (A260 reading – A320 reading) × dilution factor × 50 µg/mL',
        context: "The page gives this formula for DNA. This tool preselects 50 for dsDNA only and has no A320 field: if your method subtracts an A320 reading, enter the corrected A260.",
    }),
    converter: `QIAGEN, "dsDNA Mass to Moles Conventer" (spelling as on the page), ${CONVERTER_URL}, read 13 Nov 2026. Source of the dsDNA relation and of the phrase quoted in the note on the choice of constant.`,
    notice: 'Thermo Fisher Scientific and Ambion are trademarks of Thermo Fisher Scientific and its subsidiaries. QIAGEN is a trademark of the QIAGEN Group. Other names may be trademarks of their respective owners. They are used here only to identify the sources quoted. Ligant is not affiliated with, sponsored or endorsed by Thermo Fisher Scientific or QIAGEN.',
    relationSource: Object.freeze({
        dsDNA: `QIAGEN, "dsDNA Mass to Moles Conventer" (spelling as on the page), ${CONVERTER_URL}, read 13 Nov 2026`,
        ssDNA: `Thermo Fisher Scientific (Ambion tech support), "DNA and RNA Molecular Weights and Conversions", ${THERMO_URL}, read 13 Nov 2026`,
        ssRNA: `Thermo Fisher Scientific (Ambion tech support), "DNA and RNA Molecular Weights and Conversions", ${THERMO_URL}, read 13 Nov 2026`,
    }),
    factorSource: `Thermo Fisher Scientific (Ambion tech support), "DNA and RNA Molecular Weights and Conversions", ${THERMO_URL}, read 13 Nov 2026`,
});
export const RELATION_SOURCE_NAME = Object.freeze({ dsDNA: 'QIAGEN', ssDNA: 'Thermo Fisher', ssRNA: 'Thermo Fisher' });
export function quotedStrings() {
    return [
        SOURCES.thermoAttribution,
        ...SOURCES.footnotes.flatMap((f) => [f.leadIn, f.quote]),
        SOURCES.a320.attribution,
        SOURCES.a320.quote,
        SOURCES.a320.context,
        SOURCES.converter,
        SOURCES.notice,
    ];
}
