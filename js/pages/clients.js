// ลูกค้า — client list with tier filters and a profile panel (info, membership,
// notes, usage summary, service history). Visits and spend come from appointments.
(function (S) {
  'use strict';
  const U = S.U, W = S.W, F = S.F, K = S.K, esc = U.esc;
  const TABS = ['ข้อมูลพื้นฐาน', 'สถานะสมาชิก', 'โน้ต', 'สรุปการใช้บริการ', 'ประวัติบริการ'];
  const SORTS = [['spend', 'ยอดสะสมสูงสุด'], ['last', 'มาล่าสุด'], ['name', 'ชื่อ ก–ฮ'], ['visits', 'จำนวนครั้ง']];

  const page = {
    init: () => ({ f: 'all', q: '', sel: null, tab: 0, op: null, sort: 'spend' }),
    enter(p) {
      const s = S.pageState('clients', page.init);
      if (p.sel) { s.sel = p.sel; s.tab = 0; s.op = null; s.f = 'all'; s.q = ''; }
    },
    render(s) {
      const store = S.store, cl = store.state.clients;
      const stats = Object.fromEntries(cl.map(c => [c.id, store.clientStats(c.id)]));
      const members = cl.filter(c => c.tier).length;
      const inF = c => s.f === 'all' || (s.f === 'np' && !c.tier) || (s.f === 'mem' && !!c.tier) || s.f === c.tier;
      const q = s.q.trim().toLowerCase();
      const rows = cl.filter(c => inF(c) && (!q || c.name.toLowerCase().includes(q) || c.nick.toLowerCase().includes(q) || c.phone.replace(/-/g, '').includes(q.replace(/-/g, ''))))
        .sort((a, b) => {
          const A = stats[a.id], B = stats[b.id];
          if (s.sort === 'name') return a.name.localeCompare(b.name, 'th');
          if (s.sort === 'last') return (B.last || '').localeCompare(A.last || '');
          if (s.sort === 'visits') return B.visits - A.visits;
          return B.spend - A.spend;
        });

      const CD = [['np', 'Non-member', 'ลูกค้าทั่วไป', 'np']].concat(K.TIERS.map(t => [t, t, 'ส่วนลด ' + K.DISC[t] + '%', K.TIER_CLS[t]]));
      const cards = CD.map(([k, n, sub, cls]) => {
        const cnt = k === 'np' ? cl.length - members : cl.filter(c => c.tier === k).length;
        return '<button class="tc t' + cls + ' ' + (s.f === k ? 'on' : '') + '" data-act="f" data-arg="' + k + '" aria-pressed="' + (s.f === k) + '"><div class="ti"></div><div class="tn">' + n + '</div><div class="ts">' + sub + '</div><em>' + W.cn(cnt) + ' คน</em></button>';
      }).join('');

      const table = '<div class="sx"><div class="r h"><div>ลูกค้า</div><div>เบอร์ติดต่อ</div><div>สถานะ</div><div>ล่าสุด</div><div>ครั้ง</div><div>ยอดสะสม</div></div>'
        + rows.map(c => {
          const t = c.tier, x = stats[c.id];
          return '<div class="r ' + (s.sel === c.id ? 'on' : '') + '" data-key="' + c.id + '"><div class="ph"><i>' + esc(U.initial(c.name)) + '</i><button class="nb" data-act="pick" data-arg="' + c.id + '">' + esc(c.name) + '</button></div><div>' + esc(c.phone || '—') + '</div><div><span class="sb2 ' + (t ? K.TIER_CLS[t] : 'np') + '"><i></i>' + (t || 'Non-member') + '</span></div><div>' + (x.last ? U.thShort(x.last) : '—') + '</div><div>' + x.visits + '</div><div>' + U.fm(x.spend) + '</div></div>';
        }).join('') + '</div>' + (rows.length ? '' : W.empty('ไม่พบลูกค้าที่ตรงกับตัวกรอง<br><button class="bt o" style="margin-top:12px" data-act="clear">ล้างตัวกรอง</button>'));

      // profile
      const c = s.sel && store.client(s.sel);
      let prof = W.empty('เลือกลูกค้าจากรายชื่อเพื่อดูโปรไฟล์');
      if (c) {
        const x = stats[c.id], t = c.tier, ti = F.tierInfo(x.points, t);
        let body = '';
        if (s.tab === 0) {
          body = W.kv('เบอร์โทรศัพท์', esc(c.phone || '—')) + W.kv('วันเกิด', c.bd ? U.thDate(c.bd) : '—') + W.kv('วันที่ลงทะเบียน', U.thDate(c.reg)) + W.kv('Line ID', esc(c.line || '—'))
            + '<h2 style="margin-top:16px">นัดหมายที่จะถึง</h2>'
            + (x.upcoming.length ? x.upcoming.map(a => '<a class="ap" href="#/schedule?sel=' + a.id + '"><b>' + U.thShort(a.date) + ' ' + a.time + '</b> · ' + esc(a.items.map(i => i.n).join(', ')) + ' · ' + esc(store.staffById(a.staffId).nick) + '</a>').join('') : '<p class="sub">ยังไม่มีนัดหมาย</p>')
            + (x.unpaid.length ? '<div class="wn" style="margin-top:12px">รอชำระเงิน ' + x.unpaid.length + ' รายการ · <a href="#/schedule?sel=' + x.unpaid[0].id + '">ไปที่บิล</a></div>' : '')
            + '<div class="acts"><button class="bt" data-act="book">+ จองนัดหมาย</button><button class="bt o" data-act="editC">แก้ไขข้อมูล</button></div>';
        } else if (s.tab === 1) {
          if (t) {
            body = W.kv('เริ่มเป็นสมาชิก', c.memSince ? U.thDate(c.memSince) : '—') + W.kv('หมดอายุ', c.memExp ? U.thDate(c.memExp) + (c.memExp < U.today() ? ' <span class="rd">(หมดอายุแล้ว)</span>' : '') : '—') + W.kv('คะแนนสะสม', U.num(x.points) + ' แต้ม')
              + '<div style="margin:12px 0 4px">' + (ti.next ? 'อีก ' + U.num(ti.toNext) + ' แต้ม สู่ ' + ti.next : 'ระดับสูงสุดแล้ว') + '</div><div class="bar"><i style="width:' + Math.max(4, ti.pct) + '%"></i></div>'
              + '<h2 style="margin:16px 0 4px">สิทธิประโยชน์</h2>' + K.BENEFITS[t].map(b => '<div class="ap">✦ ' + esc(b) + '</div>').join('')
              + '<div class="acts">' + (ti.next ? '<button class="bt" data-act="tier" data-arg="' + ti.next + '">อัปเกรดเป็น ' + ti.next + (ti.toNext ? '' : ' ✓') + '</button>' : '') + '<button class="bt o" data-act="renew">ต่ออายุ 1 ปี</button><button class="bt d" data-act="tier" data-arg="">ยกเลิกสมาชิก</button></div>';
          } else {
            body = '<div class="em"><span class="mbg np">Non-member</span><p>ยังไม่ได้เป็นสมาชิก สมัครเพื่อสะสมแต้มและรับสิทธิประโยชน์</p>'
              + (ti.earned && ti.earned !== 'Pearl' ? '<p>ยอดสะสม ' + U.fm(x.spend) + ' (' + U.num(x.points) + ' แต้ม) เข้าเกณฑ์ระดับ <b>' + ti.earned + '</b></p><button class="bt" data-act="tier" data-arg="' + ti.earned + '">สมัครระดับ ' + ti.earned + '</button> ' : '')
              + '<button class="bt' + (ti.earned && ti.earned !== 'Pearl' ? ' o' : '') + '" data-act="tier" data-arg="Pearl">สมัครสมาชิก Pearl</button></div>';
          }
        } else if (s.tab === 2) {
          body = (c.notes.length ? '<div class="row">' + c.notes.map((n, i) => '<span class="ch nt">' + esc(n) + '<button aria-label="ลบโน้ต" data-act="rmNote" data-arg="' + i + '">×</button></span>').join('') + '</div>' : W.empty('ยังไม่มีโน้ต เพิ่มสีหรือข้อควรระวังด้านล่าง'))
            + '<form class="ni" data-sub="addNote"><input name="note" placeholder="เพิ่มโน้ตใหม่ เช่น สีที่ชอบ" aria-label="โน้ตใหม่" maxlength="60"><button class="bt">บันทึก</button></form>';
        } else if (s.tab === 3) {
          const mx = Math.max(1, ...x.top.map(z => z[1]));
          body = x.visits ? '<div class="tl"><div><small>จำนวนครั้ง</small><b>' + x.visits + ' ครั้ง</b></div><div><small>ยอดสะสม</small><b>' + U.fm(x.spend) + '</b></div><div><small>เฉลี่ยต่อครั้ง</small><b>' + U.fm(x.visits ? x.spend / x.visits : 0) + '</b></div><div><small>ล่าสุด</small><b>' + U.thShort(x.last) + '</b></div></div>'
            + '<h2>บริการที่ใช้บ่อย</h2>' + x.top.map(z => '<div class="ap"><div style="display:flex;justify-content:space-between"><span>' + esc(z[0]) + '</span><b>' + z[1] + ' ครั้ง</b></div><div class="bar" style="margin-top:6px"><i style="width:' + Math.round(z[1] / mx * 100) + '%"></i></div></div>').join('')
            : W.empty('ยังไม่เคยใช้บริการ');
        } else {
          const hist = x.all.slice(0, 30);
          body = hist.length ? hist.map((a, i) => {
            const st = F.apptStatus(a), open = s.op === i;
            return '<div class="hx"><button data-act="op" data-arg="' + i + '" aria-expanded="' + open + '"><span><b>' + U.thShortY(a.date) + '</b> · ' + esc(a.items.map(z => z.n).join(' + ')) + '</span><span>' + W.chip(st.label, st.cls) + ' ' + (open ? '▲' : '▼') + '</span></button>'
              + (open ? '<div class="dd">' + a.time + ' น. · ช่าง ' + esc(store.staffById(a.staffId).nick) + ' · ' + a.dur + ' นาที · ' + U.fm(F.apptNet(a)) + (a.pay ? ' · ' + esc(a.pay) : '') + ' · <a href="#/schedule?sel=' + a.id + '">เปิดในตารางนัด</a></div>' : '') + '</div>';
          }).join('') + (x.all.length > 30 ? '<p class="hint">แสดง 30 รายการล่าสุดจากทั้งหมด ' + x.all.length + ' รายการ</p>' : '') : W.empty('ยังไม่มีประวัติบริการ');
        }
        prof = '<div class="row" style="margin:0"><div class="av2" style="width:64px;height:64px;font-size:24px;font-weight:700;background:#FFDFFF">' + esc(U.initial(c.name)) + '</div><div><h2 style="margin:0">' + esc(c.name) + ' <small style="font-weight:400;color:#6B6D7A">(' + esc(c.nick) + ')</small></h2><span class="mbg ' + (t ? K.TIER_CLS[t] : 'np') + '">' + (t || 'Non-member') + '</span></div></div>'
          + W.tabs(TABS, s.tab, 'tab') + '<div class="tp" data-key="t' + s.tab + c.id + '">' + body + '</div>';
      }

      return W.hero({ title: 'ลูกค้าทั้งหมด ' + W.cn(cl.length) + ' คน', sub: 'สมาชิก ' + members + ' · Non-member ' + (cl.length - members), btn: { label: '+ เพิ่มลูกค้า', act: 'newC' }, art: 'heart' })
        + '<h2>ระดับสมาชิก · แตะการ์ดเพื่อกรองรายชื่อ</h2><div class="row" style="gap:20px;margin-bottom:26px">' + cards + '</div>'
        + '<div class="row"><input class="si" type="search" placeholder="ค้นหาชื่อหรือเบอร์โทร" aria-label="ค้นหาลูกค้า" value="' + esc(s.q) + '" data-in="q">'
        + W.segs([['all', 'ทั้งหมด'], ['np', 'Non-member'], ['mem', 'Membership']], (s.f === 'mem' || K.TIERS.includes(s.f)) ? 'mem' : s.f, 'f')
        + '<select class="fi" style="width:auto" data-ch="sort" aria-label="เรียงตาม">' + W.opts(SORTS, s.sort) + '</select>'
        + '<button class="bt" style="margin-left:auto" data-act="newC">+ เพิ่มลูกค้า</button><button class="bt d" data-act="csv">ส่งออก CSV</button></div>'
        + '<div class="lay"><div class="c l1">' + table + '</div><div class="c l2 sticky">' + prof + '</div></div>';
    },
    actions: {
      f(el) { const s = S.pageState('clients', page.init), k = el.dataset.arg; s.f = s.f === k && el.classList.contains('tc') ? 'all' : k; S.render(); },
      q(el) { S.pageState('clients', page.init).q = el.value; S.render(); },
      sort(el) { S.pageState('clients', page.init).sort = el.value; S.render(); },
      clear() { Object.assign(S.pageState('clients', page.init), { f: 'all', q: '' }); S.render(); },
      pick(el) { Object.assign(S.pageState('clients', page.init), { sel: el.dataset.arg, tab: 0, op: null }); S.render(); },
      tab(el) { Object.assign(S.pageState('clients', page.init), { tab: Number(el.dataset.arg), op: null }); S.render(); },
      op(el) { const s = S.pageState('clients', page.init), i = Number(el.dataset.arg); s.op = s.op === i ? null : i; S.render(); },
      newC() { const s = S.pageState('clients', page.init); S.Forms.client(null, id => { Object.assign(s, { sel: id, tab: 0, f: 'all', q: '' }); S.render(); }); },
      editC() { S.Forms.client(S.pageState('clients', page.init).sel); },
      book() { const s = S.pageState('clients', page.init); S.Forms.appointment({ clientId: s.sel, after: (id, date) => S.go('#/schedule?date=' + date + '&sel=' + id) }); },
      tier(el) {
        const s = S.pageState('clients', page.init), t = el.dataset.arg || null;
        S.store.update(st => {
          const c = st.clients.find(x => x.id === s.sel), was = c.tier;
          c.tier = t;
          if (t && !was) { c.memSince = U.today(); c.memExp = U.addDays(U.today(), 365); }
          if (!t) { c.memSince = null; c.memExp = null; }
          // Upcoming unpaid bookings get the new member discount
          st.appts.filter(a => a.clientId === c.id && !a.paid && F.isActive(a)).forEach(a => { a.disc = K.DISC[t] || 0; });
        });
        S.toast(t ? 'ปรับระดับเป็น ' + t + ' เรียบร้อย' : 'ยกเลิกสมาชิกแล้ว');
      },
      renew() {
        const s = S.pageState('clients', page.init);
        S.store.update(st => { const c = st.clients.find(x => x.id === s.sel); const base = c.memExp && c.memExp > U.today() ? c.memExp : U.today(); c.memExp = U.addDays(base, 365); });
        S.toast('ต่ออายุสมาชิกเรียบร้อย');
      },
      addNote(form) {
        const s = S.pageState('clients', page.init), v = form.elements.note.value.trim();
        if (!v) return;
        S.store.update(st => { st.clients.find(x => x.id === s.sel).notes.push(v); });
        form.reset(); S.toast('บันทึกโน้ตแล้ว');
      },
      rmNote(el) {
        const s = S.pageState('clients', page.init), i = Number(el.dataset.arg);
        S.store.update(st => { st.clients.find(x => x.id === s.sel).notes.splice(i, 1); });
        S.toast('ลบโน้ตแล้ว');
      },
      csv() {
        const store = S.store;
        const rows = [['ชื่อ', 'ชื่อเล่น', 'เบอร์โทร', 'ระดับ', 'วันเกิด', 'ลงทะเบียน', 'Line', 'จำนวนครั้ง', 'ยอดสะสม', 'มาล่าสุด', 'โน้ต']]
          .concat(store.state.clients.map(c => { const x = store.clientStats(c.id); return [c.name, c.nick, c.phone, c.tier || 'Non-member', c.bd, c.reg, c.line, x.visits, x.spend, x.last || '', c.notes.join('; ')]; }));
        U.download('solva-clients-' + U.today() + '.csv', new Blob([U.csv(rows)], { type: 'text/csv;charset=utf-8' }));
        S.toast('ส่งออกรายชื่อลูกค้าแล้ว');
      }
    }
  };
  S.pages.clients = page;
})(window.Solva = window.Solva || {});
