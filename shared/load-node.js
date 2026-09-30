// Serverda (Node.js) CSV fayllarni diskdan o'qib, klinikani yig'adi.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildClinic } from './clinic.js';

export function loadClinicFromDisk(dataDir, { demo = true } = {}) {
  const read = (f) => (existsSync(join(dataDir, f)) ? readFileSync(join(dataDir, f), 'utf8') : '');
  return buildClinic({
    roomsCsv: read('xonalar.csv'),
    staffCsv: read('xodimlar.csv'),
    rolesCsv: read('lavozimlar.csv'),
    demoRoomsCsv: demo ? read('namuna_xonalar.csv') : '',
    demoStaffCsv: demo ? read('namuna_xodimlar.csv') : '',
  });
}
