// ภาพรวม — today at a glance, computed live from the store.
(function (S) {
  'use strict';
  const U = S.U, W = S.W, F = S.F, esc = U.esc;

  function calendar(ym) {
    const [y, m] = ym.split('-').map(Number);
    const first = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate(), today = U.today();
    let h = U.DAYS_S.map(d => '<span>' + d + '</span>').join('') + '<span></span>'.repeat(first);
    for (let d = 1; d <= days; d++) {
      const iso = ym + '-' + U.pad(d), load = S.store.dayLoad(iso);
      const cls = (load >= 0.7 ? 'f' : load >= 0.4 ? 'a' : '') + (iso === today ? ' t' : '');
      h += '<button class="' + cls + '" data-act="calDay" data-arg="' + iso + '" aria-label="' + U.thDate(iso) + ' · คิวเต็ม ' + Math.round(load * 100) + '%">' + d + '</button>';
    }
    return h;
  }

  function donut(paid, pending, target) {
    const C = 502.65, t = Math.max(target, paid + pending, 1);
    const a = paid / t * C, b = pending / t * C;
    return '<svg width="300" height="300" viewBox="0 0 200 200"><defs><linearGradient id="gd"><stop offset="0" stop-color="#FF9AFF"/><stop offset="1" stop-color="#FFDFFF"/></linearGradient></defs>'
      + '<circle cx="100" cy="100" r="80" fill="none" stroke="#E6E6E6" stroke-width="30"/>'
      + '<circle cx="100" cy="100" r="80" fill="none" stroke="#FBE8A6" stroke-width="30" stroke-dasharray="' + (a + b).toFixed(1) + ' 503" style="animation:dr 1.3s ease-out"/>'
      + '<circle cx="100" cy="100" r="80" fill="none" stroke="url(#gd)" stroke-width="30" stroke-dasharray="' + a.toFixed(1) + ' 503" style="animation:dr 1.3s ease-out"/></svg>';
  }

  const page = {
    init: () => ({ ym: U.ym(U.today()) }),
    render(s) {
      const store = S.store, today = U.today(), now = U.nowMin();
      const list = store.apptsOn(today), active = list.filter(F.isActive);
      const waiting = active.filter(a => a.status === 'confirmed' || a.status === 'booked');
      const next = waiting.find(a => U.toMin(a.time) >= now) || waiting[0];
      const mainSvc = a => a.items.slice().sort((x, y) => y.p - x.p)[0].n;
      const done = list.filter(a => a.status === 'done');
      const paid = done.filter(a => a.paid).reduce((t, a) => t + F.apptNet(a), 0);
      const pending = done.filter(a => !a.paid).reduce((t, a) => t + F.apptNet(a), 0);
      const yTotal = store.apptsOn(U.addDays(today, -1)).filter(a => a.status === 'done').reduce((t, a) => t + F.apptNet(a), 0);
      const total = paid + pending;
      const diff = yTotal ? Math.round((total - yTotal) / yTotal * 1000) / 10 : null;
      const [yy, mm] = U.ym(today).split('-').map(Number);
      const target = store.state.settings.goal / new Date(yy, mm, 0).getDate();
      const att = store.state.staff.filter(x => { const r = store.attendanceToday(x.id); return r && r.in; }).length;
      const notes = store.notifications();
      const ov = store.overlaps(today);

      const kpi = (label, val, i, href) => '<a class="c lf rs" style="--i:' + i + ';text-decoration:none" href="' + href + '"><div class="kl">' + label + '</div><div class="k">' + val + '</div></a>';

      return W.hero({
        title: 'วันนี้ร้านมี ' + W.cn(active.length) + ' คิว',
        sub: next ? 'คิวถัดไป ' + next.time + ' · ' + store.client(next.clientId).name + ' · ' + mainSvc(next) : 'ไม่มีคิวที่รออยู่แล้วสำหรับวันนี้',
        btn: { label: 'ดูตารางนัด', href: '#/schedule' }, art: 'bottle'
      })
        + '<div class="row rs" style="--i:1"><button class="bt" data-act="newAppt">+ เพิ่มนัดหมาย</button><button class="bt o" data-act="newClient">+ เพิ่มลูกค้า</button><button class="bt d" data-act="newExpense">+ บันทึกรายจ่าย</button></div>'
        + (ov.length ? '<div class="wn rs">⚠ คิวซ้อน ' + ov.length + ' รายการวันนี้ · <a href="#/schedule">ตรวจสอบตารางนัด</a></div>' : '')
        + '<div class="g2"><div class="c rs" style="--i:2"><div class="lgd"><span><b></b>เต็ม</span><span><b class="a"></b>เกือบเต็ม</span></div>'
        + '<div class="mo" style="margin-bottom:12px"><button data-act="calNav" data-arg="-1" aria-label="เดือนก่อนหน้า">‹</button><h2>' + U.thMonth(s.ym) + '</h2><button data-act="calNav" data-arg="1" aria-label="เดือนถัดไป">›</button></div>'
        + '<div class="cal">' + calendar(s.ym) + '</div><p class="hint" style="text-align:center">แตะวันที่เพื่อเปิดตารางนัดของวันนั้น</p></div>'
        + '<div class="c rs" style="--i:3"><h2>รายได้วันนี้</h2><div class="dn">' + donut(paid, pending, target)
        + '<div class="ct"><div class="big">' + U.num(total) + '</div><div class="sm">' + (diff == null ? 'บาท' : '<em>' + (diff >= 0 ? '↑ ' : '↓ ') + Math.abs(diff) + '%</em> เทียบเมื่อวาน') + '</div></div>'
        + '<span class="lb" style="right:-6px;top:14px">ชำระแล้ว ' + U.fm(paid) + '</span><span class="lb" style="left:0;bottom:12px">รอชำระ ' + U.fm(pending) + '</span></div>'
        + '<p class="hint" style="text-align:center">เป้ารายวัน ' + U.fm(target) + ' (จากเป้าเดือน ' + U.fm(store.state.settings.goal) + ')</p></div></div>'
        + '<h1>นัดหมายวันนี้</h1><div class="g">'
        + kpi('จองแล้ว', W.cn(active.length), 4, '#/schedule')
        + kpi('ยกเลิก / ไม่มา', W.cn(list.length - active.length), 5, '#/schedule?status=cancelled')
        + kpi('เสร็จสิ้น', W.cn(done.length), 6, '#/schedule?status=done')
        + kpi('พนักงานเข้างาน', att + '/' + store.state.staff.length, 7, '#/staff') + '</div>'
        + '<div class="g2"><div class="c rs" style="--i:8"><h2>นัดหมายที่กำลังจะมาถึง</h2>'
        + (waiting.length ? waiting.map(a => '<a class="ap" href="#/schedule?sel=' + a.id + '">' + (a === next ? '<i class="pd"></i>' : '') + '<b>' + a.time + '</b> ' + esc(store.client(a.clientId).name) + ' · ' + esc(mainSvc(a)) + ' <small class="sub">(' + esc(store.staffById(a.staffId).nick) + ')</small> ' + (a === next ? W.chip('ถัดไป', 's2') : '') + '</a>').join('') : W.empty('ไม่มีคิวที่รออยู่แล้ววันนี้'))
        + '</div><div class="c rs" style="--i:9"><h2>การแจ้งเตือน</h2>'
        + (notes.length ? notes.map(n => '<a class="ap ' + n.cls + '" href="' + n.href + '">' + esc(n.text) + '</a>').join('') : W.empty('ทุกอย่างเรียบร้อยดี'))
        + '</div></div><button class="fab" aria-label="เพิ่มนัดหมาย" data-act="newAppt">' + S.I.plus + '</button>';
    },
    actions: {
      calNav(el) { const s = S.pageState('dashboard', page.init); s.ym = U.addMonths(s.ym, Number(el.dataset.arg)); S.render(); },
      calDay(el) { S.go('#/schedule?date=' + el.dataset.arg); },
      newAppt() { S.Forms.appointment({ after: (id, date) => S.go('#/schedule?date=' + date + '&sel=' + id) }); },
      newClient() { S.Forms.client(null, id => S.go('#/clients?sel=' + id)); },
      newExpense() { S.Forms.tx('out'); }
    }
  };
  S.pages.dashboard = page;
})(window.Solva = window.Solva || {});
