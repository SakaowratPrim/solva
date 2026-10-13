// การเงิน — monthly P&L from paid appointments + manual income/expenses,
// commission accrual, revenue goal, 7-month trend and a filterable ledger.
(function (S) {
  'use strict';
  const U = S.U, W = S.W, esc = U.esc;

  const pct = (a, b) => (b ? Math.round((a - b) / Math.abs(b) * 1000) / 10 : null);
  const delta = (a, b, goodUp, label) => {
    const p = pct(a, b);
    if (p == null) return '<div class="sub" style="text-align:center">ไม่มีข้อมูลเดือนก่อน</div>';
    const good = goodUp ? p >= 0 : p <= 0;
    return '<div class="' + (good ? 'gr' : 'rd') + '" style="text-align:center">' + (p >= 0 ? '↑ ' : '↓ ') + Math.abs(p) + '% ' + label + '</div>';
  };

  const page = {
    init: () => ({ ym: U.ym(U.today()), tf: 'all', q: '', limit: 15 }),
    render(s) {
      const store = S.store, goal = store.state.settings.goal;
      const isCur = s.ym === U.ym(U.today());
      const m = store.financeMonth(s.ym), prev = store.financeMonth(U.addMonths(s.ym, -1), isCur ? Number(U.today().slice(8)) : 0);
      const cmpLabel = isCur ? 'เทียบช่วงเดียวกันเดือนก่อน' : 'เทียบเดือนก่อน';
      const goalPct = goal ? Math.round(m.income / goal * 100) : 0;

      // 7-month revenue trend
      const months = []; for (let i = 6; i >= 0; i--) months.push(U.addMonths(s.ym, -i));
      const vals = months.map(ym => store.financeMonth(ym).income), mx = Math.max(1, ...vals);
      const bars = months.map((ym, i) => '<div class="' + (ym === s.ym ? 'cur' : '') + '"><b>' + (vals[i] >= 1000 ? Math.round(vals[i] / 1000) : vals[i] ? '<1' : 0) + '</b><i style="height:' + Math.max(4, Math.round(vals[i] / mx * 200)) + 'px;animation-delay:' + i * 110 + 'ms"></i><span>' + U.MONTHS_S[Number(ym.slice(5)) - 1] + '</span></div>').join('');

      // goal donut
      const C = 502.65, g = Math.min(1, goal ? m.income / goal : 0) * C;
      const donut = '<div class="dn"><svg width="300" height="300" viewBox="0 0 200 200"><defs><linearGradient id="gf"><stop offset="0" stop-color="#FF9AFF"/><stop offset="1" stop-color="#FFDFFF"/></linearGradient></defs><circle cx="100" cy="100" r="80" fill="none" stroke="#E6E6E6" stroke-width="30"/><circle cx="100" cy="100" r="80" fill="none" stroke="url(#gf)" stroke-width="30" stroke-dasharray="' + g.toFixed(1) + ' 503" style="animation:dr 1.3s ease-out"/></svg>'
        + '<div class="ct"><div class="big">' + W.cn(goalPct) + '%</div><div class="sm">ของเป้าหมาย</div></div><span class="lb" style="right:-6px;top:14px">ทำได้ ' + U.fm(m.income) + '</span><span class="lb" style="left:0;bottom:12px">' + (m.income >= goal ? 'เกินเป้า ' + U.fm(m.income - goal) : 'เหลือ ' + U.fm(goal - m.income)) + '</span></div>';

      // expense breakdown
      const cats = Object.entries(m.byCat).sort((a, b) => b[1] - a[1]), cmx = Math.max(1, ...cats.map(c => c[1]));
      const breakdown = cats.length ? cats.map(([k, v]) => '<div class="ap"><div style="display:flex;justify-content:space-between"><span>' + esc(k) + '</span><b>' + U.fm(v) + '</b></div><div class="bar" style="margin-top:6px"><i style="width:' + Math.round(v / cmx * 100) + '%"></i></div></div>').join('') : W.empty('ยังไม่มีค่าใช้จ่ายในเดือนนี้');

      // ledger
      const q = s.q.trim().toLowerCase();
      const all = store.ledger(s.ym).filter(r => (s.tf === 'all' || (s.tf === 'pending' ? r.status === 'pending' : r.type === s.tf)) && (!q || r.desc.toLowerCase().includes(q) || r.cat.toLowerCase().includes(q)));
      const list = all.slice(0, s.limit);
      const table = list.length ? '<table class="rt"><thead><tr><th>วันที่</th><th>รายละเอียด</th><th>หมวด</th><th class="num">จำนวน</th><th>ช่องทาง</th><th>สถานะ</th><th></th></tr></thead><tbody>'
        + list.map(r => {
          const act = r.src === 'appt'
            ? (r.status === 'pending' ? '<button class="bt sm" data-act="payAppt" data-arg="' + r.id + '">รับชำระ</button>' : '<a class="bt sm o" href="#/schedule?sel=' + r.id + '">ดูบิล</a>')
            : (r.status === 'pending' ? '<button class="bt sm" data-act="markPaid" data-arg="' + r.id + '">ชำระแล้ว</button> ' : '') + '<button class="bt sm o" data-act="editTx" data-arg="' + r.id + '">แก้ไข</button>';
          return '<tr data-key="' + r.id + '"><td>' + U.thShort(r.date) + '</td><td>' + esc(r.desc) + '</td><td>' + esc(r.cat) + '</td><td class="num ' + (r.type === 'in' ? 'gr' : 'rd') + '">' + (r.type === 'in' ? '+' : '−') + U.fm(r.amount).replace('−', '') + '</td><td>' + esc(r.method) + '</td><td>' + W.chip(r.status === 'paid' ? 'สำเร็จ' : 'รอชำระ', r.status === 'paid' ? 's1' : 's2') + '</td><td style="white-space:nowrap">' + act + '</td></tr>';
        }).join('') + '</tbody></table>'
        + (all.length > list.length ? '<div style="text-align:center;margin-top:14px"><button class="bt o" data-act="more">แสดงเพิ่ม (' + (all.length - list.length) + ')</button></div>' : '')
        : W.empty('ไม่มีรายการที่ตรงกับตัวกรอง');

      return W.hero({
        title: 'กำไร' + (isCur ? 'เดือนนี้' : ' ' + U.thMonthS(s.ym)) + ' ' + (m.profit < 0 ? '−' : '') + '฿' + U.num(Math.abs(m.profit)),
        sub: 'รายได้ทำได้ ' + goalPct + '% ของเป้าหมาย ' + U.fm(goal) + (m.pendingOut ? ' · รายจ่ายค้างชำระ ' + U.fm(m.pendingOut) : ''),
        btn: { label: 'ตั้งเป้าหมาย', act: 'goal' }, art: 'chart'
      })
        + '<div class="row"><div class="mo" style="gap:12px"><button data-act="mo" data-arg="-1" aria-label="เดือนก่อนหน้า">‹</button><h1 style="margin:0">การเงิน · ' + U.thMonth(s.ym) + '</h1><button data-act="mo" data-arg="1" aria-label="เดือนถัดไป"' + (isCur ? ' disabled style="opacity:.4"' : '') + '>›</button></div>'
        + '<button class="bt" style="margin-left:auto" data-act="addTx" data-arg="in">+ รายรับ</button><button class="bt d" data-act="addTx" data-arg="out">+ รายจ่าย</button><button class="bt o" data-act="csv">ส่งออก CSV</button></div>'
        + '<div class="g"><div class="c lf"><div class="kl">รายได้รวม</div><div class="k sm">' + U.fm(m.income) + '</div>' + delta(m.income, prev.income, true, cmpLabel) + '</div>'
        + '<div class="c lf"><div class="kl">ค่าใช้จ่ายรวม</div><div class="k sm">' + U.fm(m.expense) + '</div>' + delta(m.expense, prev.expense, false, cmpLabel) + '</div>'
        + '<div class="c lf"><div class="kl">กำไรสุทธิ</div><div class="k sm ' + (m.profit < 0 ? 'rd' : '') + '">' + U.fm(m.profit) + '</div><div class="gr" style="text-align:center">รายได้ − ค่าใช้จ่าย</div></div>'
        + '<div class="c lf"><div class="kl">ค่าคอมมิชชัน</div><div class="k sm">' + U.fm(m.commission) + '</div><div class="sub" style="text-align:center">จากงานที่เสร็จ ' + m.appts.length + ' งาน</div></div></div>'
        + '<div class="c rs" style="margin-bottom:22px"><h2>รายได้รายเดือน (พันบาท)</h2><div class="mbars">' + bars + '</div></div>'
        + '<div class="g2"><div class="c"><h2>ความคืบหน้าเทียบเป้า ' + U.fm(goal) + '</h2>' + donut + '</div><div class="c"><h2>สัดส่วนค่าใช้จ่าย</h2>' + breakdown + '</div></div>'
        + '<div class="c" style="overflow-x:auto"><div class="row" style="margin-bottom:10px"><h2 style="margin:0">รายการ' + (isCur ? 'เดือนนี้' : '') + '</h2>'
        + '<input class="si" type="search" placeholder="ค้นหารายการ" value="' + esc(s.q) + '" data-in="q" aria-label="ค้นหารายการ" style="margin-left:auto">'
        + W.segs([['all', 'ทั้งหมด'], ['in', 'รายรับ'], ['out', 'รายจ่าย'], ['pending', 'รอชำระ']], s.tf, 'tf') + '</div>' + table + '</div>'
        + '<button class="fab" aria-label="บันทึกรายจ่าย" data-act="addTx" data-arg="out">' + S.I.plus + '</button>';
    },
    actions: {
      mo(el) {
        const s = S.pageState('finance', page.init), n = U.addMonths(s.ym, Number(el.dataset.arg));
        if (n <= U.ym(U.today())) { s.ym = n; s.limit = 15; S.render(); }
      },
      tf(el) { Object.assign(S.pageState('finance', page.init), { tf: el.dataset.arg, limit: 15 }); S.render(); },
      q(el) { S.pageState('finance', page.init).q = el.value; S.render(); },
      more() { S.pageState('finance', page.init).limit += 20; S.render(); },
      addTx(el) { S.Forms.tx(el.dataset.arg); },
      editTx(el) { S.Forms.tx(null, el.dataset.arg); },
      delTx(el) {
        const id = el.dataset.arg;
        S.store.update(st => { st.tx = st.tx.filter(t => t.id !== id); });
        S.closeModal(); S.toast('ลบรายการแล้ว');
      },
      markPaid(el) { S.store.update(st => { st.tx.find(t => t.id === el.dataset.arg).status = 'paid'; }); S.toast('บันทึกว่าชำระแล้ว'); },
      payAppt(el) { S.Forms.payment(el.dataset.arg); },
      goal() {
        S.modal({
          title: 'ตั้งเป้าหมายรายได้ต่อเดือน',
          body: '<label class="fld"><span>เป้าหมาย (บาท)</span><input class="fi" name="goal" type="number" min="1000" step="1000" value="' + S.store.state.settings.goal + '" autofocus></label><label class="fld"><span>ชื่อร้าน (แสดงบนบิล)</span><input class="fi" name="shop" value="' + esc(S.store.state.settings.shop) + '"></label>',
          submit(d) {
            const g = Math.round(Number(d.goal));
            if (!(g >= 1000)) return 'กรุณากรอกเป้าหมายอย่างน้อย ฿1,000';
            if (!d.shop) return 'กรุณากรอกชื่อร้าน';
            S.store.update(st => { st.settings.goal = g; st.settings.shop = d.shop; });
            S.toast('บันทึกการตั้งค่าแล้ว');
          }
        });
      },
      csv() {
        const s = S.pageState('finance', page.init);
        const rows = [['วันที่', 'รายละเอียด', 'หมวด', 'ประเภท', 'จำนวน', 'ช่องทาง', 'สถานะ']]
          .concat(S.store.ledger(s.ym).map(r => [r.date, r.desc, r.cat, r.type === 'in' ? 'รายรับ' : 'รายจ่าย', r.type === 'in' ? r.amount : -r.amount, r.method, r.status === 'paid' ? 'สำเร็จ' : 'รอชำระ']));
        U.download('solva-finance-' + s.ym + '.csv', new Blob([U.csv(rows)], { type: 'text/csv;charset=utf-8' }));
        S.toast('ส่งออกรายการแล้ว');
      }
    }
  };
  S.pages.finance = page;
})(window.Solva = window.Solva || {});
