import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../shared/csv.js';
import { buildClinic, parseRoomId, isWorkZone, parseTime } from '../shared/clinic.js';
import { clinic } from './helpers.js';

test("xona nomidan qavat, raqam va turini o'qiydi", () => {
  assert.deepEqual(parseRoomId('ROOM_2_205_Operatsion'), { floor: 2, code: '205', kind: 'Operatsion' });
  assert.deepEqual(parseRoomId('ROOM_1_CORR_Koridor'), { floor: 1, code: 'CORR', kind: 'Koridor' });
  assert.deepEqual(parseRoomId('ROOM_4_402_DamOlish'), { floor: 4, code: '402', kind: 'DamOlish' });
  assert.equal(parseRoomId('Box001'), null);
});

test("CSV: vergul, nuqtali vergul, qo'shtirnoq va BOM", () => {
  assert.deepEqual(parseCsv('﻿a,b\n1,"x, y"\n'), [{ a: '1', b: 'x, y' }]);
  assert.deepEqual(parseCsv('a;b\r\n1;2\r\n'), [{ a: '1', b: '2' }]);
  assert.equal(parseTime('08:00'), 480);
});

test("haqiqiy ro'yxatlar xatosiz o'qiladi", () => {
  const c = clinic({ demo: false });
  assert.deepEqual(c.warnings, []);
  assert.equal(c.rooms.length, 8);
  assert.equal(c.staff.length, 3);
  assert.deepEqual(c.floors, [1, 2, 3, 4]);
  assert.equal(c.roomById.get('ROOM_4_402_DamOlish').type, 'dam_olish');
  assert.equal(c.roomById.get('ROOM_2_WC1_Hojatxona').type, 'maxfiy');
  const d = c.staff.find((s) => s.name === 'Dilnoza Karimova');
  assert.equal(d.id, 'dilnoza-karimova');
  assert.equal(d.shiftStart, 480);
  assert.equal(d.shiftEnd, 1200);
});

test("namuna ma'lumotlari qo'shiladi, haqiqiylari o'zgarmaydi", () => {
  const c = clinic();
  assert.deepEqual(c.warnings, []);
  assert.equal(c.staff.filter((s) => !s.demo).length, 3);
  assert.ok(c.staff.length >= 12);
  for (const f of [1, 2, 3, 4]) assert.ok(c.rooms.some((r) => r.floor === f && r.type === 'koridor'), `${f}-qavat koridori`);
  assert.ok(!c.roomById.get('ROOM_2_205_Operatsion').demo);
});

test("ish zonasi lavozimga qarab aniqlanadi", () => {
  const c = clinic();
  const room = (id) => c.roomById.get(id);
  assert.ok(isWorkZone(c.roles.Shifokor, room('ROOM_2_205_Operatsion')));
  assert.ok(!isWorkZone(c.roles.Shifokor, room('ROOM_4_401_Oshxona')));
  assert.ok(isWorkZone(c.roles.Sanitarka, room('ROOM_1_CORR_Koridor')));
  assert.ok(!isWorkZone(c.roles.Sanitarka, room('ROOM_2_WC1_Hojatxona')));
  assert.ok(!isWorkZone(c.roles.Sanitarka, room('ROOM_4_402_DamOlish')));
});

test("xato ma'lumotlar ogohlantirish beradi, dastur to'xtamaydi", () => {
  const c = buildClinic({
    rolesCsv: 'lavozim,rang,harakat_normasi,ish_zonalari\nHamshira,#ff0000,45,Palata\n',
    roomsCsv: 'obyekt_nomi,ekrandagi_nom,turi\nBox001,Nimadir,ish\nROOM_1_101_Palata,101,ish\n',
    staffCsv: 'ism_familiya,lavozim,asosiy_qavat,asosiy_xona,smena_boshi,smena_oxiri\nAli,Qorovul,1,ROOM_9_1_X,25:00,08:00\n',
  });
  assert.equal(c.rooms.length, 1);
  assert.equal(c.staff.length, 1);
  assert.equal(c.warnings.length, 4);
});
