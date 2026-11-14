export const MATERIALS = Object.freeze({
    dsDNA: Object.freeze({
        short: 'dsDNA', cls: 'ds', lengthUnit: 'bp', a: '617.96', b: '36.04', presetFactor: '50', presetFactorPreselected: true,
    }),
    ssDNA: Object.freeze({
        short: 'ssDNA', cls: 'ss', lengthUnit: 'nt', a: '303.7', b: '79.0', presetFactor: '37', presetFactorPreselected: false,
    }),
    ssRNA: Object.freeze({
        short: 'ssRNA', cls: 'ss', lengthUnit: 'nt', a: '320.5', b: '159.0', presetFactor: '40', presetFactorPreselected: true,
    }),
});
export const MATERIAL_KEYS = Object.freeze(['dsDNA', 'ssDNA', 'ssRNA']);
export const DIRECTIONS = Object.freeze(['toCopies', 'fromCopies']);
export const ROUTES = Object.freeze(['a', 'b', 'c', 'd']);
export const UNIT_TABLE = Object.freeze({
    mass: Object.freeze(['g', 'mg', 'ug', 'ng', 'pg', 'fg']),
    massConc: Object.freeze(['g/L', 'mg/mL', 'ug/uL', 'ug/mL', 'ng/uL', 'ng/mL', 'pg/uL']),
    volume: Object.freeze(['L', 'mL', 'uL']),
    amount: Object.freeze(['mol', 'mmol', 'umol', 'nmol', 'pmol', 'fmol', 'amol']),
    molarConc: Object.freeze(['M', 'mM', 'uM', 'nM', 'pM', 'fM']),
    copies: Object.freeze(['copies']),
});
export const ALIQUOT_UNIT = 'ng';
export const CONC_UNIT = 'ug/mL';
export const COPIES_UNIT = 'copies';
export const MW_UNIT = 'g/mol';
export const SHARE_UNIT = '%';
export const SIG3_TO_SCI3_EXPONENT = 3;
export const DILUTION_MIN = '1';
export const FIELD_ORDER = Object.freeze([
    'material', 'length',
    'ownA', 'ownB', 'ownClass', 'ownSource',
    'direction', 'startingQuantity',
    'mass', 'conc', 'a260', 'dilution', 'factor', 'factorClass', 'factorSource', 'volume', 'amount',
    'genomeBoth', 'genomeValue', 'genomeMass', 'genomeSize', 'genomeSource', 'haploidOrDiploid',
    'copies', 'outputUnit',
]);
export const WINDOW_BELOW = 1;
export const WINDOW_ABOVE = 2;
