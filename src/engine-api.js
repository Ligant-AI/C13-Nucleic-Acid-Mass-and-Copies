import { massToCopies, copiesToMass, molesToCopies, copiesToMoles, amountFromConcentration, scaleUnit, } from './engine/e10/index.js';
import { engineVersionLine } from './engine/version.js';
import vendored from './engine/VENDORED.json' with { type: 'json' };
export { massToCopies, copiesToMass, molesToCopies, copiesToMoles, amountFromConcentration, scaleUnit };
export const ENGINE_VERSION_LINE = engineVersionLine();
export const ENGINE_COMMIT = vendored.commit;
