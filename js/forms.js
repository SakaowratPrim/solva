// Shared create/edit dialogs used from several pages (dashboard quick actions,
// schedule, clients, finance, inventory). Each opens S.modal and writes to the store.
(function (S) {
  'use strict';
  const U = S.U, esc = U.esc, W = S.W, K = S.K, F = S.F;
  const st = () => S.store.state;

  const fld = (label, html, cls) => '<label class="fld' + (cls ? ' ' + cls : '') + '"><span>' + esc(label) + '</span>' + html + '</label>';
  const inp = (name, val, attrs) => '<input class="fi" name="' + name + '" value="' + esc(val == null ? '' : val) + '" ' + (attrs || '') + '>';
  const sel = (name, list, val, attrs) => '<select class="fi" name="' + name + '" ' + (attrs || '') + '>' + W.opts(list, val) + '</select>';
  const TIMES = (() => { const o = []; for (let m = K.OPEN; m < K.CLOSE; m += 15) o.push(U.fromMin(m)); return o; })();
  const PHONE = /^0\d{1,2}-?\d{3}-?\d{4}$/;
  const staffOpts = () => st().staff.map(x => [x.id, x.nick + ' · ' + x.role]);

  const Forms = {};

  // ------------------------------------------------------------------ appointment
  Forms.appointment = (o) => {
    o = o || {};
    const a = o.id ? S.store.appt(o.id) : null;
    const cur = a || { clientId: o.clientId || '', staffId: o.staffId || st().staff[0].id, date: o.date || U.today(), time: o.time || '10:00', items: [], status: 'confirmed', note: '' };
    const chosen = new Set(cur.items.map(i => i.n));
    const clients = st().clients.slice().sort((x, y) => x.name.localeCompare(y.name, 'th'));
    const body = '<div class="fg">'
      + fld('ลูกค้า', sel('clientId', [['', '— เลือกลูกค้า —']].concat(clients.map(c => [c.id, c.name + ' (' + c.nick + ')' + (c.tier ? ' · ' + c.tier : '')]), [['__new', '+ ลูกค้าใหม่']]), cur.clientId, 'autofocus'), 'full')
      + '<div class="full nc" style="display:none"><div class="fg">' + fld('ชื่อลูกค้าใหม่', inp('newName', '', 'placeholder="เช่น คุณสมใจ"')) + fld('เบอร์โทร', inp('newPhone', '', 'inputmode="tel" placeholder="08x-xxx-xxxx"')) + '</div></div>'
      + fld('ช่าง', sel('staffId', staffOpts(), cur.staffId))
      + fld('สถานะ', sel('status', [['confirmed', 'ยืนยันแล้ว'], ['booked', 'รอยืนยัน']], cur.status === 'booked' ? 'booked' : 'confirmed'))
      + fld('วันที่', inp('date', cur.date, 'type="date"'))
      + fld('เวลาเริ่ม', sel('time', TIMES, cur.time))
      + '<div class="full"><div class="fld"><span>บริการ</span></div><div class="chk">'
      + st().services.map(s => '<label><input type="checkbox" name="svc[]" value="' + s.id + '"' + (chosen.has(s.name) ? ' checked' : '') + '>' + esc(s.name) + '<b>' + U.fm(s.price) + '</b></label>').join('')
      + '</div></div>'
      + fld('โน้ต (ถ้ามี)', '<textarea class="fi" name="note" rows="2">' + esc(cur.note || '') + '</textarea>', 'full')
      + '</div><div class="sumbox"><div><div class="sum-d">เลือกบริการเพื่อคำนวณราคา</div><small class="sum-w rd"></small></div><b class="sum-t">฿0</b></div>';

    const calc = form => {
      const d = S.formData(form);
      form.querySelector('.nc').style.display = d.clientId === '__new' ? '' : 'none';
      const svcs = st().services.filter(s => (d.svc || []).includes(s.id));
      const sub = svcs.reduce((s, x) => s + x.price, 0), dur = svcs.reduce((s, x) => s + x.dur, 0);
      const c = S.store.client(d.clientId), pct = c ? (K.DISC[c.tier] || 0) : 0;
      const net = sub - Math.round(sub * pct / 100);
      form.querySelector('.sum-t').textContent = U.fm(net);
      form.querySelector('.sum-d').textContent = svcs.length ? dur + ' นาที · ' + U.fromMin(U.toMin(d.time)) + '–' + U.fromMin(U.toMin(d.time) + dur) + (pct ? ' · ส่วนลดสมาชิก ' + pct + '%' : '') : 'เลือกบริการเพื่อคำนวณราคา';
      const cf = svcs.length ? S.store.conflictsFor(d.date, d.staffId, d.time, dur, a && a.id) : [];
      const late = svcs.length && U.toMin(d.time) + dur > K.CLOSE;
      form.querySelector('.sum-w').textContent = cf.length ? '⚠ ทับกับคิว ' + cf.map(x => x.time + ' ' + S.store.client(x.clientId).name).join(', ') : late ? '⚠ เลยเวลาปิดร้าน 19:00' : '';
      form.dataset.confirmed = '';
    };

    S.modal({
      title: a ? 'แก้ไขนัดหมาย' : 'เพิ่มนัดหมาย', wide: true, body, submitLabel: a ? 'บันทึกการแก้ไข' : 'บันทึกนัดหมาย',
      input: (form) => calc(form),
      submit(d, form) {
        let clientId = d.clientId;
        if (!clientId) return 'กรุณาเลือกลูกค้า';
        if (clientId === '__new') {
          if (d.newName.length < 2) return 'กรุณากรอกชื่อลูกค้าใหม่';
          if (d.newPhone && !PHONE.test(d.newPhone)) return 'รูปแบบเบอร์โทรไม่ถูกต้อง';
        }
        if (!d.date) return 'กรุณาเลือกวันที่';
        const svcs = st().services.filter(s => (d.svc || []).includes(s.id));
        if (!svcs.length) return 'กรุณาเลือกบริการอย่างน้อย 1 รายการ';
        const dur = svcs.reduce((s, x) => s + x.dur, 0);
        const cf = S.store.conflictsFor(d.date, d.staffId, d.time, dur, a && a.id);
        if (cf.length && form.dataset.confirmed !== '1') {
          form.dataset.confirmed = '1';
          return 'คิวนี้ทับกับนัดหมายเดิมของช่าง (' + cf.map(x => x.time).join(', ') + ') — กดบันทึกอีกครั้งเพื่อยืนยัน';
        }
        let newId = null;
        S.store.update(s => {
          if (clientId === '__new') {
            clientId = U.uid('c');
            s.clients.push({ id: clientId, name: /^คุณ/.test(d.newName) ? d.newName : 'คุณ' + d.newName, nick: d.newName.replace(/^คุณ/, '').split(' ')[0], phone: d.newPhone || '', tier: null, bd: '', reg: U.today(), line: '', notes: [], memSince: null, memExp: null });
          }
          const c = s.clients.find(x => x.id === clientId);
          const data = { clientId, staffId: d.staffId, date: d.date, time: d.time, items: svcs.map(x => ({ n: x.name, p: x.price })), dur, note: d.note };
          if (a) {
            const t = s.appts.find(x => x.id === a.id);
            Object.assign(t, data);
            if (t.status === 'booked' || t.status === 'confirmed') t.status = d.status;
            if (!t.paid) t.disc = K.DISC[c.tier] || 0;
            newId = t.id;
          } else {
            newId = U.uid('a');
            s.appts.push(Object.assign({ id: newId, status: d.status, disc: K.DISC[c.tier] || 0, paid: false, pay: '', tip: 0 }, data));
          }
        });
        S.toast(a ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มนัดหมายเรียบร้อย');
        if (o.after) o.after(newId, d.date);
      }
    });
    setTimeout(() => { const f = document.querySelector('.md'); if (f) calc(f); }, 0);
  };

  // ------------------------------------------------------------------ payment
  Forms.payment = (id) => {
    const a = S.store.appt(id);
    if (!a) return;
    const c = S.store.client(a.clientId);
    S.modal({
      title: 'รับชำระเงิน · ' + c.name,
      body: '<div class="sumbox" style="margin-top:4px"><span>ยอดสุทธิ' + (a.disc ? ' (ส่วนลด ' + a.disc + '%)' : '') + '</span><b>' + U.fm(F.apptNet(a)) + '</b></div>'
        + '<div class="fld"><span>วิธีชำระเงิน</span></div><div class="chk">' + K.PAY_METHODS.map((m, i) => '<label><input type="radio" name="pay" value="' + esc(m) + '"' + (i === 1 ? ' checked' : '') + '>' + esc(m) + '</label>').join('') + '</div>'
        + fld('ทิปให้ช่าง ' + S.store.staffById(a.staffId).nick + ' (บาท)', inp('tip', '0', 'type="number" min="0" step="10" inputmode="numeric"')),
      submitLabel: 'ยืนยันการชำระ',
      submit(d) {
        const tip = Number(d.tip || 0);
        if (!(tip >= 0)) return 'จำนวนทิปไม่ถูกต้อง';
        S.store.update(s => { const t = s.appts.find(x => x.id === id); t.status = 'done'; t.paid = true; t.pay = d.pay; t.tip = Math.round(tip); });
        S.toast('รับชำระเงินเรียบร้อย ✓');
      }
    });
  };

  // ------------------------------------------------------------------ client
  Forms.client = (id, after) => {
    const c = id ? S.store.client(id) : { name: '', nick: '', phone: '', bd: '', line: '', tier: '' };
    S.modal({
      title: id ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่',
      body: '<div class="fg">'
        + fld('ชื่อ-นามสกุล', inp('name', c.name, 'autofocus placeholder="เช่น คุณสมใจ รักสวย"'), 'full')
        + fld('ชื่อเล่น', inp('nick', c.nick)) + fld('เบอร์โทรศัพท์', inp('phone', c.phone, 'inputmode="tel" placeholder="08x-xxx-xxxx"'))
        + fld('วันเกิด', inp('bd', c.bd, 'type="date"')) + fld('Line ID', inp('line', c.line, 'placeholder="@line"'))
        + (id ? '' : fld('ระดับสมาชิก', sel('tier', [['', 'Non-member']].concat(K.TIERS.map(t => [t, t])), c.tier || ''), 'full'))
        + '</div>',
      submit(d) {
        if (d.name.length < 2) return 'กรุณากรอกชื่อลูกค้า';
        if (d.phone && !PHONE.test(d.phone)) return 'รูปแบบเบอร์โทรไม่ถูกต้อง (เช่น 081-234-5678)';
        if (d.phone && st().clients.some(x => x.phone.replace(/-/g, '') === d.phone.replace(/-/g, '') && x.id !== id)) return 'เบอร์นี้มีลูกค้าในระบบแล้ว';
        let nid = id;
        const name = /^คุณ/.test(d.name) ? d.name : 'คุณ' + d.name;
        S.store.update(s => {
          if (id) Object.assign(s.clients.find(x => x.id === id), { name, nick: d.nick || name.replace(/^คุณ/, ''), phone: d.phone, bd: d.bd, line: d.line });
          else {
            nid = U.uid('c');
            const t = d.tier || null;
            s.clients.push({ id: nid, name, nick: d.nick || name.replace(/^คุณ/, '').split(' ')[0], phone: d.phone, bd: d.bd, line: d.line, tier: t, reg: U.today(), notes: [], memSince: t ? U.today() : null, memExp: t ? U.addDays(U.today(), 365) : null });
          }
        });
        S.toast(id ? 'บันทึกข้อมูลลูกค้าแล้ว' : 'เพิ่มลูกค้าเรียบร้อย');
        if (after) after(nid);
      }
    });
  };

  // ------------------------------------------------------------------ staff
  Forms.staff = (id, after) => {
    const x = id ? S.store.staffById(id) : { nick: '', full: '', role: 'ช่างเล็บ', phone: '', start: U.today(), rate: 15, main: [], sec: [] };
    S.modal({
      title: id ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงาน',
      body: '<div class="fg">'
        + fld('ชื่อเล่น (แสดงในระบบ)', inp('nick', x.nick, 'autofocus placeholder="เช่น น้องมิ้นท์"')) + fld('ชื่อ-นามสกุล', inp('full', x.full))
        + fld('ตำแหน่ง', sel('role', ['หัวหน้าช่าง', 'ช่างเล็บ', 'ผู้ช่วยช่าง', 'พนักงานต้อนรับ'], x.role)) + fld('เบอร์ติดต่อ', inp('phone', x.phone, 'inputmode="tel"'))
        + fld('วันที่เริ่มงาน', inp('start', x.start, 'type="date"')) + fld('อัตราค่าคอมมิชชัน (%)', inp('rate', x.rate, 'type="number" min="0" max="60"'))
        + fld('ทักษะหลัก (คั่นด้วย ,)', inp('main', x.main.join(', ')), 'full') + fld('ทักษะรอง (คั่นด้วย ,)', inp('sec', x.sec.join(', ')), 'full')
        + '</div>',
      submit(d) {
        if (d.nick.length < 2) return 'กรุณากรอกชื่อเล่น';
        if (!d.full) return 'กรุณากรอกชื่อ-นามสกุล';
        if (d.phone && !PHONE.test(d.phone)) return 'รูปแบบเบอร์โทรไม่ถูกต้อง';
        const rate = Number(d.rate);
        if (!(rate >= 0 && rate <= 60)) return 'อัตราค่าคอมต้องอยู่ระหว่าง 0–60%';
        const list = v => v.split(',').map(t => t.trim()).filter(Boolean);
        let nid = id;
        S.store.update(s => {
          const data = { nick: d.nick, full: d.full, role: d.role, phone: d.phone, start: d.start || U.today(), rate, main: list(d.main), sec: list(d.sec) };
          if (id) Object.assign(s.staff.find(t => t.id === id), data);
          else { nid = U.uid('st'); s.staff.push(Object.assign({ id: nid, off: -1 }, data)); }
        });
        S.toast(id ? 'บันทึกข้อมูลพนักงานแล้ว' : 'เพิ่มพนักงานเรียบร้อย');
        if (after) after(nid);
      }
    });
  };

  // ------------------------------------------------------------------ income / expense
  Forms.tx = (type, id) => {
    const t = id ? st().tx.find(x => x.id === id) : { date: U.today(), desc: '', cat: type === 'in' ? K.INCOME_CATS[0] : K.EXPENSE_CATS[0], amount: '', method: 'โอน', status: 'paid' };
    type = id ? t.type : type;
    S.modal({
      title: (id ? 'แก้ไข' : 'บันทึก') + (type === 'in' ? 'รายรับ' : 'รายจ่าย'),
      footLeft: id ? '<button type="button" class="bt rd" style="margin-right:auto" data-act="delTx" data-arg="' + esc(id) + '">ลบรายการ</button>' : '',
      body: '<div class="fg">'
        + fld('รายละเอียด', inp('desc', t.desc, 'autofocus placeholder="' + (type === 'in' ? 'เช่น ขายน้ำมันบำรุงเล็บ' : 'เช่น ซื้อสีเจล 6 ขวด') + '"'), 'full')
        + fld('จำนวนเงิน (บาท)', inp('amount', t.amount, 'type="number" min="1" inputmode="numeric"')) + fld('วันที่', inp('date', t.date, 'type="date"'))
        + fld('หมวด', sel('cat', type === 'in' ? K.INCOME_CATS : K.EXPENSE_CATS, t.cat)) + fld('ช่องทาง', sel('method', ['เงินสด', 'โอน', 'บัตร'], t.method))
        + fld('สถานะ', sel('status', [['paid', 'ชำระแล้ว'], ['pending', 'รอชำระ']], t.status), 'full')
        + '</div>',
      submit(d) {
        if (d.desc.length < 2) return 'กรุณากรอกรายละเอียด';
        const amount = Math.round(Number(d.amount));
        if (!(amount > 0)) return 'กรุณากรอกจำนวนเงินมากกว่า 0';
        if (!d.date) return 'กรุณาเลือกวันที่';
        S.store.update(s => {
          const data = { date: d.date, desc: d.desc, cat: d.cat, type, amount, method: d.method, status: d.status };
          if (id) Object.assign(s.tx.find(x => x.id === id), data); else s.tx.push(Object.assign({ id: U.uid('t') }, data));
        });
        S.toast(type === 'in' ? 'บันทึกรายรับแล้ว' : 'บันทึกรายจ่ายแล้ว');
      }
    });
  };

  // ------------------------------------------------------------------ product
  Forms.product = (id) => {
    const p = id ? S.store.product(id) : { name: '', sku: '', cat: 'สีเจล', unit: 'ขวด', qty: 0, min: 3, cost: 0 };
    const cats = Array.from(new Set(st().products.map(x => x.cat)));
    S.modal({
      title: id ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า',
      body: '<datalist id="cats">' + cats.map(c => '<option value="' + esc(c) + '">').join('') + '</datalist><div class="fg">'
        + fld('ชื่อสินค้า', inp('name', p.name, 'autofocus'), 'full')
        + fld('SKU', inp('sku', p.sku, 'placeholder="เช่น GEL-PNK-03"')) + fld('หมวด', inp('cat', p.cat, 'list="cats"'))
        + fld('หน่วย', inp('unit', p.unit)) + fld('ต้นทุนต่อหน่วย (บาท)', inp('cost', p.cost, 'type="number" min="0"'))
        + (id ? '' : fld('จำนวนเริ่มต้น', inp('qty', p.qty, 'type="number" min="0"'))) + fld('จุดสั่งซื้อขั้นต่ำ', inp('min', p.min, 'type="number" min="0"'))
        + '</div>',
      submit(d) {
        if (d.name.length < 2) return 'กรุณากรอกชื่อสินค้า';
        if (!d.sku) return 'กรุณากรอก SKU';
        if (st().products.some(x => x.sku.toLowerCase() === d.sku.toLowerCase() && x.id !== id)) return 'SKU นี้มีอยู่แล้ว';
        const n = v => Math.max(0, Math.round(Number(v) || 0));
        S.store.update(s => {
          const data = { name: d.name, sku: d.sku.toUpperCase(), cat: d.cat || 'อื่น ๆ', unit: d.unit || 'ชิ้น', min: n(d.min), cost: n(d.cost) };
          if (id) Object.assign(s.products.find(x => x.id === id), data);
          else s.products.push(Object.assign({ id: U.uid('p'), qty: n(d.qty) }, data));
        });
        S.toast(id ? 'บันทึกสินค้าแล้ว' : 'เพิ่มสินค้าเรียบร้อย');
      }
    });
  };

  // ------------------------------------------------------------------ stock in / out
  Forms.move = (productId, type) => {
    const ps = st().products;
    const user = S.auth.user() || {};
    const by = [[user.name || 'เจ้าของร้าน', user.name || 'เจ้าของร้าน']].concat(st().staff.map(x => [x.nick, x.nick]));
    S.modal({
      title: 'บันทึกสต็อกเข้า–ออก',
      body: '<div class="fg">'
        + fld('สินค้า', sel('productId', ps.map(p => [p.id, p.name + ' (คงเหลือ ' + p.qty + ' ' + p.unit + ')']), productId || ps[0].id), 'full')
        + '<div class="full"><div class="fld"><span>ประเภท</span></div><div class="chk"><label><input type="radio" name="type" value="in"' + (type !== 'out' ? ' checked' : '') + '>รับเข้า</label><label><input type="radio" name="type" value="out"' + (type === 'out' ? ' checked' : '') + '>เบิกออก</label></div></div>'
        + fld('จำนวน', inp('qty', '1', 'type="number" min="1" inputmode="numeric" autofocus')) + fld('ผู้บันทึก', sel('by', by, by[0][0]))
        + fld('หมายเหตุ', inp('note', '', 'placeholder="ไม่บังคับ"'), 'full')
        + '<label class="fld full exp"><span><input type="checkbox" name="expense" checked> บันทึกเป็นรายจ่ายค่าวัสดุอัตโนมัติ (ตามต้นทุนต่อหน่วย)</span></label>'
        + '</div>',
      input(form) { form.querySelector('.exp').style.display = S.formData(form).type === 'in' ? '' : 'none'; },
      submit(d) {
        const qty = Math.round(Number(d.qty));
        if (!(qty > 0)) return 'กรุณากรอกจำนวนมากกว่า 0';
        const p = S.store.product(d.productId);
        if (d.type === 'out' && qty > p.qty) return 'สต็อกไม่พอ (คงเหลือ ' + p.qty + ' ' + p.unit + ')';
        S.store.update(s => {
          const t = s.products.find(x => x.id === p.id);
          t.qty += d.type === 'in' ? qty : -qty;
          s.movements.push({ id: U.uid('m'), date: U.today(), time: U.nowHM(), productId: p.id, type: d.type, qty, by: d.by, note: d.note });
          if (d.type === 'in' && d.expense && p.cost > 0) s.tx.push({ id: U.uid('t'), date: U.today(), desc: p.name + ' ' + qty + ' ' + p.unit, cat: 'วัสดุ', type: 'out', amount: p.cost * qty, method: 'โอน', status: 'paid' });
        });
        S.toast(d.type === 'in' ? 'รับเข้า ' + p.name + ' ' + qty + ' ' + p.unit : 'เบิกออก ' + p.name + ' ' + qty + ' ' + p.unit);
      }
    });
    setTimeout(() => { const f = document.querySelector('.md'); if (f && type === 'out') f.querySelector('.exp').style.display = 'none'; }, 0);
  };

  S.Forms = Forms;
})(window.Solva = window.Solva || {});
