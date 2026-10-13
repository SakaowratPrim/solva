// พนักงาน — team cards, attendance (with clock-in/out), hours, skills,
// commission & tips (computed from finished appointments) and payouts.
(function (S) {
  'use strict';
  const U = S.U, W = S.W, F = S.F, K = S.K, esc = U.esc;
  const TABS = ['ข้อมูลพื้นฐาน', 'ชั่วโมงทำงาน', 'ความถนัด', 'การเข้างาน', 'ค่าคอมฯ & ทิป', 'ประวัติงาน'];
  const LATE_AFTER = 9 * 60 + 5;

  const todayStatus = id => {
    const r = S.store.attendanceToday(id);
    if (!r) return { k: 'none', label: 'ยังไม่ลงเวลา', cls: 'nt' };
    const [label, cls] = K.ATT[r.st];
    return { k: r.st, label: r.out ? label + ' · ออกแล้ว' : label, cls };
  };

  function reportSpec(x, ym, m, pending) {
    const store = S.store, CP = ['#CDEFD9', '#1F7A4D'];
    return {
      w: 760, shop: store.state.settings.shop, title: 'รายงานค่าคอมมิชชันและทิป',
      info: [['พนักงาน', x.full + ' (' + x.nick + ')'], ['ตำแหน่ง', x.role], ['ช่วงรายงาน', U.thMonth(ym)], ['วันที่จัดทำรายงาน', U.thDate(U.today())]],
      cols: [{ w: 0.12, al: 'l' }, { w: 0.38, al: 'l' }, { w: 0.14, al: 'r' }, { w: 0.1, al: 'r' }, { w: 0.13, al: 'r' }, { w: 0.13, al: 'r' }],
      head: ['วันที่', 'ลูกค้า · บริการ', 'มูลค่า', 'อัตรา', 'ค่าคอม', 'ทิป'],
      rows: m.done.slice().sort((a, b) => a.date.localeCompare(b.date)).map(a => [U.thShort(a.date), store.client(a.clientId).name + ' · ' + a.items.map(i => i.n).join(', '), U.fm(F.apptNet(a)), x.rate + '%', U.fm(F.commissionOf(a, x)), U.fm(a.tip || 0)]),
      sum: [{ k: 'ค่าคอมมิชชันรวม', v: U.fm(m.commission) }, { k: 'ทิปรวม', v: U.fm(m.tips) }, { k: 'ยอดรวมค่าตอบแทนเดือนนี้', v: U.fm(m.commission + m.tips), big: 1 }],
      pay: [['จ่ายแล้วในเดือนนี้', U.fm(m.paidOut), CP], ['ยอดค้างจ่ายทั้งหมด', U.fm(pending), pending ? ['#FBE8A6', '#8A6500'] : CP]],
      notes: ['ไม่รวมงานที่ยกเลิกหรือไม่มาตามนัด', 'อัตราค่าคอมมิชชันของ' + x.nick + ' ' + x.rate + '% ของยอดสุทธิหลังหักส่วนลด'], foot: ['จัดทำโดยระบบ Solva']
    };
  }

  const page = {
    init: () => ({ f: 'all', q: '', sel: null, tab: 0, ym: U.ym(U.today()), af: 'all', op: null }),
    enter(p) { const s = S.pageState('staff', page.init); if (p.sel) Object.assign(s, { sel: p.sel, tab: 0, op: null }); },
    render(s) {
      const store = S.store, staff = store.state.staff;
      const ts = Object.fromEntries(staff.map(x => [x.id, todayStatus(x.id)]));
      const cnt = k => staff.filter(x => ts[x.id].k === k).length;
      const q = s.q.trim();
      const rows = staff.filter(x => (s.f === 'all' || ts[x.id].k === s.f) && (!q || x.nick.includes(q) || x.full.includes(q)));
      const curYm = U.ym(U.today());

      const cards = rows.map(x => {
        const t = ts[x.id], h = store.staffMonth(x.id, curYm).hours;
        return '<div class="c lf pf sc2 ' + (s.sel === x.id ? 'on' : '') + '" data-key="' + x.id + '"><div class="pa"><div>' + esc(U.initial(x.nick.replace(/^(พี่|น้อง)/, ''))) + '</div></div>'
          + '<button class="ch nb" style="padding:6px 30px" data-act="pick" data-arg="' + x.id + '">' + esc(x.nick) + '</button><div class="sp">' + esc(x.main.join(' · ') || '—') + '</div>' + W.chip(t.label, t.cls)
          + '<div class="ap" style="margin-top:12px">' + esc(x.role) + ' · ' + h + ' ชม. เดือนนี้</div></div>';
      }).join('');

      const x = s.sel && store.staffById(s.sel);
      let prof = W.empty('เลือกพนักงานเพื่อดูโปรไฟล์');
      if (x) {
        const m = store.staffMonth(x.id, s.ym), t = ts[x.id], pending = store.staffPending(x.id), rec = store.attendanceToday(x.id);
        const monthNav = '<div class="mo" style="margin-bottom:8px"><button data-act="mo" data-arg="-1" aria-label="เดือนก่อนหน้า">‹</button><b>' + U.thMonth(s.ym) + '</b><button data-act="mo" data-arg="1" aria-label="เดือนถัดไป"' + (s.ym >= curYm ? ' disabled style="opacity:.4"' : '') + '>›</button></div>';
        const clock = '<div class="acts">' + (!rec ? '<button class="bt" data-act="clockIn">ลงเวลาเข้างาน</button><button class="bt d" data-act="leave">บันทึกลา</button>' : rec.in && !rec.out ? '<button class="bt" data-act="clockOut">ลงเวลาออกงาน</button>' : '') + '</div>';
        let body = '';
        if (s.tab === 0) {
          body = W.kv('ชื่อ-นามสกุล', esc(x.full)) + W.kv('ตำแหน่ง', esc(x.role)) + W.kv('เบอร์ติดต่อ', esc(x.phone || '—')) + W.kv('วันที่เริ่มงาน', U.thDate(x.start)) + W.kv('อายุงาน (คำนวณอัตโนมัติ)', U.tenure(x.start)) + W.kv('อัตราค่าคอมมิชชัน', x.rate + '%')
            + W.kv('วันนี้', rec ? (rec.in ? 'เข้า ' + rec.in + (rec.out ? ' · ออก ' + rec.out : '') : K.ATT[rec.st][0]) : 'ยังไม่ลงเวลา')
            + clock.replace('</div>', '<button class="bt o" data-act="editS">แก้ไขข้อมูล</button></div>');
        } else if (s.tab === 1) {
          const mx = Math.max(1, ...m.weeks);
          body = monthNav + '<div class="wb">' + m.weeks.map((v, i) => '<div><i style="height:' + (Math.round(v / mx * 90) + 6) + 'px" title="' + v + ' ชม."></i>สป.' + (i + 1) + '<br><b>' + v + '</b></div>').join('') + '</div>'
            + W.kv('ชั่วโมงรวม', m.hours + ' ชม.') + W.kv('จำนวนวันทำงาน', m.days + ' วัน') + W.kv('เฉลี่ย', (m.days ? (m.hours / m.days).toFixed(1) : '0') + ' ชม./วัน');
        } else if (s.tab === 2) {
          const all = x.main.concat(x.sec);
          body = '<p class="sub" style="margin:0 0 10px">แตะทักษะเพื่อสลับระหว่างหลักและรอง</p><div class="row">'
            + all.map(k => { const main = x.main.includes(k); return '<button class="ch ' + (main ? '' : 'nt') + '" style="cursor:pointer;min-height:44px;font:inherit" data-act="skill" data-arg="' + esc(k) + '">' + esc(k) + ' · ' + (main ? 'หลัก' : 'รอง') + '</button>'; }).join('')
            + '</div><form class="ni" data-sub="addSkill"><input name="skill" placeholder="เพิ่มทักษะ เช่น Gel Extension" aria-label="ทักษะใหม่" maxlength="40"><button class="bt">เพิ่ม</button></form>';
        } else if (s.tab === 3) {
          const cntA = k => m.att.filter(a => a.st === k).length;
          const list = m.att.filter(a => s.af === 'all' || a.st === s.af);
          body = monthNav + '<div class="sg sm" style="margin-bottom:10px">' + [['all', 'ทั้งหมด']].concat(Object.entries(K.ATT).map(([k, v]) => [k, v[0]])).map(([k, n]) => '<button class="' + (s.af === k ? 'on' : '') + '" data-act="af" data-arg="' + k + '">' + n + (k === 'all' ? '' : ' ' + cntA(k)) + '</button>').join('') + '</div>'
            + (list.length ? list.map(a => '<div class="kv"><span><b style="color:#2B2D3A">' + U.thShort(a.date) + '</b> · ' + (a.in ? a.in + ' – ' + (a.out || 'ยังไม่ออก') + ' · ' + m.hoursOf(a) + ' ชม.' : '—') + '</span>' + W.chip(K.ATT[a.st][0], K.ATT[a.st][1]) + '</div>').join('') : W.empty('ไม่มีรายการในสถานะนี้'))
            + (s.ym === curYm ? clock : '');
        } else if (s.tab === 4) {
          body = monthNav + '<div class="tl"><div><small>ค่าคอมรวม</small><b>' + U.fm(m.commission) + '</b></div><div><small>ทิปรวม</small><b>' + U.fm(m.tips) + '</b></div><div><small>จ่ายแล้ว (เดือนนี้)</small><b>' + U.fm(m.paidOut) + '</b></div><div><small>ค้างจ่ายทั้งหมด</small><b class="' + (pending ? 'ye' : 'gr') + '">' + U.fm(pending) + '</b></div></div>'
            + '<div class="row" style="margin-bottom:8px">' + (pending ? '<button class="bt" data-act="payAll">จ่ายยอดค้าง ' + U.fm(pending) + '</button>' : '') + '<button class="bt o" data-act="report">บันทึกรายงานเป็น PNG</button></div>'
            + (m.done.length ? m.done.slice().sort((a, b) => b.date.localeCompare(a.date)).map((a, i) => {
              const cm = F.commissionOf(a, x), open = s.op === i;
              return '<div class="hx"><button data-act="op" data-arg="' + i + '" aria-expanded="' + open + '"><span><b>' + U.thShort(a.date) + '</b> · ' + esc(store.client(a.clientId).name) + ' · ' + esc(a.items.map(z => z.n).join(', ')) + '</span><span><b>' + U.fm(cm + (a.tip || 0)) + '</b> ' + (open ? '▲' : '▼') + '</span></button>'
                + (open ? '<div class="dd">' + U.fm(F.apptNet(a)) + ' × ' + x.rate + '% = ' + U.fm(cm) + ' · ทิป ' + U.fm(a.tip || 0) + ' → รวม ' + U.fm(cm + (a.tip || 0)) + (a.paid ? '' : ' <span class="ye">(ลูกค้ายังไม่ชำระ)</span>') + '</div>' : '') + '</div>';
            }).join('') : W.empty('ยังไม่มีงานที่เสร็จในเดือนนี้'));
        } else {
          const hist = store.state.appts.filter(a => a.staffId === x.id && U.ym(a.date) === s.ym).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
          body = monthNav + (hist.length ? hist.map((a, i) => {
            const st = F.apptStatus(a), open = s.op === i;
            return '<div class="hx"><button data-act="op" data-arg="' + i + '" aria-expanded="' + open + '"><span><b>' + U.thShort(a.date) + ' ' + a.time + '</b> · ' + esc(store.client(a.clientId).name) + ' · ' + esc(a.items.map(z => z.n).join(', ')) + '</span><span>' + W.chip(st.label, st.cls) + ' ' + (open ? '▲' : '▼') + '</span></button>'
              + (open ? '<div class="dd">' + a.dur + ' นาที · ' + U.fm(F.apptNet(a)) + ' · ค่าคอม ' + (a.status === 'done' ? U.fm(F.commissionOf(a, x)) : '—') + ' · <a href="#/schedule?sel=' + a.id + '">เปิดในตารางนัด</a></div>' : '') + '</div>';
          }).join('') : W.empty('ไม่มีงานในเดือนนี้'));
        }
        prof = '<div class="row" style="margin:0"><div class="av2" style="width:64px;height:64px;background:#FFDFFF;font-size:24px">' + esc(U.initial(x.nick.replace(/^(พี่|น้อง)/, ''))) + '</div><div><h2 style="margin:0">' + esc(x.nick) + '</h2><div class="sub">' + esc(x.role) + ' · อายุงาน ' + U.tenure(x.start) + '</div>' + W.chip(t.label, t.cls) + '</div></div>'
          + '<div class="tl t3" style="margin-top:14px"><div><small>ชั่วโมง (' + U.thMonthS(s.ym) + ')</small><b>' + m.hours + ' ชม.</b></div><div><small>ค่าคอมมิชชัน</small><b>' + U.fm(m.commission) + '</b></div><div><small>ทิป</small><b>' + U.fm(m.tips) + '</b></div></div>'
          + W.tabs(TABS, s.tab, 'tab') + '<div class="tp" data-key="t' + s.tab + x.id + '">' + body + '</div>';
      }

      return W.hero({ title: 'ทีมของเรา ' + W.cn(staff.length) + ' คน', sub: 'วันนี้ ตรงเวลา ' + cnt('ontime') + ' · มาสาย ' + cnt('late') + ' · ลา ' + cnt('leave') + ' · ยังไม่ลงเวลา ' + cnt('none'), btn: { label: '+ เพิ่มพนักงาน', act: 'newS' }, art: 'team' })
        + '<div class="row"><input class="si" type="search" placeholder="ค้นหาชื่อพนักงาน" aria-label="ค้นหาพนักงาน" value="' + esc(s.q) + '" data-in="q">'
        + W.segs([['all', 'ทั้งหมด'], ['ontime', 'ตรงเวลา'], ['late', 'มาสาย'], ['leave', 'ลา'], ['none', 'ยังไม่ลงเวลา']], s.f, 'f')
        + '<button class="bt" style="margin-left:auto" data-act="newS">+ เพิ่มพนักงาน</button></div>'
        + '<div class="lay"><div class="l1">' + (rows.length ? '<div class="sg2">' + cards + '</div>' : W.empty('ไม่มีพนักงานในสถานะนี้ตอนนี้<br><button class="bt o" style="margin-top:12px" data-act="clear">ดูทั้งหมด</button>')) + '</div>'
        + '<div class="c l2 sticky">' + prof + '</div></div>';
    },
    actions: {
      q(el) { S.pageState('staff', page.init).q = el.value; S.render(); },
      f(el) { S.pageState('staff', page.init).f = el.dataset.arg; S.render(); },
      clear() { Object.assign(S.pageState('staff', page.init), { f: 'all', q: '' }); S.render(); },
      pick(el) { Object.assign(S.pageState('staff', page.init), { sel: el.dataset.arg, tab: 0, op: null, af: 'all' }); S.render(); },
      tab(el) { Object.assign(S.pageState('staff', page.init), { tab: Number(el.dataset.arg), op: null }); S.render(); },
      mo(el) {
        const s = S.pageState('staff', page.init), n = U.addMonths(s.ym, Number(el.dataset.arg));
        if (n <= U.ym(U.today())) { s.ym = n; s.op = null; S.render(); }
      },
      af(el) { S.pageState('staff', page.init).af = el.dataset.arg; S.render(); },
      op(el) { const s = S.pageState('staff', page.init), i = Number(el.dataset.arg); s.op = s.op === i ? null : i; S.render(); },
      newS() { const s = S.pageState('staff', page.init); S.Forms.staff(null, id => { Object.assign(s, { sel: id, tab: 0 }); S.render(); }); },
      editS() { S.Forms.staff(S.pageState('staff', page.init).sel); },
      skill(el) {
        const s = S.pageState('staff', page.init), k = el.dataset.arg;
        S.store.update(st => {
          const x = st.staff.find(t => t.id === s.sel);
          if (x.main.includes(k)) { x.main = x.main.filter(z => z !== k); x.sec.push(k); } else { x.sec = x.sec.filter(z => z !== k); x.main.push(k); }
        });
        S.toast('ปรับทักษะเรียบร้อย');
      },
      addSkill(form) {
        const s = S.pageState('staff', page.init), v = form.elements.skill.value.trim();
        if (!v) return;
        const x = S.store.staffById(s.sel);
        if (x.main.concat(x.sec).some(z => z.toLowerCase() === v.toLowerCase())) { S.toast('มีทักษะนี้อยู่แล้ว'); return; }
        S.store.update(st => { st.staff.find(t => t.id === s.sel).sec.push(v); });
        form.reset(); S.toast('เพิ่มทักษะแล้ว');
      },
      clockIn() {
        const s = S.pageState('staff', page.init), now = U.nowHM();
        S.store.update(st => { st.attendance.push({ id: U.uid('at'), staffId: s.sel, date: U.today(), in: now, out: '', st: U.toMin(now) > LATE_AFTER ? 'late' : 'ontime' }); });
        S.toast('ลงเวลาเข้างาน ' + now + ' น.');
      },
      clockOut() {
        const s = S.pageState('staff', page.init), now = U.nowHM();
        S.store.update(st => { const r = st.attendance.find(a => a.staffId === s.sel && a.date === U.today()); if (r) r.out = now; });
        S.toast('ลงเวลาออกงาน ' + now + ' น.');
      },
      leave() {
        const s = S.pageState('staff', page.init);
        S.store.update(st => { st.attendance.push({ id: U.uid('at'), staffId: s.sel, date: U.today(), in: '', out: '', st: 'leave' }); });
        S.toast('บันทึกการลาแล้ว');
      },
      payAll() {
        const s = S.pageState('staff', page.init), x = S.store.staffById(s.sel), amt = S.store.staffPending(s.sel);
        S.modal({
          title: 'จ่ายค่าคอมฯ & ทิป · ' + x.nick,
          body: '<div class="sumbox"><span>ยอดค้างจ่าย</span><b>' + U.fm(amt) + '</b></div><p class="hint">ระบบจะบันทึกการจ่ายวันนี้ และยอดค้างจะกลับเป็น ฿0</p>',
          submitLabel: 'ยืนยันการจ่าย',
          submit() {
            S.store.update(st => { st.payouts.push({ id: U.uid('po'), staffId: x.id, date: U.today(), amount: amt, note: 'จ่ายยอดค้าง' }); });
            S.toast('บันทึกการจ่ายเรียบร้อย');
          }
        });
      },
      report() {
        const s = S.pageState('staff', page.init), x = S.store.staffById(s.sel);
        S.savePng(reportSpec(x, s.ym, S.store.staffMonth(x.id, s.ym), S.store.staffPending(x.id)), 'solva-commission-' + x.id + '-' + s.ym + '.png');
      }
    }
  };
  S.pages.staff = page;
})(window.Solva = window.Solva || {});
