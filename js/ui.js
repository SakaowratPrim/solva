// UI core: tiny DOM-morphing renderer, event delegation, app shell, modal, toast,
// shared widgets (hero, icons) and the canvas PNG generator for bills/reports.
(function (S) {
  'use strict';
  const U = S.U, esc = U.esc;

  // ------------------------------------------------------------------ icons
  const sv = (d, w) => '<svg width="' + (w || 24) + '" height="' + (w || 24) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const I = {
    home: sv('<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>'),
    cal: sv('<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
    heart: sv('<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>'),
    team: sv('<circle cx="12" cy="8" r="3"/><circle cx="5" cy="10" r="2"/><circle cx="19" cy="10" r="2"/><path d="M6 20c0-4 3-6 6-6s6 2 6 6"/>'),
    chart: sv('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 16v-4M12 16V8M15 16v-6"/>'),
    stock: sv('<path d="M4 20h16M5 20v-7h5v7M10 20V9h5v11M15 20v-5h4v5"/>'),
    bell: sv('<path d="M6 17h12l-1.5-2v-4a4.5 4.5 0 0 0-9 0v4zM10 20h4"/>'),
    user: sv('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-5.5 7-5.5s6 1.5 7 5.5"/>'),
    plus: '<svg width="32" height="32" viewBox="0 0 32 32" stroke="#FF9AFF" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M16 5v22M5 16h22"/></svg>',
    emptyHeart: '<svg width="84" height="84" viewBox="0 0 100 100" aria-hidden="true"><g class="fl"><path d="M50 84S16 64 16 40a17 17 0 0 1 34-6 17 17 0 0 1 34 6c0 24-34 44-34 44z" fill="#FFDFFF" stroke="#FF9AFF" stroke-width="4"/></g></svg>'
  };
  S.I = I;

  const SPARK = d => '<path class="tw" style="animation-delay:' + d[0] + 's" d="M0-12L3-3L12 0L3 3L0 12L-3 3L-12 0L-3-3Z" fill="#fff" transform="translate(' + d[1] + ' ' + d[2] + ')"/>';
  const ARTS = {
    bottle: '<g class="fl"><rect x="90" y="14" width="40" height="40" rx="10" fill="#2B2D3A"/><rect x="98" y="52" width="24" height="14" fill="#8A8190"/><rect x="64" y="64" width="92" height="116" rx="28" fill="url(#hbg)" stroke="#fff" stroke-width="4"/><rect x="76" y="80" width="12" height="76" rx="6" fill="#fff" opacity=".55"/></g>',
    clock: '<g class="fl"><circle cx="110" cy="104" r="66" fill="#fff" stroke="#FF9AFF" stroke-width="8"/><g class="hh"><rect x="107" y="62" width="6" height="44" rx="3" fill="#2B2D3A"/></g><g class="mh"><rect x="108" y="74" width="4" height="32" rx="2" fill="#FF6FFF"/></g><circle cx="110" cy="104" r="5" fill="#2B2D3A"/></g>',
    heart: '<g class="bt2"><path d="M110 170S50 132 50 90a31 31 0 0 1 60-12 31 31 0 0 1 60 12c0 42-60 80-60 80z" fill="url(#hbg)" stroke="#fff" stroke-width="4"/></g>',
    team: '<g class="fl"><circle cx="110" cy="80" r="26" fill="url(#hbg)" stroke="#fff" stroke-width="4"/><path d="M62 164c0-30 22-44 48-44s48 14 48 44z" fill="url(#hbg)" stroke="#fff" stroke-width="4"/></g><g class="fl" style="animation-delay:-1.5s"><circle cx="46" cy="98" r="18" fill="#fff" opacity=".9"/><circle cx="174" cy="98" r="18" fill="#fff" opacity=".9"/></g>',
    chart: '<rect class="gb" style="animation-delay:.1s" x="52" y="120" width="28" height="50" rx="8" fill="#fff"/><rect class="gb" style="animation-delay:.3s" x="96" y="96" width="28" height="74" rx="8" fill="#FF9AFF" stroke="#fff" stroke-width="3"/><rect class="gb" style="animation-delay:.5s" x="140" y="60" width="28" height="110" rx="8" fill="url(#hbg)" stroke="#fff" stroke-width="3"/><path class="dl" d="M50 100L98 74L132 84L178 36" fill="none" stroke="#2B2D3A" stroke-width="5" stroke-linecap="round"/>',
    boxes: '<g class="fl"><rect x="56" y="110" width="52" height="56" rx="10" fill="#fff" stroke="#FF9AFF" stroke-width="4"/><rect x="112" y="110" width="52" height="56" rx="10" fill="url(#hbg)" stroke="#fff" stroke-width="4"/><rect x="84" y="54" width="52" height="56" rx="10" fill="#fff" stroke="#FF9AFF" stroke-width="4"/></g>'
  };

  // Big pink banner at the top of every page.
  function hero(o) {
    const btn = o.btn ? (o.btn.href
      ? '<a class="bt" href="' + esc(o.btn.href) + '">' + esc(o.btn.label) + '</a>'
      : '<button class="bt" data-act="' + esc(o.btn.act) + '"' + (o.btn.arg ? ' data-arg="' + esc(o.btn.arg) + '"' : '') + '>' + esc(o.btn.label) + '</button>') : '';
    return '<section class="hero rs"><span class="bl" style="width:200px;height:200px;left:-40px;top:-60px"></span><span class="bl" style="width:160px;height:160px;right:30%;bottom:-70px;opacity:.4"></span>'
      + '<div class="tx"><div class="hl">' + o.title + '</div><div class="hs">' + esc(o.sub) + '</div>' + btn + '</div>'
      + '<svg width="220" height="200" viewBox="0 0 220 200" aria-hidden="true"><defs><linearGradient id="hbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF9AFF"/><stop offset="1" stop-color="#FF5FEA"/></linearGradient></defs>'
      + ARTS[o.art || 'bottle'] + [[0, 30, 50], [0.8, 196, 36], [1.5, 200, 130], [0.4, 24, 150]].map(SPARK).join('') + '</svg></section>';
  }
  const cn = n => '<b class="cn" style="--v:' + Math.max(0, Math.round(n)) + '"></b>';
  const empty = (msg, btn) => '<div class="em">' + I.emptyHeart + '<div>' + msg + (btn || '') + '</div></div>';
  const opts = (list, sel) => list.map(o => {
    const [v, l] = Array.isArray(o) ? o : [o, o];
    return '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + esc(l) + '</option>';
  }).join('');
  const segs = (list, cur, act) => '<div class="sg">' + list.map(([k, n]) => '<button class="' + (cur === k ? 'on' : '') + '" data-act="' + act + '" data-arg="' + esc(k) + '">' + esc(n) + '</button>').join('') + '</div>';
  const tabs = (list, cur, act) => '<div class="tabs" role="tablist">' + list.map((n, i) => '<button role="tab" aria-selected="' + (cur === i) + '" class="' + (cur === i ? 'on' : '') + '" data-act="' + act + '" data-arg="' + i + '">' + esc(n) + '</button>').join('') + '</div>';
  const kv = (k, v) => '<div class="kv"><span>' + esc(k) + '</span><b>' + v + '</b></div>';
  const chip = (label, cls) => '<span class="ch ' + (cls || '') + '">' + esc(label) + '</span>';

  S.W = { hero, cn, empty, opts, segs, tabs, kv, chip };

  // ------------------------------------------------------------------ ui state
  const ui = S.ui = { route: { name: 'login', params: {} }, pages: {}, modal: null, pop: null, q: '', toast: '', lastRoute: '' };
  S.pages = S.pages || {};
  S.pageState = (name, init) => (ui.pages[name] = ui.pages[name] || init());

  // ------------------------------------------------------------------ auth (demo only — no server yet)
  const SESSION = 'solva:session';
  S.auth = {
    user() {
      try { return JSON.parse(sessionStorage.getItem(SESSION) || localStorage.getItem(SESSION) || 'null'); } catch (e) { return null; }
    },
    login(id, acc, remember) {
      const u = JSON.stringify({ id, name: acc.name, role: acc.role || 'owner' });
      try { (remember ? localStorage : sessionStorage).setItem(SESSION, u); } catch (e) { /* ignore */ }
    },
    logout() { try { localStorage.removeItem(SESSION); sessionStorage.removeItem(SESSION); } catch (e) { /* ignore */ } }
  };

  // ------------------------------------------------------------------ morph
  function morph(from, to) {
    if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) { from.replaceWith(to); return; }
    if (from.nodeType === 3 || from.nodeType === 8) { if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue; return; }
    if (from.getAttribute('data-key') !== to.getAttribute('data-key')) { from.replaceWith(to); return; }
    const tag = from.nodeName;
    // Form state: only push values that changed in the template, so user typing survives re-renders.
    if (tag === 'INPUT') {
      if (from.type === 'checkbox' || from.type === 'radio') {
        if (from.hasAttribute('checked') !== to.hasAttribute('checked')) from.checked = to.hasAttribute('checked');
      } else if (from.getAttribute('value') !== to.getAttribute('value')) {
        from.value = to.getAttribute('value') || '';
      }
    }
    if (tag === 'OPTION' && from.hasAttribute('selected') !== to.hasAttribute('selected')) from.selected = to.hasAttribute('selected');
    for (const a of Array.from(from.attributes)) if (!to.hasAttribute(a.name)) from.removeAttribute(a.name);
    for (const a of Array.from(to.attributes)) if (from.getAttribute(a.name) !== a.value) from.setAttribute(a.name, a.value);
    if (tag === 'TEXTAREA') { if (from.defaultValue !== to.defaultValue) from.value = to.defaultValue; return; }
    const fc = Array.from(from.childNodes), tc = Array.from(to.childNodes);
    tc.forEach((n, i) => { if (i < fc.length) morph(fc[i], n); else from.appendChild(n); });
    for (let i = tc.length; i < fc.length; i++) fc[i].remove();
  }

  // ------------------------------------------------------------------ router
  function parseHash() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    const [name, qs] = h.split('?');
    const params = {};
    if (qs) qs.split('&').forEach(p => { const [k, v] = p.split('='); if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
    return { name: name || 'dashboard', params };
  }
  S.go = hash => { if (location.hash === hash) route(); else location.hash = hash; };

  function route() {
    const r = parseHash();
    const user = S.auth.user();
    if (!user && r.name !== 'login') { location.replace('#/login'); return; }
    if (user && r.name === 'login') { location.replace('#/dashboard'); return; }
    if (!S.pages[r.name]) { location.replace('#/dashboard'); return; }
    ui.route = r; ui.pop = null; ui.modal = null;
    const p = S.pages[r.name];
    if (p.enter) p.enter(r.params);
    render(true);
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------------ shell
  const NAV = [['dashboard', 'ภาพรวม', 'home'], ['schedule', 'ตารางนัด', 'cal'], ['clients', 'ลูกค้า', 'heart'], ['staff', 'พนักงาน', 'team'], ['finance', 'การเงิน', 'chart'], ['inventory', 'สต็อก', 'stock']];

  function searchResults(q) {
    const st = S.store.state, s = q.trim().toLowerCase();
    if (!s) return '';
    const has = v => String(v || '').toLowerCase().includes(s);
    const cl = st.clients.filter(c => has(c.name) || has(c.nick) || has(c.phone)).slice(0, 5);
    const sf = st.staff.filter(x => has(x.nick) || has(x.full)).slice(0, 3);
    const pr = st.products.filter(p => has(p.name) || has(p.sku)).slice(0, 4);
    const today = U.today();
    const ap = st.appts.filter(a => a.date >= today && S.F.isActive(a) && has((S.store.client(a.clientId) || {}).name)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 4);
    let h = '';
    if (cl.length) h += '<h3>ลูกค้า</h3>' + cl.map(c => '<a href="#/clients?sel=' + c.id + '">' + esc(c.name) + ' <small>' + esc(c.phone) + '</small></a>').join('');
    if (ap.length) h += '<h3>นัดหมาย</h3>' + ap.map(a => '<a href="#/schedule?date=' + a.date + '&sel=' + a.id + '">' + esc(U.thShort(a.date)) + ' ' + a.time + ' · ' + esc(S.store.client(a.clientId).name) + '</a>').join('');
    if (sf.length) h += '<h3>พนักงาน</h3>' + sf.map(x => '<a href="#/staff?sel=' + x.id + '">' + esc(x.nick) + ' <small>' + esc(x.full) + '</small></a>').join('');
    if (pr.length) h += '<h3>สินค้า</h3>' + pr.map(p => '<a href="#/inventory?q=' + encodeURIComponent(p.name) + '">' + esc(p.name) + ' <small>คงเหลือ ' + p.qty + ' ' + esc(p.unit) + '</small></a>').join('');
    return '<div class="pop" role="listbox">' + (h || '<div class="emp">ไม่พบผลลัพธ์สำหรับ “' + esc(q) + '”</div>') + '</div>';
  }

  function shell(page) {
    const user = S.auth.user() || { name: '' };
    const notes = S.store.notifications();
    const cur = ui.route.name;
    let pop = '';
    if (ui.pop === 'search') pop = searchResults(ui.q);
    if (ui.pop === 'notif') pop = '<div class="pop"><h3>การแจ้งเตือน</h3>' + (notes.length ? notes.map(n => '<a class="' + n.cls + '" href="' + n.href + '">' + esc(n.text) + '</a>').join('') : '<div class="emp">ไม่มีการแจ้งเตือน</div>') + '</div>';
    if (ui.pop === 'acct') pop = '<div class="pop" style="width:280px"><h3>บัญชี</h3><div style="padding:6px 12px 10px"><b>' + esc(user.name) + '</b><br><small>' + esc(user.id || '') + '</small></div>'
      + '<button class="it" data-act="exportData">ส่งออกข้อมูล (JSON)</button>'
      + '<button class="it" data-act="importData">นำเข้าข้อมูลจากไฟล์</button>'
      + '<button class="it" data-act="resetData">รีเซ็ตเป็นข้อมูลเดโม</button>'
      + '<button class="it rd" data-act="logout">ออกจากระบบ</button></div>';
    return '<div class="app"><nav class="sb" aria-label="เมนูหลัก"><div class="lg">Solva</div>'
      + NAV.map(([k, n, ic]) => '<a href="#/' + k + '" class="' + (cur === k ? 'on' : '') + '"' + (cur === k ? ' aria-current="page"' : '') + '>' + I[ic] + n + '</a>').join('')
      + '</nav><main class="mn"><header class="hd"><div><div class="hi">Welcome back' + (user.name ? ', ' + esc(user.name) : '') + '</div><div class="sub">' + U.thLong(U.today()) + '</div></div>'
      + '<div class="hr"><input type="search" placeholder="ค้นหาลูกค้า นัดหมาย สินค้า" aria-label="ค้นหา" value="' + esc(ui.q) + '" data-in="gsearch" data-act="gsearchFocus" autocomplete="off">'
      + '<button class="ic ring" aria-label="แจ้งเตือน" data-act="pop" data-arg="notif">' + I.bell + (notes.length ? '<s>' + notes.length + '</s>' : '') + '</button>'
      + '<button class="av2" aria-label="บัญชีผู้ใช้" data-act="pop" data-arg="acct">' + esc(U.initial(user.name)) + '</button>' + pop + '</div></header>'
      + page + '</main></div>';
  }

  // ------------------------------------------------------------------ modal
  // S.modal({ title, body, wide, submitLabel, footLeft, submit(data, form) -> error string | undefined, input(form, ev) })
  S.modal = m => { ui.modal = m; ui.pop = null; render(); setTimeout(() => { const f = document.querySelector('.md [autofocus], .md .fi'); if (f) f.focus(); }, 30); };
  S.closeModal = () => { ui.modal = null; render(); };
  function modalHtml() {
    const m = ui.modal;
    if (!m) return '';
    return '<div class="ov" data-act="modalBg"><form class="md' + (m.wide ? ' wide' : '') + '" data-sub="modal" data-in="modalInput" novalidate role="dialog" aria-modal="true" aria-label="' + esc(m.title) + '">'
      + '<header><h2>' + esc(m.title) + '</h2><button type="button" class="x" data-act="closeModal" aria-label="ปิด">×</button></header>'
      + m.body + '<div class="err" role="alert"></div>'
      + (m.submit ? '<footer>' + (m.footLeft || '') + '<button type="button" class="bt d" data-act="closeModal">ยกเลิก</button><button type="submit" class="bt">' + esc(m.submitLabel || 'บันทึก') + '</button></footer>' : '')
      + '</form></div>';
  }
  function formData(form) {
    const o = {};
    for (const el of Array.from(form.elements)) {
      if (!el.name || el.disabled) continue;
      if (el.name.endsWith('[]')) { const k = el.name.slice(0, -2); o[k] = o[k] || []; if (el.checked) o[k].push(el.value); continue; }
      if (el.type === 'checkbox') { o[el.name] = el.checked; continue; }
      if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; continue; }
      o[el.name] = typeof el.value === 'string' ? el.value.trim() : el.value;
    }
    return o;
  }
  S.formData = formData;

  // ------------------------------------------------------------------ toast
  let toastTimer = 0;
  S.toast = msg => {
    ui.toast = msg; render();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { ui.toast = ''; render(); }, 2600);
  };

  // ------------------------------------------------------------------ render
  let root;
  function render(force) {
    if (!root) return;
    const page = S.pages[ui.route.name];
    const st = S.pageState(ui.route.name, page.init || (() => ({})));
    const body = ui.route.name === 'login' ? page.render(st) : shell(page.render(st));
    const html = body + modalHtml() + (ui.toast ? '<div class="to" role="status">' + esc(ui.toast) + '</div>' : '');
    const key = ui.route.name;
    if (force || key !== ui.lastRoute) { root.innerHTML = html; ui.lastRoute = key; return; }
    const tpl = document.createElement('div');
    tpl.innerHTML = html;
    morph(root, Object.assign(tpl, { id: root.id, className: root.className }));
  }
  S.render = render;

  // ------------------------------------------------------------------ global actions
  const G = {
    pop(el) { ui.pop = ui.pop === el.dataset.arg ? null : el.dataset.arg; render(); },
    gsearchFocus() { if (ui.q && ui.pop !== 'search') { ui.pop = 'search'; render(); } },
    closeModal() { S.closeModal(); },
    modalBg(el, ev) { if (ev.target === el) S.closeModal(); },
    logout() { S.auth.logout(); S.go('#/login'); },
    exportData() {
      U.download('solva-data-' + U.today() + '.json', new Blob([S.store.exportJSON()], { type: 'application/json' }));
      ui.pop = null; S.toast('ส่งออกข้อมูลแล้ว');
    },
    importData() {
      ui.pop = null; render();
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'application/json,.json';
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        if (!f) return;
        f.text().then(t => { S.store.importJSON(t); S.toast('นำเข้าข้อมูลเรียบร้อย'); }).catch(() => S.toast('ไฟล์ไม่ถูกต้อง นำเข้าไม่สำเร็จ'));
      };
      inp.click();
    },
    resetData() {
      S.modal({
        title: 'รีเซ็ตข้อมูลเดโม',
        body: '<p>ข้อมูลทั้งหมดที่บันทึกไว้ในเบราว์เซอร์นี้ (นัดหมาย ลูกค้า การเงิน สต็อก) จะถูกแทนที่ด้วยข้อมูลตัวอย่าง ต้องการดำเนินการต่อหรือไม่?</p>',
        submitLabel: 'รีเซ็ตข้อมูล',
        submit() { S.store.reset(); ui.pages = {}; setTimeout(() => S.toast('รีเซ็ตข้อมูลเรียบร้อย'), 0); }
      });
    }
  };

  function handler(name) {
    const p = S.pages[ui.route.name];
    return (p && p.actions && p.actions[name]) || G[name];
  }

  function bind() {
    document.addEventListener('click', ev => {
      const el = ev.target.closest('[data-act]');
      if (ui.pop && !ev.target.closest('.pop') && !(el && (el.dataset.act === 'pop' || el.dataset.act === 'gsearchFocus'))) {
        ui.pop = null; render();
      }
      if (!el || el.tagName === 'INPUT' && el.dataset.act !== 'gsearchFocus') return;
      const h = handler(el.dataset.act);
      if (h) { if (el.tagName === 'A' && !el.getAttribute('href')) ev.preventDefault(); h(el, ev); }
    });
    document.addEventListener('input', ev => {
      const el = ev.target.closest('[data-in]');
      if (!el) return;
      if (el.dataset.in === 'gsearch') { ui.q = el.value; ui.pop = ui.q.trim() ? 'search' : null; render(); return; }
      if (el.dataset.in === 'modalInput') { if (ui.modal && ui.modal.input) ui.modal.input(el, ev); return; }
      const h = handler(el.dataset.in);
      if (h) h(el, ev);
    });
    document.addEventListener('change', ev => {
      const el = ev.target.closest('[data-ch]');
      if (!el) return;
      const h = handler(el.dataset.ch);
      if (h) h(el, ev);
    });
    document.addEventListener('submit', ev => {
      const form = ev.target;
      if (!form.dataset.sub) return;
      ev.preventDefault();
      if (form.dataset.sub === 'modal') {
        const m = ui.modal;
        if (!m || !m.submit) return;
        const err = m.submit(formData(form), form);
        if (err) { const box = form.querySelector('.err'); if (box) box.textContent = err; return; }
        if (ui.modal === m) S.closeModal();
        return;
      }
      const h = handler(form.dataset.sub);
      if (h) h(form, ev);
    });
    document.addEventListener('keydown', ev => {
      if (ev.key !== 'Escape') return;
      if (ui.modal) S.closeModal(); else if (ui.pop) { ui.pop = null; render(); }
    });
    window.addEventListener('hashchange', route);
  }

  S.boot = () => {
    root = document.getElementById('app');
    S.store.load();
    S.store.subscribe(() => render());
    bind();
    route();
  };

  // ------------------------------------------------------------------ PNG (bills & reports)
  const FN = '"Noto Sans Thai","Figtree",sans-serif', BGC = '#FFE9FF';
  const SEG = (typeof Intl !== 'undefined' && Intl.Segmenter) ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
  function wrapT(c, t, w) {
    const ps = SEG ? Array.from(SEG.segment(String(t))).map(x => x.segment) : Array.from(String(t)), o = [];
    let l = '';
    for (const p of ps) { const n = l + p; if (l && c.measureText(n).width > w) { o.push(l.trim()); l = p.trimStart(); } else l = n; }
    o.push(l.trim());
    return o;
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  // spec: { w, shop, title, info:[[k,v]], cols:[{w,al}], head:[], rows:[[cell|{t,chip:[bg,fg]}]], sum:[{k,v,big}], pay:[[k,v,colors]], notes:[], foot:[] }
  async function mkPng(S_) {
    try { await Promise.all(['400 15px "Noto Sans Thai"', '700 15px "Noto Sans Thai"', '44px Satisfy'].map(f => document.fonts.load(f, 'กA'))); } catch (e) { /* offline fonts */ }
    const W = S_.w, X0 = 44, IW = W - 88, SC = 2;
    const run = (c, d, H) => {
      let y;
      const F = (b, s) => { c.font = (b ? '700 ' : '400 ') + s + 'px ' + FN; };
      const tx = (t, x, yy, o) => { o = o || {}; F(o.b, o.s || 15); if (d) { c.fillStyle = o.c || '#2B2D3A'; c.textAlign = o.a || 'left'; c.fillText(t, x, yy); } };
      const dash = yy => { if (d) { c.save(); c.setLineDash([6, 5]); c.strokeStyle = '#C4C4C4'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(30, yy); c.lineTo(W - 30, yy); c.stroke(); c.restore(); c.fillStyle = BGC; c.beginPath(); c.arc(16, yy, 13, 0, 7); c.fill(); c.beginPath(); c.arc(W - 16, yy, 13, 0, 7); c.fill(); } };
      if (d) {
        c.fillStyle = BGC; c.fillRect(0, 0, W, H);
        c.save(); c.shadowColor = 'rgba(60,40,70,.18)'; c.shadowBlur = 24; c.shadowOffsetY = 8; rr(c, 16, 16, W - 32, H - 32, 28); c.fillStyle = '#fff'; c.fill(); c.restore();
        const g = c.createLinearGradient(16, 16, W - 16, 150); g.addColorStop(0, '#FF9AFF'); g.addColorStop(1, '#FFDFFF');
        c.save(); rr(c, 16, 16, W - 32, H - 32, 28); c.clip(); c.fillStyle = g; c.fillRect(16, 16, W - 32, 132); c.restore();
        c.font = '46px Satisfy,cursive'; c.fillStyle = '#2B2D3A'; c.textAlign = 'center'; c.fillText('Solva', W / 2, 86);
      }
      tx(S_.shop, W / 2, 116, { a: 'center', s: 14 }); y = 190;
      tx(S_.title, W / 2, y, { a: 'center', b: 1, s: 21 }); y += 34;
      S_.info.forEach(([k, v]) => { F(1, 15); const ls = wrapT(c, v, IW * 0.62); tx(k, X0, y, { c: '#6B6D7A' }); ls.forEach((l, i) => tx(l, W - X0, y + i * 22, { a: 'right', b: 1 })); y += ls.length * 22 + 6; });
      y += 10;
      if (S_.cols) {
        const xs = []; let a = X0; S_.cols.forEach(cl => { xs.push(a); a += cl.w * IW; });
        const cx = i => { const cl = S_.cols[i]; return cl.al === 'r' ? xs[i] + cl.w * IW - 4 : cl.al === 'c' ? xs[i] + cl.w * IW / 2 : xs[i] + 4; };
        const ta = i => ({ r: 'right', c: 'center', l: 'left' })[S_.cols[i].al];
        if (d) { rr(c, X0 - 8, y - 20, IW + 16, 30, 15); c.fillStyle = '#FFDFFF'; c.fill(); }
        S_.head.forEach((h, i) => tx(h, cx(i), y, { b: 1, s: 14, a: ta(i) })); y += 30;
        S_.rows.forEach(r => {
          const ls = r.map((v, i) => { F(0, 14.5); return wrapT(c, typeof v === 'object' ? v.t : v, S_.cols[i].w * IW - 10); });
          const n = Math.max(...ls.map(l => l.length));
          r.forEach((v, i) => {
            if (typeof v === 'object' && v.chip) {
              F(1, 12.5); const w = c.measureText(v.t).width + 20;
              if (d) { rr(c, cx(i) - w / 2, y - 16, w, 22, 11); c.fillStyle = v.chip[0]; c.fill(); }
              tx(v.t, cx(i), y, { b: 1, s: 12.5, a: 'center', c: v.chip[1] });
            } else ls[i].forEach((l, j) => tx(l, cx(i), y + j * 21, { s: 14.5, a: ta(i) }));
          });
          y += n * 21 + 8;
          if (d) { c.strokeStyle = '#F0EEF1'; c.lineWidth = 1; c.beginPath(); c.moveTo(X0, y - 14); c.lineTo(W - X0, y - 14); c.stroke(); }
        });
        y += 6;
      }
      S_.sum.forEach(r => {
        if (r.big) { y += 6; dash(y); y += 34; tx(r.k, X0, y, { b: 1, s: 18 }); tx(r.v, W - X0, y + 2, { b: 1, s: 30, a: 'right' }); y += 40; }
        else { tx(r.k, X0, y, { c: '#6B6D7A' }); tx(r.v, W - X0, y, { a: 'right', b: 1 }); y += 28; }
      });
      (S_.pay || []).forEach(r => {
        tx(r[0], X0, y, { c: '#6B6D7A' });
        if (r[2] && r[2].length === 2) {
          F(1, 13); const w = c.measureText(r[1]).width + 22;
          if (d) { rr(c, W - X0 - w, y - 17, w, 24, 12); c.fillStyle = r[2][0]; c.fill(); }
          tx(r[1], W - X0 - w / 2, y, { b: 1, s: 13, a: 'center', c: r[2][1] });
        } else tx(r[1], W - X0, y, { a: 'right', b: 1, c: r[2] || '#2B2D3A' });
        y += 30;
      });
      if (S_.notes && S_.notes.length) {
        y += 8; tx('หมายเหตุ', X0, y, { b: 1, s: 14, c: '#6B6D7A' }); y += 22;
        S_.notes.forEach(n => { F(0, 14); wrapT(c, n, IW).forEach(l => { tx(l, X0, y, { s: 14, c: '#4A4C5A' }); y += 21; }); });
      }
      y += 14; dash(y); y += 30;
      (S_.foot || []).forEach(f => { tx(f, W / 2, y, { a: 'center', s: 13, c: '#6B6D7A' }); y += 20; });
      return y;
    };
    const m = document.createElement('canvas').getContext('2d');
    const H = Math.ceil(run(m, false, 0)) + 30, cv = document.createElement('canvas');
    cv.width = W * SC; cv.height = H * SC;
    const c = cv.getContext('2d'); c.scale(SC, SC); run(c, true, H);
    return new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
  }
  S.savePng = async (spec, filename) => {
    try { U.download(filename, await mkPng(spec)); S.toast('บันทึกรูปเรียบร้อย ✓'); }
    catch (e) { S.toast('สร้างรูปไม่สำเร็จ กรุณาลองอีกครั้ง'); }
  };
})(window.Solva = window.Solva || {});
