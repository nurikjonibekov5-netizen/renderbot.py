import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadClinicFromDisk } from '../shared/load-node.js';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = join(ROOT, 'data');
export const clinic = (opts) => loadClinicFromDisk(DATA, opts);
