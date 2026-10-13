// ตารางนัด — day schedule with week strip, filters, double-booking warnings,
// appointment detail/bill, status changes, payment and PNG export.
(function (S) {
  'use strict';
  const U = S.U, W = S.W, F = S.F, esc = U.esc;
  const STATUS_F = [['all', 'ทุกสถานะ'], ['waiting', 'รอให้บริการ'], ['unpaid', 'รอชำระเงิน'], ['done', 'เสร็จสิ้น'], ['cancelled', 'ยกเลิก / ไม่มา']];
  const matchStatus = (a, f) => {
    if (f === 'all') return true;
    if (f === 'waiting') return a.status === 'confirmed' || a.status === 'booked';
    if (f === 'unpaid') return a.status === 'done' && !a.paid;
    if (f === 'done') return a.status === 'done';
    return !F.isActive(a);
  };

  function billSpec(a) {
    const store = S.store, c = store.client(a.clientId), sub = F.apptSub(a), disc = F.apptDisc(a);
    const no = 'INV-' + a.date.replace(/-/g, '') + '-' + String(a.id).replace(/\D/g, '').slice(-4).padStart(4, '0');
    return {
      no, spec: {
        w: 560, shop: store.state.settings.shop, title: 'ใบเสร็จค่าบริการ',
        info: [['เลขที่บิล', no], ['วันที่/เวลา', U.thDate(a.date) + ' · ' + a.time + ' น.'], ['ลูกค้า', c.name + ' (' + c.nick + ')'], ['ระดับสมาชิก', c.tier ? 'สมาชิก ' + c.tier : 'Non-member'], ['พนักงานผู้ให้บริการ', store.staffById(a.staffId).nick]],
        cols: [{ w: 0.72, al: 'l' }, { w: 0.28, al: 'r' }], head: ['รายการบริการ', 'ราคา'],
        rows: a.items.map(i => [i.n, U.fm(i.p)]),
        sum: [{ k: 'รวมก่อนหักส่วนลด', v: U.fm(sub) }].concat(a.disc ? [{ k: 'ส่วนลดสมาชิก ' + a.disc + '%', v: '−' + U.fm(disc) }] : [{ k: 'ส่วนลดสมาชิก', v: '—' }], [{ k: 'ยอดสุทธิที่ต้องชำระ', v: U.fm(sub - disc), big: 1 }]),
        pay: [['วิธีชำระเงิน', a.pay || 'ยังไม่ระบุ'], ['สถานะการชำระเงิน', a.paid ? 'ชำระแล้ว' : 'รอชำระ', a.paid ? ['#CDEFD9', '#1F7A4D'] : ['#FBE8A6', '#8A6500']]].concat(a.tip ? [['ทิปให้ช่าง', U.fm(a.tip)]] : []),
        notes: c.notes.length ? ['โน้ตลูกค้า: ' + c.notes.join(', ')] : [], foot: ['ขอบคุณที่ใช้บริการ', 'จัดทำโดยระบบ Solva']
      }
    };
  }

  function daySpec(date, list) {
    const store = S.store;
    const color = { s1: ['#CDEFD9', '#1F7A4D'], s2: ['#FBE8A6', '#8A6500'], s3: ['#F7B3B8', '#8C1D18'], nt: ['#E4E4E4', '#4A4C5A'] };
    const net = list.filter(a => a.status === 'done').reduce((t, a) => t + F.apptNet(a), 0);
    return {
      w: 760, shop: store.state.settings.shop, title: 'ตารางนัดหมาย ' + U.thLong(date),
      info: [['จำนวนนัดหมาย', list.filter(F.isActive).length + ' คิว'], ['พิมพ์เมื่อ', U.thDate(U.today()) + ' ' + U.nowHM() + ' น.']],
      cols: [{ w: 0.14, al: 'l' }, { w: 0.26, al: 'l' }, { w: 0.3, al: 'l' }, { w: 0.13, al: 'l' }, { w: 0.17, al: 'c' }],
      head: ['เวลา', 'ลูกค้า', 'บริการ', 'ช่าง', 'สถานะ'],
      rows: list.map(a => { const s = F.apptStatus(a); return [a.time + '–' + U.fromMin(F.apptEnd(a)), store.client(a.clientId).name, a.items.map(i => i.n).join(', '), store.staffById(a.staffId).nick, { t: s.label, chip: color[s.cls] }]; }),
      sum: [{ k: 'รายได้จากงานที่เสร็จแล้ว', v: U.fm(net) }], foot: ['จัดทำโดยระบบ Solva']
    };
  }

  const page = {
    init: () => ({ date: U.today(), staff: 'all', status: 'all', sel: null }),
    enter(p) {
      const s = S.pageState('schedule', page.init);
      if (p.date) s.date = p.date;
      if (p.sel) { s.sel = p.sel; const a = S.store.appt(p.sel); if (a) s.date = a.date; }
      if (p.status) s.status = p.status;
      if (!p.date && !p.sel && !p.status) { s.date = U.today(); }
    },
    render(s) {
      const store = S.store, today = U.today();
      const all = store.apptsOn(s.date);
      const list = all.filter(a => (s.staff === 'all' || a.staffId === s.staff) && matchStatus(a, s.status));
      const active = all.filter(F.isActive);
      const ov = store.overlaps(s.date);
      const isToday = s.date === today;
      const dayWord = isToday ? 'วันนี้' : U.thShort(s.date);

      // week strip (Sun–Sat around the selected date)
      const wd = U.parse(s.date).getDay(), sun = U.addDays(s.date, -wd);
      let week = '<button class="nv" data-act="week" data-arg="-7" aria-label="สัปดาห์ก่อน">‹</button>';
      for (let i = 0; i < 7; i++) {
        const d = U.addDays(sun, i), n = store.apptsOn(d).filter(F.isActive).length;
        week += '<button class="d ' + (d === s.date ? 'sl ' : n ? 'p ' : '') + (d === today ? 'td' : '') + '" data-act="day" data-arg="' + d + '" aria-label="' + U.thDate(d) + ' ' + n + ' นัด"><small>' + U.DAYS_S[i] + '</small><b>' + U.parse(d).getDate() + '</b></button>';
      }
      week += '<button class="nv" data-act="week" data-arg="7" aria-label="สัปดาห์ถัดไป">›</button>';

      // grouped by start time, with free staff for that slot
      const times = Array.from(new Set(list.map(a => a.time))).sort();
      const staffShown = store.state.staff.filter(x => s.staff === 'all' || x.id === s.staff);
      let groups = '';
      times.forEach(t => {
        const rows = list.filter(a => a.time === t);
        groups += '<div class="tm">' + t.replace(':', '.') + ' น.</div>' + rows.map(a => {
          const st = F.apptStatus(a), c = store.client(a.clientId);
          return '<div class="sr ' + (s.sel === a.id ? 'on' : '') + '" data-key="' + a.id + '"><div class="av rg">' + S.I.user + '</div><div class="x"><button class="nb" data-act="pick" data-arg="' + a.id + '">' + esc(store.staffById(a.staffId).nick) + '</button><small>' + esc(c.name) + ' · ' + esc(a.items.map(i => i.n).filter(n => !/^(Top coat|เตรียมหน้าเล็บ|ถอดสีเจลเดิม)$/.test(n)).join(', ') || a.items[0].n) + ' · ' + a.time + '–' + U.fromMin(F.apptEnd(a)) + '</small></div>' + W.chip(st.label, st.cls) + '</div>';
        }).join('');
        if (s.status === 'all') {
          const m = U.toMin(t);
          staffShown.filter(x => !store.state.appts.some(a => a.date === s.date && a.staffId === x.id && F.isActive(a) && U.toMin(a.time) <= m && F.apptEnd(a) > m))
            .forEach(x => { groups += '<div class="sr fr"><div class="av">' + S.I.user + '</div><div class="x"><b>' + esc(x.nick) + '</b><small>' + esc(x.role) + ' · ว่าง</small></div><button class="ch" data-act="newAt" data-arg="' + x.id + '|' + t + '">+ จองคิว</button></div>'; });
        }
      });

      // detail ticket
      const a = s.sel && store.appt(s.sel);
      let tk;
      if (!a || a.date !== s.date) tk = W.empty('เลือกนัดหมายจากรายการเพื่อดูรายละเอียดและบิล');
      else {
        const c = store.client(a.clientId), st = F.apptStatus(a), sub = F.apptSub(a), disc = F.apptDisc(a);
        const mem = c.tier ? 'สมาชิก ' + c.tier : 'Non-member', no = !F.isActive(a);
        let acts = '';
        if (a.status === 'booked') acts += '<button class="bt" data-act="setStatus" data-arg="confirmed">ยืนยันนัด</button>';
        if (a.status === 'booked' || a.status === 'confirmed') acts += '<button class="bt" data-act="setStatus" data-arg="done">ให้บริการเสร็จ</button><button class="bt o" data-act="edit">แก้ไข</button><button class="bt d" data-act="setStatus" data-arg="noshow">ไม่มาตามนัด</button><button class="bt d" data-act="setStatus" data-arg="cancelled">ยกเลิก</button>';
        if (a.status === 'done' && !a.paid) acts += '<button class="bt" data-act="pay">รับชำระเงิน</button>';
        if (a.status === 'done') acts += '<button class="bt o" data-act="bill">บันทึกบิลเป็น PNG</button>';
        if (no) acts += '<button class="bt o" data-act="setStatus" data-arg="confirmed">กู้คืนนัดหมาย</button><button class="bt rd" data-act="del">ลบนัดหมาย</button>';
        acts += '<a class="bt o" href="#/clients?sel=' + c.id + '">ดูโปรไฟล์ลูกค้า</a>';
        tk = '<h1 style="font-size:30px;margin:0">' + esc(c.name) + '</h1><div class="sub">(' + esc(c.nick) + ') · ' + U.thDate(a.date) + ' · ' + a.time + '–' + U.fromMin(F.apptEnd(a)) + ' น. · ช่าง ' + esc(store.staffById(a.staffId).nick) + '</div>'
          + '<div style="font-weight:600;color:#6B6D7A;margin:6px 0">' + mem + (c.phone ? ' · ' + esc(c.phone) : '') + '</div><div style="border-top:2px solid #D9D9D9;margin:14px 0"></div>'
          + '<h2>โน้ต</h2>' + (c.notes.length || a.note ? '<div class="row">' + c.notes.map(n => W.chip(n, 'nt')).join('') + (a.note ? W.chip('นัดนี้: ' + a.note, '') : '') + '</div>' : '<p class="sub" style="margin:0 0 14px">ไม่มีโน้ต</p>')
          + '<h2>รายการ</h2><div class="rc h"><span>บริการ</span><span>ราคา</span></div>' + a.items.map(i => '<div class="rc"><span>' + esc(i.n) + '</span><span>' + U.fm(i.p) + '</span></div>').join('')
          + '<div class="rc"><span>รวมก่อนหักส่วนลด</span><span>' + U.fm(sub) + '</span></div>'
          + (a.disc ? '<div class="rc"><span>ส่วนลด ' + mem + ' ' + a.disc + '%</span><span>−' + U.fm(disc) + '</span></div>' : '')
          + '<div class="dv"></div><div class="tot"><span>ยอดสุทธิ</span><b>' + (no ? '—' : U.fm(sub - disc)) + '</b></div>'
          + W.kv('วิธีชำระ', esc(a.pay || 'ยังไม่ระบุ')) + (a.tip ? W.kv('ทิปให้ช่าง', U.fm(a.tip)) : '') + '<div class="kv"><span>สถานะ</span>' + W.chip(st.label, st.cls) + '</div>'
          + '<div class="acts">' + acts + '</div>';
      }

      const util = store.state.staff.map(x => { const u = store.utilization(s.date, x.id); return '<div class="ut"><span>' + esc(x.nick) + '</span><div class="bar' + (u > 100 ? ' hot' : '') + '"><i style="width:' + Math.min(100, u) + '%"></i></div><b>' + u + '%</b></div>'; }).join('');

      return W.hero({
        title: dayWord + ' ' + W.cn(active.length) + ' นัดหมาย',
        sub: ov.length ? 'คิวซ้อน ' + ov.length + ' รายการ ควรตรวจสอบก่อนเริ่มงาน' : (active.length ? 'ไม่มีคิวซ้อน · พร้อมให้บริการ' : 'ยังไม่มีนัดหมาย จองคิวแรกได้เลย'),
        btn: ov.length ? { label: 'ดูคิวซ้อน', act: 'pickOverlap' } : { label: '+ เพิ่มนัดหมาย', act: 'newAppt' }, art: 'clock'
      })
        + '<h1>ตารางนัดหมาย' + (isToday ? 'วันนี้' : ' · ' + U.thLong(s.date)) + '</h1>'
        + '<div class="row"><select class="fi" style="width:auto;min-width:170px" data-ch="fStaff" aria-label="กรองตามพนักงาน">' + W.opts([['all', 'ทุกพนักงาน']].concat(store.state.staff.map(x => [x.id, x.nick])), s.staff) + '</select>'
        + '<select class="fi" style="width:auto;min-width:170px" data-ch="fStatus" aria-label="กรองตามสถานะ">' + W.opts(STATUS_F, s.status) + '</select>'
        + '<input class="fi" type="date" style="width:auto" value="' + s.date + '" data-ch="fDate" aria-label="เลือกวันที่">'
        + (isToday ? '' : '<button class="bt o" data-act="day" data-arg="' + today + '">วันนี้</button>')
        + '<button class="bt" style="margin-left:auto" data-act="newAppt">+ เพิ่มนัดหมาย</button><button class="bt d" data-act="dayPng">บันทึกเป็น PNG</button></div>'
        + ov.map(o => '<div class="wn">⚠ คิวซ้อน: ' + esc(o.staff.nick) + ' ' + o.b.time + ' (' + esc(store.client(o.b.clientId).name) + ') ทับกับงาน ' + o.a.time + ' (' + esc(store.client(o.a.clientId).name) + ') ' + o.mins + ' นาที · <a href="#/schedule?sel=' + o.b.id + '">แก้ไข</a></div>').join('')
        + '<div class="c rs" style="margin-bottom:22px;--i:2"><h2>การใช้เวลาของช่าง' + (isToday ? 'วันนี้' : '') + '</h2>' + util + '</div>'
        + '<div class="lay"><div class="l1"><div class="c wk">' + week + '</div>'
        + (list.length ? groups : W.empty(all.length ? 'ไม่มีนัดหมายที่ตรงกับตัวกรอง<br><button class="bt o" style="margin-top:12px" data-act="clearF">ล้างตัวกรอง</button>' : 'ยังไม่มีนัดหมายในวันนี้<br><button class="bt" style="margin-top:12px" data-act="newAppt">+ เพิ่มนัดหมาย</button>'))
        + '</div><div class="c tk l2 sticky">' + tk + '</div></div>'
        + '<button class="fab" aria-label="เพิ่มนัดหมาย" data-act="newAppt">' + S.I.plus + '</button>';
    },
    actions: {
      day(el) { const s = S.pageState('schedule', page.init); s.date = el.dataset.arg; s.sel = null; S.render(); },
      week(el) { const s = S.pageState('schedule', page.init); s.date = U.addDays(s.date, Number(el.dataset.arg)); s.sel = null; S.render(); },
      fDate(el) { if (!el.value) return; const s = S.pageState('schedule', page.init); s.date = el.value; s.sel = null; S.render(); },
      fStaff(el) { S.pageState('schedule', page.init).staff = el.value; S.render(); },
      fStatus(el) { S.pageState('schedule', page.init).status = el.value; S.render(); },
      clearF() { Object.assign(S.pageState('schedule', page.init), { staff: 'all', status: 'all' }); S.render(); },
      pick(el) { const s = S.pageState('schedule', page.init); s.sel = el.dataset.arg; S.render(); },
      pickOverlap() {
        const s = S.pageState('schedule', page.init), o = S.store.overlaps(s.date)[0];
        if (o) { s.sel = o.b.id; s.staff = 'all'; s.status = 'all'; S.render(); }
      },
      newAppt() {
        const s = S.pageState('schedule', page.init);
        S.Forms.appointment({ date: s.date < U.today() ? U.today() : s.date, staffId: s.staff !== 'all' ? s.staff : undefined, after: (id, date) => { s.sel = id; s.date = date; S.render(); } });
      },
      newAt(el) {
        const s = S.pageState('schedule', page.init), [staffId, time] = el.dataset.arg.split('|');
        S.Forms.appointment({ date: s.date, staffId, time, after: (id, date) => { s.sel = id; s.date = date; S.render(); } });
      },
      edit() { const s = S.pageState('schedule', page.init); S.Forms.appointment({ id: s.sel, after: (id, date) => { s.date = date; S.render(); } }); },
      setStatus(el) {
        const s = S.pageState('schedule', page.init), v = el.dataset.arg;
        const label = { confirmed: 'ยืนยันนัดแล้ว', done: 'บันทึกว่าให้บริการเสร็จแล้ว', noshow: 'บันทึกว่าไม่มาตามนัด', cancelled: 'ยกเลิกนัดหมายแล้ว' }[v];
        S.store.update(st => { const a = st.appts.find(x => x.id === s.sel); a.status = v; if (v !== 'done') { a.paid = false; a.pay = ''; a.tip = 0; } });
        S.toast(label);
        if (v === 'done') S.Forms.payment(s.sel);
      },
      pay() { S.Forms.payment(S.pageState('schedule', page.init).sel); },
      del() {
        const s = S.pageState('schedule', page.init);
        S.modal({
          title: 'ลบนัดหมาย', body: '<p>ต้องการลบนัดหมายนี้ออกจากระบบถาวรหรือไม่?</p>', submitLabel: 'ลบนัดหมาย',
          submit() { const id = s.sel; s.sel = null; S.store.update(st => { st.appts = st.appts.filter(x => x.id !== id); }); S.toast('ลบนัดหมายแล้ว'); }
        });
      },
      bill() { const a = S.store.appt(S.pageState('schedule', page.init).sel); if (!a) return; const b = billSpec(a); S.savePng(b.spec, 'solva-bill-' + b.no + '.png'); },
      dayPng() {
        const s = S.pageState('schedule', page.init), list = S.store.apptsOn(s.date);
        if (!list.length) { S.toast('ยังไม่มีนัดหมายให้บันทึก'); return; }
        S.savePng(daySpec(s.date, list), 'solva-schedule-' + s.date + '.png');
      }
    }
  };
  S.pages.schedule = page;
  S.billSpec = billSpec;
})(window.Solva = window.Solva || {});
