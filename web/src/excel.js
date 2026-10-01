// "Bugun" hisobotini Excel faylga yozadi (brauzerning o'zida, serverga yuk tushmaydi).
import { isWorkZone } from '../../shared/clinic.js';
import { formatClock, dayKey } from '../../shared/time.js';

const minutes = (ms) => Math.round((ms || 0) / 60000);

export async function exportExcel({ config, today, source }) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Klinika 3D nazorati';
  const staffById = new Map(config.staff.map((s) => [s.id, s]));
  const roomById = new Map(config.rooms.map((r) => [r.id, r]));

  const sheet = wb.addWorksheet('Bugun', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Xodim', key: 'name', width: 26 },
    { header: 'Lavozim', key: 'role', width: 15 },
    { header: 'Faollik, %', key: 'activity', width: 11 },
    { header: 'Norma (harakat), %', key: 'norm', width: 12 },
    { header: 'Kelgan', key: 'in', width: 9 },
    { header: 'Ketgan', key: 'out', width: 9 },
    { header: 'Binoda, daq', key: 'present', width: 12 },
    { header: 'Harakatda, daq', key: 'moving', width: 14 },
    { header: 'Ish zonasida, daq', key: 'work', width: 15 },
    { header: 'Dam olishda, daq', key: 'rest', width: 15 },
    { header: 'Uzoq harakatsiz, marta', key: 'idleCount', width: 14 },
    { header: 'Uzoq harakatsiz, daq', key: 'idle', width: 14 },
    { header: 'Xonalar soni', key: 'rooms', width: 11 },
    { header: 'Namuna', key: 'demo', width: 9 },
  ];
  const rows = [...today.rows].sort((a, b) => (b.activity ?? -1) - (a.activity ?? -1));
  for (const r of rows) {
    const s = staffById.get(r.id);
    sheet.addRow({
      name: s.name,
      role: s.role,
      activity: r.activity ?? '',
      norm: Math.round((config.roles[s.role]?.norm ?? 0) * 100),
      in: r.firstIn ? formatClock(r.firstIn) : '',
      out: r.lastOut ? formatClock(r.lastOut) : '',
      present: minutes(r.presentMs),
      moving: minutes(r.movingMs),
      work: minutes(r.workMs),
      rest: minutes(r.restMs),
      idleCount: r.idleCount,
      idle: minutes(r.idleLongMs),
      rooms: r.roomsVisited,
      demo: s.demo ? 'ha' : '',
    });
  }
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { wrapText: true, vertical: 'middle' };

  const tl = wb.addWorksheet('Kunlik tasma', { views: [{ state: 'frozen', ySplit: 1 }] });
  tl.columns = [
    { header: 'Xodim', key: 'name', width: 26 },
    { header: 'Boshlanishi', key: 's', width: 11 },
    { header: 'Tugashi', key: 'e', width: 11 },
    { header: 'Daqiqa', key: 'min', width: 8 },
    { header: 'Qavat', key: 'floor', width: 7 },
    { header: 'Joy', key: 'where', width: 30 },
    { header: 'Holat', key: 'state', width: 12 },
    { header: 'Ish zonasi', key: 'work', width: 10 },
  ];
  for (const r of rows) {
    const s = staffById.get(r.id);
    const role = config.roles[s.role];
    const { segments } = await source.timeline(r.id);
    for (const seg of segments) {
      const room = roomById.get(seg.room);
      tl.addRow({
        name: s.name,
        s: formatClock(seg.s),
        e: formatClock(seg.e),
        min: Math.round((seg.e - seg.s) / 60000),
        floor: seg.floor ?? '',
        where: seg.kind === 'lost' ? 'Signal yo\'q' : seg.private ? 'Maxfiy zona' : room?.label ?? '',
        state: seg.kind === 'lost' ? '' : seg.moving ? 'harakatda' : 'turgan',
        work: room && isWorkZone(role, room) ? 'ha' : '',
      });
    }
  }
  tl.getRow(1).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `faollik_${dayKey(today.t)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
