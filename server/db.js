// Baza (SQLite): joylashuv tarixi va kunlik xulosalar. Eski yozuvlar avtomatik o'chadi.
import { DatabaseSync } from 'node:sqlite';
import { DAY } from '../shared/time.js';

export class HistoryDb {
  constructor(file) {
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS joylashuv (
        vaqt INTEGER NOT NULL,
        xodim TEXT NOT NULL,
        qavat INTEGER,
        xona TEXT,
        maxfiy INTEGER NOT NULL DEFAULT 0,
        holat TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS joylashuv_vaqt ON joylashuv (vaqt);
      CREATE INDEX IF NOT EXISTS joylashuv_xodim ON joylashuv (xodim, vaqt);
      CREATE TABLE IF NOT EXISTS kunlik (
        sana TEXT NOT NULL,
        xodim TEXT NOT NULL,
        malumot TEXT NOT NULL,
        PRIMARY KEY (sana, xodim)
      );
    `);
    this.insert = this.db.prepare('INSERT INTO joylashuv (vaqt, xodim, qavat, xona, maxfiy, holat) VALUES (?, ?, ?, ?, ?, ?)');
    this.upsertDay = this.db.prepare(`INSERT INTO kunlik (sana, xodim, malumot) VALUES (?, ?, ?)
      ON CONFLICT (sana, xodim) DO UPDATE SET malumot = excluded.malumot`);
  }

  // Faqat ekranga chiqadigan (maxfiy zonasi yashirilgan) holat yoziladi.
  recordLocation(state, t) {
    this.insert.run(t, state.id, state.floor, state.room, state.private ? 1 : 0, state.status);
  }

  saveDaily(day, rows) {
    this.db.exec('BEGIN');
    try {
      for (const r of rows) this.upsertDay.run(day, r.id, JSON.stringify(r));
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  locations(staffId, from, to) {
    return this.db.prepare('SELECT vaqt, qavat, xona, maxfiy, holat FROM joylashuv WHERE xodim = ? AND vaqt >= ? AND vaqt < ? ORDER BY vaqt')
      .all(staffId, from, to);
  }

  allLocationsSince(from) {
    return this.db.prepare('SELECT vaqt, xodim, qavat, xona, maxfiy, holat FROM joylashuv WHERE vaqt >= ? ORDER BY vaqt').all(from);
  }

  dailyHistory(fromDay, toDay) {
    return this.db.prepare('SELECT sana, xodim, malumot FROM kunlik WHERE sana >= ? AND sana <= ? ORDER BY sana')
      .all(fromDay, toDay)
      .map((r) => ({ sana: r.sana, xodim: r.xodim, ...JSON.parse(r.malumot) }));
  }

  // Saqlash muddatidan eski yozuvlarni o'chiradi.
  cleanup(now, keepDays) {
    const cutoff = now - keepDays * DAY;
    const cutoffDay = new Date(cutoff).toISOString().slice(0, 10);
    const a = this.db.prepare('DELETE FROM joylashuv WHERE vaqt < ?').run(cutoff).changes;
    const b = this.db.prepare('DELETE FROM kunlik WHERE sana < ?').run(cutoffDay).changes;
    return a + b;
  }

  close() {
    this.db.close();
  }
}
