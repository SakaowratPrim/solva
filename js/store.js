// Data layer: demo seed, persistence (localStorage) and derived selectors.
// Everything the pages show is computed from this one state object, so a change
// on one screen (e.g. taking payment) is reflected everywhere else.
(function (S) {
  'use strict';
  const U = S.U;

  const KEY = 'solva:data:v1';
  const DAY_MIN = 9 * 60;       // bookable minutes per staff per day (09:00–18:00)
  const OPEN = 9 * 60, CLOSE = 19 * 60;

  const TIERS = ['Pearl', 'Gold', 'Platinum', 'Diamond'];
  const TIER_PTS = [0, 1000, 3000, 6000];
  const DISC = { Pearl: 0, Gold: 5, Platinum: 10, Diamond: 15 };
  const TIER_CLS = { Pearl: 'pe', Gold: 'go', Platinum: 'pl', Diamond: 'di' };
  const BENEFITS = {
    Pearl: ['สะสมแต้มทุกครั้งที่ใช้บริการ'],
    Gold: ['ส่วนลด 5%', 'ของขวัญวันเกิด'],
    Platinum: ['ส่วนลด 10%', 'จองคิวก่อนใคร'],
    Diamond: ['ส่วนลด 15%', 'ทรีตเมนต์ฟรี 1 ครั้ง/ปี']
  };
  const PAY_METHODS = ['เงินสด', 'โอน (PromptPay)', 'บัตร'];
  const ATT = { ontime: ['ตรงเวลา', 's1'], late: ['มาสาย', 's2'], leave: ['ลา', 'nt'], absent: ['ขาด', 's3'] };
  const EXPENSE_CATS = ['วัสดุ', 'ค่าเช่า', 'ค่าน้ำ-ไฟ', 'การตลาด', 'เงินเดือน', 'อื่น ๆ'];
  const INCOME_CATS = ['ขายสินค้า', 'บัตรของขวัญ', 'อื่น ๆ'];

  // ------------------------------------------------------------------ seed
  function seed(today) {
    const r = U.rng(20261014);
    const services = [
      ['s1', 'ถอดสีเจลเดิม', 100, 15], ['s2', 'เตรียมหน้าเล็บ', 150, 15], ['s3', 'ทาสีเจล', 350, 45],
      ['s4', 'French ปลายเล็บ', 200, 20], ['s5', 'เพ้นท์เล็บ', 300, 30], ['s6', 'ต่อเล็บ', 1100, 75],
      ['s7', 'เพนต์เล็บ 3D', 1450, 75], ['s8', 'Top coat', 100, 10], ['s9', 'Manicure', 300, 40],
      ['s10', 'Pedicure', 400, 50]
    ].map(([id, name, price, dur]) => ({ id, name, price, dur }));
    const svc = Object.fromEntries(services.map(s => [s.id, s]));

    const staff = [
      { id: 'st1', nick: 'พี่แพร', full: 'แพรวา สุขใจ', role: 'หัวหน้าช่าง', phone: '086-111-2201', start: '2021-09-01', main: ['ต่อเล็บ', 'เจล'], sec: ['เพนต์เล็บ', 'Manicure', 'Pedicure'], rate: 20, off: 1 },
      { id: 'st2', nick: 'น้องฝน', full: 'ฝนทิพย์ ใจเย็น', role: 'ช่างเล็บ', phone: '086-111-2202', start: '2024-10-01', main: ['3D Nail Art', 'Nail Art'], sec: ['เจล', 'Manicure'], rate: 20, off: 2 },
      { id: 'st3', nick: 'น้องบีม', full: 'บีมา ดีเลิศ', role: 'ช่างเล็บ', phone: '086-111-2203', start: '2025-10-01', main: ['เจล'], sec: ['Manicure', 'Pedicure'], rate: 15, off: 4 }
    ];

    const ago = n => U.addDays(today, -n);
    const C = (id, name, nick, phone, tier, bd, regAgo, line, notes) => ({
      id, name, nick, phone, tier, bd, reg: ago(regAgo), line, notes,
      memSince: tier ? ago(Math.min(regAgo, 300)) : null,
      memExp: tier ? U.addDays(ago(Math.min(regAgo, 300)), 365) : null
    });
    const clients = [
      C('c1', 'คุณนิดา ใจดี', 'นิด', '081-234-5678', 'Gold', '1992-03-14', 620, '@nida.nail', ['แพ้น้ำยาถอดเจล', 'เล็บบาง', 'ไม่ชอบตัดหนัง', 'ชอบทรง Almond']),
      C('c2', 'คุณพิมพ์ชนก', 'พิมพ์', '089-555-0142', 'Platinum', '1995-07-02', 860, '@pimchanok', ['ชอบสีนู้ดพาสเทล', 'ต่อเล็บทุก 3 สัปดาห์']),
      C('c3', 'คุณมี่', 'มี่', '086-777-9021', 'Diamond', '1990-12-09', 1380, '@mee.beauty', ['ชอบเพนต์ลายการ์ตูน', 'ขอห้องส่วนตัว']),
      C('c4', 'คุณเจน', 'เจน', '083-998-1200', 'Pearl', '1997-11-21', 220, '@jane.j', ['ชอบสีแดงเข้ม']),
      C('c5', 'คุณธิดา', 'ดา', '084-120-3377', null, '1998-04-30', 160, '@tida', ['ไม่ชอบเล็บยาว']),
      C('c6', 'คุณแพร', 'แพร', '092-310-4455', null, '1999-09-08', 70, '@praeoo', []),
      C('c7', 'คุณบัว', 'บัว', '095-444-8821', null, '2001-06-17', 2, '', []),
      C('c8', 'คุณกานต์ สายสุข', 'กานต์', '081-902-3341', 'Gold', '1994-01-25', 540, '@kan.s', ['ชอบโทนชมพู']),
      C('c9', 'คุณอรอุมา', 'อร', '087-221-0098', 'Pearl', '1993-08-11', 300, '@orn.u', []),
      C('c10', 'คุณจอย', 'จอย', '089-410-7755', null, '2000-02-14', 180, '', ['ผิวแพ้ง่าย']),
      C('c11', 'คุณแอน', 'แอน', '082-660-1234', 'Platinum', '1991-05-05', 900, '@ann.nails', ['ชอบกลิตเตอร์']),
      C('c12', 'คุณมายด์', 'มายด์', '086-300-8812', null, '2002-10-30', 120, '@mind', []),
      C('c13', 'คุณฟ้าใส', 'ฟ้า', '091-778-4520', 'Pearl', '1996-03-03', 260, '@fahsai', ['ชอบ French']),
      C('c14', 'คุณเฟิร์น', 'เฟิร์น', '080-115-6677', null, '1999-12-19', 140, '', []),
      C('c15', 'คุณออม', 'ออม', '094-532-1180', 'Gold', '1995-06-22', 480, '@aom.aom', ['ทำ Pedicure ทุกเดือน'])
    ];
    const W = { Diamond: 3, Platinum: 3, Gold: 2, Pearl: 2 };
    const pool = [];
    clients.forEach(c => { if (c.id !== 'c7') for (let i = 0; i < (W[c.tier] || 1); i++) pool.push(c); });

    const combos = {
      st1: [['s1', 's2', 's6', 's8'], ['s2', 's6', 's8'], ['s1', 's2', 's3', 's8'], ['s1', 's2', 's4', 's3', 's8'], ['s9', 's10']],
      st2: [['s2', 's7', 's8'], ['s1', 's2', 's5', 's3', 's8'], ['s2', 's3', 's8'], ['s2', 's5', 's8'], ['s1', 's2', 's7', 's8']],
      st3: [['s2', 's3', 's8'], ['s9'], ['s10'], ['s9', 's10'], ['s1', 's2', 's3', 's8']]
    };
    const items = ids => ids.map(id => ({ n: svc[id].name, p: svc[id].price }));
    const dur = ids => ids.reduce((s, id) => s + svc[id].dur, 0);

    const appts = [];
    let seq = 0;
    const A = (date, time, staffId, clientId, ids, status, extra) => {
      const c = clients.find(x => x.id === clientId);
      appts.push(Object.assign({
        id: 'a' + (++seq), date, time, staffId, clientId, items: items(ids), dur: dur(ids),
        disc: DISC[c.tier] || 0, status, paid: false, pay: '', tip: 0, note: ''
      }, extra || {}));
    };

    for (let k = -215; k <= 12; k++) {
      if (k === 0) continue;
      const date = U.addDays(today, k), wd = U.parse(date).getDay();
      for (const st of staff) {
        if (date < st.start || wd === st.off) continue;
        const n = k < 0 ? r.int(1, 3) : Math.max(0, r.int(0, 3) - Math.floor(k / 5));
        let cur = OPEN + r.int(0, 2) * 30;
        for (let i = 0; i < n; i++) {
          const ids = r.pick(combos[st.id]), d = dur(ids);
          if (cur + d > CLOSE) break;
          const c = r.pick(pool.filter(x => x.reg <= date));
          if (!c) break;
          let status = 'confirmed', extra = {};
          if (k < 0) {
            const x = r();
            if (x < 0.04) status = 'noshow';
            else if (x < 0.07) status = 'cancelled';
            else { status = 'done'; extra = { paid: true, pay: r.pick(PAY_METHODS), tip: r() < 0.45 ? r.pick([20, 50, 100]) : 0 }; }
          }
          A(date, U.fromMin(cur), st.id, c.id, ids, status, extra);
          cur = Math.ceil((cur + d) / 30) * 30 + r.int(0, 2) * 30;
        }
      }
    }
    // Today, mirroring the original design (including one double-booking)
    A(today, '09:00', 'st1', 'c1', ['s1', 's2', 's4', 's5', 's8'], 'confirmed');
    A(today, '09:00', 'st3', 'c6', ['s1', 's2', 's3', 's8'], 'noshow');
    A(today, '10:30', 'st2', 'c4', ['s2', 's3', 's8'], 'done', { paid: true, pay: 'โอน (PromptPay)' });
    A(today, '11:00', 'st3', 'c12', ['s9'], 'cancelled');
    A(today, '13:00', 'st1', 'c2', ['s1', 's2', 's6', 's8'], 'done');
    A(today, '13:30', 'st2', 'c5', ['s2', 's3', 's4'], 'confirmed');
    A(today, '14:30', 'st2', 'c3', ['s1', 's2', 's7', 's8'], 'confirmed');
    A(today, '15:30', 'st1', 'c15', ['s10'], 'confirmed');
    A(today, '16:00', 'st3', 'c8', ['s2', 's3', 's8'], 'booked');

    // Attendance (last ~75 days)
    const attendance = [];
    for (let k = -75; k <= 0; k++) {
      const date = U.addDays(today, k), wd = U.parse(date).getDay();
      for (const st of staff) {
        if (date < st.start || (wd === st.off && k !== 0)) continue;
        let rec;
        if (k === 0) rec = { st1: ['08:55', 'ontime'], st2: ['09:00', 'ontime'], st3: ['09:20', 'late'] }[st.id];
        else {
          const x = r();
          if (x < 0.05) { attendance.push({ id: 'at' + attendance.length, staffId: st.id, date, in: '', out: '', st: 'leave' }); continue; }
          if (x < 0.07) { attendance.push({ id: 'at' + attendance.length, staffId: st.id, date, in: '', out: '', st: 'absent' }); continue; }
          rec = x < 0.2 ? [U.fromMin(9 * 60 + r.int(8, 30)), 'late'] : [U.fromMin(8 * 60 + r.int(45, 60)), 'ontime'];
        }
        const out = k === 0 ? '' : r() < 0.15 ? '17:30' : U.fromMin(18 * 60 + r.int(0, 10));
        attendance.push({ id: 'at' + attendance.length, staffId: st.id, date, in: rec[0], out, st: rec[1] });
      }
    }

    // Commission payouts: every finished month is settled on the 1st of the next.
    const payouts = [];
    const curYm = U.ym(today);
    const firstYm = U.ym(U.addDays(today, -215));
    for (let ym = firstYm; ym < curYm; ym = U.addMonths(ym, 1)) {
      for (const st of staff) {
        const amt = appts.filter(a => a.staffId === st.id && a.status === 'done' && a.paid && U.ym(a.date) === ym)
          .reduce((s, a) => s + commissionOf(a, st) + a.tip, 0);
        if (amt > 0) payouts.push({ id: 'po' + payouts.length, staffId: st.id, date: U.addMonths(ym, 1) + '-01', amount: amt, note: 'ค่าคอมฯ & ทิป ' + U.thMonthS(ym) });
      }
    }
    // Head nail tech already received part of this month
    const half = appts.filter(a => a.staffId === 'st1' && a.status === 'done' && a.paid && U.ym(a.date) === curYm && a.date <= U.addDays(today, -7))
      .reduce((s, a) => s + commissionOf(a, staff[0]) + a.tip, 0);
    if (half > 0) payouts.push({ id: 'po' + payouts.length, staffId: 'st1', date: U.addDays(today, -6), amount: half, note: 'จ่ายรอบกลางเดือน' });

    // Other income / expenses
    const tx = [];
    const T = (date, desc, cat, type, amount, method, status) => tx.push({ id: 't' + tx.length, date, desc, cat, type, amount, method, status });
    for (let ym = firstYm; ym <= curYm; ym = U.addMonths(ym, 1)) {
      const cur = ym === curYm, clip = d => (d > today ? today : d);
      T(clip(ym + '-13'), 'ค่าเช่าร้าน', 'ค่าเช่า', 'out', 12000, 'โอน', cur ? 'pending' : 'paid');
      if (!cur || ym + '-25' <= today) T(ym + '-25', 'ค่าน้ำ-ค่าไฟ', 'ค่าน้ำ-ไฟ', 'out', r.int(28, 38) * 100, 'โอน', 'paid');
      const buys = r.int(2, 3);
      for (let i = 0; i < buys; i++) {
        const d = ym + '-' + U.pad(r.int(2, 27));
        if (d <= today) T(d, r.pick(['ซื้อสีเจลชุดใหม่', 'ซื้อวัสดุสิ้นเปลือง', 'อุปกรณ์ต่อเล็บ', 'สำลีและถุงมือ']), 'วัสดุ', 'out', r.int(12, 42) * 100, 'โอน', 'paid');
      }
      if (r() < 0.5) { const d = ym + '-08'; if (d <= today) T(d, 'โฆษณาออนไลน์', 'การตลาด', 'out', 1500, 'บัตร', 'paid'); }
      if (r() < 0.7) { const d = ym + '-' + U.pad(r.int(3, 26)); if (d <= today) T(d, 'ขายน้ำมันบำรุงเล็บ', 'ขายสินค้า', 'in', r.int(3, 9) * 100, 'เงินสด', 'paid'); }
    }
    T(today, 'สีเจลโทนนู้ด 6 ขวด', 'วัสดุ', 'out', 2400, 'โอน', 'paid');

    const products = [
      ['p1', 'สีเจลโทนนู้ด', 'GEL-NUD-01', 'สีเจล', 'ขวด', 2, 5, 400],
      ['p2', 'เจลต่อเล็บ', 'EXT-03', 'ต่อเล็บ', 'หลอด', 3, 4, 650],
      ['p3', 'ตะไบเล็บ', 'FIL-02', 'วัสดุ', 'แพ็ก', 0, 10, 120],
      ['p4', 'Top coat', 'TOP-01', 'สีเจล', 'ขวด', 8, 4, 350],
      ['p5', 'น้ำยาทำความสะอาด', 'CLN-01', 'น้ำยา', 'ขวด', 14, 6, 180],
      ['p6', 'Base coat', 'BASE-01', 'สีเจล', 'ขวด', 6, 4, 350],
      ['p7', 'สีเจลแดงเชอร์รี่', 'GEL-RED-02', 'สีเจล', 'ขวด', 7, 3, 400],
      ['p8', 'สำลีแผ่น', 'COT-01', 'วัสดุ', 'แพ็ก', 12, 5, 60],
      ['p9', 'ถุงมือไนไตรล์', 'GLV-01', 'วัสดุ', 'กล่อง', 5, 2, 220],
      ['p10', 'อะซิโตน (น้ำยาถอดเจล)', 'ACE-01', 'น้ำยา', 'ขวด', 4, 3, 150]
    ].map(([id, name, sku, cat, unit, qty, min, cost]) => ({ id, name, sku, cat, unit, qty, min, cost }));

    const movements = [
      { id: 'm1', date: ago(4), time: '15:10', productId: 'p8', type: 'out', qty: 3, by: 'น้องบีม', note: '' },
      { id: 'm2', date: ago(3), time: '09:30', productId: 'p4', type: 'in', qty: 6, by: 'พี่แพร', note: 'รับของจากซัพพลายเออร์' },
      { id: 'm3', date: ago(2), time: '11:20', productId: 'p3', type: 'out', qty: 10, by: 'น้องบีม', note: '' },
      { id: 'm4', date: ago(1), time: '16:40', productId: 'p1', type: 'out', qty: 3, by: 'น้องฝน', note: '' },
      { id: 'm5', date: today, time: '10:05', productId: 'p1', type: 'in', qty: 6, by: 'พี่แพร', note: '' },
      { id: 'm6', date: today, time: '12:15', productId: 'p1', type: 'out', qty: 6, by: 'น้องฝน', note: 'ใช้กับงานโปรโมชัน' }
    ];

    return {
      v: 1, seededOn: today, dirty: false,
      settings: { shop: 'Solva Nail Studio', goal: 150000 },
      users: {
        'owner@solva.demo': { pw: 'solva1234', name: 'เจ้าของร้าน', role: 'owner' },
        'manager': { pw: 'solva1234', name: 'ผู้จัดการร้าน', role: 'manager' }
      },
      services, staff, clients, appts, attendance, payouts, tx, products, movements
    };
  }

  // ------------------------------------------------------------------ pure helpers
  function apptSub(a) { return a.items.reduce((s, i) => s + i.p, 0); }
  function apptDisc(a) { return Math.round(apptSub(a) * (a.disc || 0) / 100); }
  function apptNet(a) { return apptSub(a) - apptDisc(a); }
  function apptEnd(a) { return U.toMin(a.time) + a.dur; }
  function isActive(a) { return a.status !== 'cancelled' && a.status !== 'noshow'; }
  function commissionOf(a, st) { return Math.round(apptNet(a) * st.rate / 100); }
  function apptStatus(a) {
    if (a.status === 'cancelled') return { k: 'cancelled', label: 'ยกเลิก', cls: 'nt' };
    if (a.status === 'noshow') return { k: 'noshow', label: 'ไม่มาตามนัด', cls: 's3' };
    if (a.status === 'done') return a.paid ? { k: 'paid', label: 'เสร็จสิ้น', cls: 's1' } : { k: 'unpaid', label: 'รอชำระเงิน', cls: 's2' };
    if (a.status === 'booked') return { k: 'booked', label: 'รอยืนยัน', cls: 's2' };
    return { k: 'confirmed', label: 'ยืนยันแล้ว', cls: 's1' };
  }
  function productStatus(p) {
    if (p.qty <= 0) return { k: 'out', label: 'หมด', cls: 's3' };
    if (p.qty <= p.min) return { k: 'low', label: 'ใกล้หมด', cls: 's2' };
    return { k: 'ok', label: 'ปกติ', cls: 's1' };
  }
  function tierInfo(points, tier) {
    const ti = TIERS.indexOf(tier);
    const next = ti >= 0 && ti < TIERS.length - 1 ? TIERS[ti + 1] : null;
    const pct = next ? Math.round((points - TIER_PTS[ti]) / (TIER_PTS[ti + 1] - TIER_PTS[ti]) * 100) : 100;
    // Highest tier the points qualify for
    let earned = null;
    TIERS.forEach((t, i) => { if (points >= TIER_PTS[i]) earned = t; });
    return { next, pct: U.clamp(pct, 0, 100), toNext: next ? Math.max(0, TIER_PTS[ti + 1] - points) : 0, earned };
  }

  // ------------------------------------------------------------------ store
  const listeners = [];
  const storage = (() => {
    try { const t = '__solva'; localStorage.setItem(t, t); localStorage.removeItem(t); return localStorage; } catch (e) { const m = {}; return { getItem: k => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: k => { delete m[k]; } }; }
  })();

  const store = {
    state: null,
    load() {
      const today = U.today();
      let s = null;
      try { s = JSON.parse(storage.getItem(KEY)); } catch (e) { s = null; }
      // Untouched demo data is re-seeded each day so "today" always has a schedule.
      if (!s || s.v !== 1 || (!s.dirty && s.seededOn !== today)) {
        const users = s && s.users;
        s = seed(today);
        if (users) s.users = Object.assign(s.users, users);
      }
      this.state = s;
      this.save();
      return s;
    },
    save() { try { storage.setItem(KEY, JSON.stringify(this.state)); } catch (e) { /* quota / private mode */ } },
    reset() { const users = this.state.users; this.state = seed(U.today()); this.state.users = users; this.save(); this.emit(); },
    update(fn) { fn(this.state); this.state.dirty = true; this.save(); this.emit(); },
    subscribe(fn) { listeners.push(fn); },
    emit() { listeners.forEach(fn => fn()); },
    exportJSON() { return JSON.stringify(this.state, null, 2); },
    importJSON(text) {
      const s = JSON.parse(text);
      if (!s || s.v !== 1 || !Array.isArray(s.appts)) throw new Error('bad file');
      this.state = s; s.dirty = true; this.save(); this.emit();
    },

    // ---- lookups
    client(id) { return this.state.clients.find(c => c.id === id); },
    staffById(id) { return this.state.staff.find(s => s.id === id); },
    appt(id) { return this.state.appts.find(a => a.id === id); },
    product(id) { return this.state.products.find(p => p.id === id); },

    apptsOn(date) {
      return this.state.appts.filter(a => a.date === date).sort((a, b) => a.time.localeCompare(b.time) || a.staffId.localeCompare(b.staffId));
    },

    // Double bookings for a day: pairs of active appointments of the same staff that overlap.
    overlaps(date) {
      const out = [];
      for (const st of this.state.staff) {
        const list = this.apptsOn(date).filter(a => a.staffId === st.id && isActive(a));
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const a = list[i], b = list[j];
            const mins = Math.min(apptEnd(a), apptEnd(b)) - Math.max(U.toMin(a.time), U.toMin(b.time));
            if (mins > 0) out.push({ staff: st, a, b, mins });
          }
        }
      }
      return out;
    },
    conflictsFor(date, staffId, time, dur, ignoreId) {
      const s = U.toMin(time), e = s + dur;
      return this.state.appts.filter(a => a.date === date && a.staffId === staffId && a.id !== ignoreId && isActive(a)
        && Math.min(e, apptEnd(a)) - Math.max(s, U.toMin(a.time)) > 0);
    },
    utilization(date, staffId) {
      const m = this.apptsOn(date).filter(a => a.staffId === staffId && isActive(a)).reduce((s, a) => s + a.dur, 0);
      return Math.round(m / DAY_MIN * 100);
    },
    dayLoad(date) {
      const staffN = Math.max(1, this.state.staff.length);
      const m = this.state.appts.filter(a => a.date === date && isActive(a)).reduce((s, a) => s + a.dur, 0);
      return m / (DAY_MIN * staffN);
    },

    clientStats(id) {
      const all = this.state.appts.filter(a => a.clientId === id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
      const done = all.filter(a => a.status === 'done');
      const spend = done.filter(a => a.paid).reduce((s, a) => s + apptNet(a), 0);
      const today = U.today();
      const counts = {};
      done.forEach(a => a.items.forEach(i => { counts[i.n] = (counts[i.n] || 0) + 1; }));
      const top = Object.entries(counts).filter(([n]) => !/^(Top coat|เตรียมหน้าเล็บ|ถอดสีเจลเดิม)$/.test(n))
        .sort((a, b) => b[1] - a[1]).slice(0, 4);
      return {
        all, done, visits: done.length, spend, points: Math.floor(spend / 10),
        last: done.length ? done[0].date : null,
        upcoming: all.filter(a => a.date >= today && (a.status === 'confirmed' || a.status === 'booked')).reverse(),
        unpaid: done.filter(a => !a.paid),
        top
      };
    },

    staffMonth(staffId, ym) {
      const st = this.staffById(staffId);
      const att = this.state.attendance.filter(x => x.staffId === staffId && U.ym(x.date) === ym).sort((a, b) => b.date.localeCompare(a.date));
      const hoursOf = x => (x.in && x.out) ? Math.max(0, Math.round((U.toMin(x.out) - U.toMin(x.in) - 60) / 30) / 2) : 0;
      const worked = att.filter(x => x.in);
      const hours = worked.reduce((s, x) => s + hoursOf(x), 0);
      const weeks = [0, 0, 0, 0, 0];
      worked.forEach(x => { weeks[Math.min(4, Math.floor((U.parse(x.date).getDate() - 1) / 7))] += hoursOf(x); });
      const done = this.state.appts.filter(a => a.staffId === staffId && a.status === 'done' && U.ym(a.date) === ym);
      const commission = done.reduce((s, a) => s + commissionOf(a, st), 0);
      const tips = done.reduce((s, a) => s + (a.tip || 0), 0);
      const paidOut = this.state.payouts.filter(p => p.staffId === staffId && U.ym(p.date) === ym).reduce((s, p) => s + p.amount, 0);
      return { att, hours, days: worked.length, weeks, hoursOf, done, commission, tips, paidOut };
    },
    staffPending(staffId) {
      const st = this.staffById(staffId);
      const earned = this.state.appts.filter(a => a.staffId === staffId && a.status === 'done')
        .reduce((s, a) => s + commissionOf(a, st) + (a.tip || 0), 0);
      const paid = this.state.payouts.filter(p => p.staffId === staffId).reduce((s, p) => s + p.amount, 0);
      return Math.max(0, earned - paid);
    },
    attendanceToday(staffId) {
      const t = U.today();
      return this.state.attendance.find(x => x.staffId === staffId && x.date === t) || null;
    },

    // uptoDay (optional) limits the month to days 1..uptoDay, for like-for-like comparisons.
    financeMonth(ym, uptoDay) {
      const inM = d => U.ym(d) === ym && (!uptoDay || Number(d.slice(8)) <= uptoDay);
      const appts = this.state.appts.filter(a => a.status === 'done' && a.paid && inM(a.date));
      const apptIncome = appts.reduce((s, a) => s + apptNet(a), 0);
      const tx = this.state.tx.filter(t => inM(t.date));
      const otherIncome = tx.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
      const txOut = tx.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);
      const commission = this.state.appts.filter(a => a.status === 'done' && inM(a.date))
        .reduce((s, a) => s + commissionOf(a, this.staffById(a.staffId) || { rate: 0 }), 0);
      const pendingOut = tx.filter(t => t.type === 'out' && t.status === 'pending').reduce((s, t) => s + t.amount, 0);
      const byCat = {};
      tx.filter(t => t.type === 'out').forEach(t => { byCat[t.cat] = (byCat[t.cat] || 0) + t.amount; });
      if (commission) byCat['ค่าคอมมิชชัน'] = commission;
      const income = apptIncome + otherIncome, expense = txOut + commission;
      return { appts, apptIncome, otherIncome, income, txOut, commission, expense, profit: income - expense, pendingOut, byCat };
    },

    // Combined ledger: paid appointments + manual transactions, newest first.
    ledger(ym) {
      const rows = this.state.appts.filter(a => a.status === 'done' && U.ym(a.date) === ym).map(a => ({
        id: a.id, src: 'appt', date: a.date, time: a.time, desc: (this.client(a.clientId) || {}).name || '—',
        cat: 'ค่าบริการ', type: 'in', amount: apptNet(a), method: a.paid ? a.pay : '—', status: a.paid ? 'paid' : 'pending'
      }));
      this.state.tx.filter(t => U.ym(t.date) === ym).forEach(t => rows.push(Object.assign({ src: 'tx', time: '' }, t)));
      return rows.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    },

    notifications() {
      const out = [], today = U.today(), now = U.nowMin();
      const next = this.apptsOn(today).find(a => (a.status === 'confirmed' || a.status === 'booked') && U.toMin(a.time) >= now);
      if (next) {
        const mins = U.toMin(next.time) - now;
        out.push({ text: 'คิว' + this.client(next.clientId).name + (mins <= 60 ? ' เริ่มในอีก ' + mins + ' นาที' : ' เวลา ' + next.time + ' น.'), cls: '', href: '#/schedule?sel=' + next.id });
      }
      const unpaid = this.state.appts.filter(a => a.status === 'done' && !a.paid);
      if (unpaid.length) out.push({ text: 'รอชำระเงิน ' + unpaid.length + ' รายการ', cls: 'rd', href: '#/schedule?sel=' + unpaid[0].id + '&date=' + unpaid[0].date });
      const ov = this.overlaps(today);
      if (ov.length) out.push({ text: 'คิวซ้อน ' + ov.length + ' รายการวันนี้', cls: 'rd', href: '#/schedule' });
      this.state.products.forEach(p => {
        const ps = productStatus(p);
        if (ps.k !== 'ok') out.push({ text: p.name + (ps.k === 'out' ? ' หมดสต็อก' : ' ใกล้หมด (เหลือ ' + p.qty + ' ' + p.unit + ')'), cls: ps.k === 'out' ? 'rd' : 'ye', href: '#/inventory' });
      });
      const pend = this.state.tx.filter(t => t.type === 'out' && t.status === 'pending');
      if (pend.length) out.push({ text: 'รายจ่ายค้างชำระ ' + pend.length + ' รายการ (' + U.fm(pend.reduce((s, t) => s + t.amount, 0)) + ')', cls: 'ye', href: '#/finance' });
      return out;
    }
  };

  S.store = store;
  S.K = { KEY, DAY_MIN, OPEN, CLOSE, TIERS, TIER_PTS, DISC, TIER_CLS, BENEFITS, PAY_METHODS, ATT, EXPENSE_CATS, INCOME_CATS };
  S.F = { seed, apptSub, apptDisc, apptNet, apptEnd, isActive, commissionOf, apptStatus, productStatus, tierInfo };
})(typeof window !== 'undefined' ? (window.Solva = window.Solva || {}) : (globalThis.Solva = globalThis.Solva || {}));
