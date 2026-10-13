// Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert');
require('../js/util.js');
require('../js/store.js');
const { U, F, store } = globalThis.Solva;

store.load();
const today = U.today();

test('seed is deterministic', () => {
  const a = F.seed('2026-10-14'), b = F.seed('2026-10-14');
  assert.deepStrictEqual(a.appts, b.appts);
});

test('Thai dates use Buddhist era', () => {
  assert.strictEqual(U.thDate('2026-10-14'), '14 ต.ค. 2569');
  assert.strictEqual(U.thLong('2026-10-14'), 'วันพุธที่ 14 ตุลาคม 2569');
  assert.strictEqual(U.initial('คุณเจน'), 'จ');
});

test('appointment pricing applies member discount', () => {
  const a = { items: [{ n: 'x', p: 1000 }, { n: 'y', p: 450 }], disc: 10 };
  assert.strictEqual(F.apptSub(a), 1450);
  assert.strictEqual(F.apptDisc(a), 145);
  assert.strictEqual(F.apptNet(a), 1305);
});

test('detects the seeded double booking today', () => {
  const ov = store.overlaps(today);
  assert.strictEqual(ov.length, 1);
  assert.strictEqual(ov[0].mins, 20);
  assert.strictEqual(store.conflictsFor(today, 'st2', '14:00', 60).length, 2);
});

test('product status thresholds', () => {
  assert.strictEqual(F.productStatus({ qty: 0, min: 3 }).k, 'out');
  assert.strictEqual(F.productStatus({ qty: 3, min: 3 }).k, 'low');
  assert.strictEqual(F.productStatus({ qty: 4, min: 3 }).k, 'ok');
});

test('tier progress', () => {
  const t = F.tierInfo(2000, 'Gold');
  assert.strictEqual(t.next, 'Platinum');
  assert.strictEqual(t.toNext, 1000);
  assert.strictEqual(t.pct, 50);
  assert.strictEqual(F.tierInfo(7000, null).earned, 'Diamond');
});

test('finance: profit = income - expense, payouts clear pending', () => {
  const m = store.financeMonth(U.ym(today));
  assert.strictEqual(m.profit, m.income - m.expense);
  const id = 'st1', pending = store.staffPending(id);
  store.update(s => s.payouts.push({ id: 'x', staffId: id, date: today, amount: pending }));
  assert.strictEqual(store.staffPending(id), 0);
});
