// สต็อก — products with low-stock status, stock in/out log, reorder flow
// (which also records the purchase as a materials expense).
(function (S) {
  'use strict';
  const U = S.U, W = S.W, F = S.F, esc = U.esc;

  const page = {
    init: () => ({ cat: 'all', sf: 'all', q: '' }),
    enter(p) { const s = S.pageState('inventory', page.init); if (p.q) Object.assign(s, { q: p.q, sf: 'all', cat: 'all' }); },
    render(s) {
      const store = S.store, ps = store.state.products;
      const stat = Object.fromEntries(ps.map(p => [p.id, F.productStatus(p)]));
      const n = k => ps.filter(p => stat[p.id].k === k).length;
      const low = n('low'), out = n('out');
      const cats = Array.from(new Set(ps.map(p => p.cat)));
      const q = s.q.trim().toLowerCase();
      const rows = ps.filter(p => (s.cat === 'all' || p.cat === s.cat) && (s.sf === 'all' || stat[p.id].k === s.sf) && (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)))
        .sort((a, b) => ({ out: 0, low: 1, ok: 2 })[stat[a.id].k] - ({ out: 0, low: 1, ok: 2 })[stat[b.id].k] || a.name.localeCompare(b.name, 'th'));
      const value = ps.reduce((t, p) => t + p.qty * p.cost, 0);
      const kpi = (k, label, val, i) => '<button class="c lf rs ' + (s.sf === k ? 'on' : '') + '" style="--i:' + i + '" data-act="sf" data-arg="' + k + '" aria-pressed="' + (s.sf === k) + '"><div class="kl">' + label + '</div><div class="k">' + val + '</div></button>';

      const table = rows.length ? '<table class="rt"><thead><tr><th>สินค้า</th><th>SKU</th><th>หมวด</th><th>คงเหลือ</th><th>ขั้นต่ำ</th><th>สถานะ</th><th></th></tr></thead><tbody>'
        + rows.map(p => {
          const st = stat[p.id], w = Math.min(100, Math.round(p.qty / Math.max(1, p.min * 2) * 100));
          return '<tr data-key="' + p.id + '"><td><b>' + esc(p.name) + '</b></td><td>' + esc(p.sku) + '</td><td>' + esc(p.cat) + '</td><td><b>' + p.qty + '</b> ' + esc(p.unit) + '<div class="mt ' + st.cls + '"><i style="width:' + w + '%"></i></div></td><td>' + p.min + '</td><td>' + W.chip(st.label, st.cls) + '</td>'
            + '<td style="white-space:nowrap"><button class="bt sm o" data-act="move" data-arg="' + p.id + '|out" aria-label="เบิกออก ' + esc(p.name) + '"' + (p.qty ? '' : ' disabled') + '>−</button> <button class="bt sm" data-act="move" data-arg="' + p.id + '|in" aria-label="รับเข้า ' + esc(p.name) + '">+</button> <button class="bt sm d" data-act="edit" data-arg="' + p.id + '">แก้ไข</button></td></tr>';
        }).join('') + '</tbody></table>'
        : W.empty('ไม่พบสินค้าที่ตรงกับตัวกรอง<br><button class="bt o" style="margin-top:12px" data-act="clear">ล้างตัวกรอง</button>');

      const moves = store.state.movements.slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 12);
      const hist = moves.length ? moves.map(m => {
        const p = store.product(m.productId);
        return '<div class="ap">' + U.thShort(m.date) + ' ' + m.time + ' · <b class="' + (m.type === 'in' ? 'gr' : 'rd') + '">' + (m.type === 'in' ? 'รับเข้า' : 'เบิกออก') + '</b> ' + esc(p ? p.name : 'สินค้าที่ถูกลบ') + ' ' + m.qty + ' ' + esc(p ? p.unit : '') + '<br><small class="sub">โดย ' + esc(m.by) + (m.note ? ' · ' + esc(m.note) : '') + '</small></div>';
      }).join('') : W.empty('ยังไม่มีการเคลื่อนไหว');

      return W.hero({
        title: low + out ? 'ต้องสั่งเพิ่ม ' + W.cn(low + out) + ' รายการ' : 'สต็อกพร้อมใช้งาน',
        sub: low + out ? 'ใกล้หมด ' + low + ' · หมด ' + out + ' ควรสั่งซื้อก่อนสิ้นสัปดาห์' : 'สินค้าทุกรายการอยู่เหนือจุดสั่งซื้อ',
        btn: low + out ? { label: 'สั่งซื้อสินค้า', act: 'reorder' } : { label: '+ เพิ่มสินค้า', act: 'add' }, art: 'boxes'
      })
        + '<h1>สต็อกสินค้า</h1>'
        + (low + out ? '<div class="wn">⚠ Low Stock: ' + ps.filter(p => stat[p.id].k !== 'ok').map(p => esc(p.name) + ' (' + p.qty + ' ' + esc(p.unit) + ')').join(', ') + '</div>' : '')
        + '<div class="g">' + kpi('ok', 'ปกติ', W.cn(n('ok')), 4) + kpi('low', 'ใกล้หมด', W.cn(low), 5) + kpi('out', 'หมด', W.cn(out), 6)
        + '<div class="c rs" style="--i:7"><div class="kl">มูลค่าสต็อกโดยประมาณ</div><div class="k sm">' + U.fm(value) + '</div></div></div>'
        + '<div class="row"><select class="fi" style="width:auto;min-width:160px" data-ch="cat" aria-label="หมวดหมู่">' + W.opts([['all', 'ทุกหมวดหมู่']].concat(cats.map(c => [c, c])), s.cat) + '</select>'
        + '<input class="si" type="search" placeholder="ค้นหาชื่อหรือ SKU" value="' + esc(s.q) + '" data-in="q" aria-label="ค้นหาสินค้า">'
        + (s.sf !== 'all' ? '<button class="bt o" data-act="sf" data-arg="all">แสดงทุกสถานะ</button>' : '')
        + '<button class="bt" style="margin-left:auto" data-act="add">+ เพิ่มสินค้า</button><button class="bt d" data-act="move" data-arg="">บันทึกสต็อกเข้า–ออก</button></div>'
        + '<div class="g2" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr))"><div class="c" style="overflow-x:auto;grid-column:span 1">' + table + '</div><div class="c"><h2>ประวัติการเคลื่อนไหว</h2>' + hist + '</div></div>'
        + '<button class="fab" aria-label="บันทึกสต็อกเข้า–ออก" data-act="move" data-arg="">' + S.I.plus + '</button>';
    },
    actions: {
      sf(el) { const s = S.pageState('inventory', page.init), k = el.dataset.arg; s.sf = s.sf === k ? 'all' : k; S.render(); },
      cat(el) { S.pageState('inventory', page.init).cat = el.value; S.render(); },
      q(el) { S.pageState('inventory', page.init).q = el.value; S.render(); },
      clear() { Object.assign(S.pageState('inventory', page.init), { cat: 'all', sf: 'all', q: '' }); S.render(); },
      add() { S.Forms.product(); },
      edit(el) { S.Forms.product(el.dataset.arg); },
      move(el) { const [id, type] = (el.dataset.arg || '').split('|'); S.Forms.move(id || null, type || 'in'); },
      reorder() {
        const items = S.store.state.products.filter(p => F.productStatus(p).k !== 'ok');
        if (!items.length) { S.toast('ไม่มีสินค้าที่ต้องสั่งซื้อ'); return; }
        const user = S.auth.user() || {};
        const sug = p => Math.max(1, p.min * 2 - p.qty);
        const total = form => items.reduce((t, p) => t + (form.elements['on_' + p.id].checked ? Math.max(0, Math.round(Number(form.elements['q_' + p.id].value) || 0)) * p.cost : 0), 0);
        S.modal({
          title: 'สั่งซื้อ / รับสินค้าเข้า', wide: true,
          body: '<p class="sub" style="margin-top:0">จำนวนที่แนะนำ = จุดสั่งซื้อ × 2 − คงเหลือ ปรับได้ตามต้องการ เมื่อยืนยัน ระบบจะเพิ่มสต็อกและบันทึกรายจ่ายค่าวัสดุให้อัตโนมัติ</p>'
            + '<table><thead><tr><th></th><th>สินค้า</th><th>คงเหลือ</th><th>จำนวนสั่ง</th><th class="num">ต้นทุน/หน่วย</th></tr></thead><tbody>'
            + items.map(p => '<tr><td><input type="checkbox" name="on_' + p.id + '" checked aria-label="เลือก ' + esc(p.name) + '" style="width:20px;height:20px;accent-color:#FF6FFF"></td><td>' + esc(p.name) + '</td><td>' + p.qty + ' ' + esc(p.unit) + '</td><td><input class="fi" style="width:110px;min-height:38px" type="number" min="0" name="q_' + p.id + '" value="' + sug(p) + '"></td><td class="num">' + U.fm(p.cost) + '</td></tr>').join('')
            + '</tbody></table><div class="sumbox"><span>รวมค่าสินค้า</span><b class="ro-t">' + U.fm(items.reduce((t, p) => t + sug(p) * p.cost, 0)) + '</b></div>',
          submitLabel: 'ยืนยันรับสินค้าเข้า',
          input(form) { form.querySelector('.ro-t').textContent = U.fm(total(form)); },
          submit(d, form) {
            const picked = items.map(p => ({ p, qty: form.elements['on_' + p.id].checked ? Math.max(0, Math.round(Number(form.elements['q_' + p.id].value) || 0)) : 0 })).filter(x => x.qty > 0);
            if (!picked.length) return 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ';
            const amount = picked.reduce((t, x) => t + x.qty * x.p.cost, 0);
            S.store.update(st => {
              picked.forEach(x => {
                st.products.find(p => p.id === x.p.id).qty += x.qty;
                st.movements.push({ id: U.uid('m'), date: U.today(), time: U.nowHM(), productId: x.p.id, type: 'in', qty: x.qty, by: user.name || 'เจ้าของร้าน', note: 'สั่งซื้อเติมสต็อก' });
              });
              if (amount > 0) st.tx.push({ id: U.uid('t'), date: U.today(), desc: 'สั่งซื้อสินค้าเติมสต็อก ' + picked.length + ' รายการ', cat: 'วัสดุ', type: 'out', amount, method: 'โอน', status: 'paid' });
            });
            S.toast('รับสินค้าเข้า ' + picked.length + ' รายการ · บันทึกรายจ่าย ' + U.fm(amount));
          }
        });
      }
    }
  };
  S.pages.inventory = page;
})(window.Solva = window.Solva || {});
