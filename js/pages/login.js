// Sign-in / sign-up / forgot-password screen (from the "เข้าสู่ระบบ" design board).
(function (S) {
  'use strict';
  const esc = S.U.esc;
  const EM = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, UN = /^[A-Za-z0-9._-]{3,}$/;
  const REM = 'solva:remember-id';

  const spark = (style) => '<svg class="spk" style="' + style + '" viewBox="-14 -14 28 28" aria-hidden="true"><path d="M0-12L3-3L12 0L3 3L0 12L-3 3L-12 0L-3-3Z" fill="#fff"/></svg>';
  const eye = show => '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>' + (show ? '<path d="M3 3l18 18"/>' : '') + '</svg>';

  function remembered() { try { return localStorage.getItem(REM) || ''; } catch (e) { return ''; } }

  const page = {
    init: () => ({ v: 'welcome', err: '', ef: '', ok: '', busy: false, show: false, who: '', id: '' }),
    enter() { const st = S.pageState('login', page.init); Object.assign(st, page.init()); },

    render(s) {
      const bad = f => (s.ef === f ? ' bad' : '');
      const msg = (s.ok ? '<div class="msg s" role="status">' + esc(s.ok) + '</div>' : '') + (s.err ? '<div class="msg e" role="alert">' + esc(s.err) + '</div>' : '');
      const btn = label => '<button type="submit" class="pb go"' + (s.busy ? ' disabled' : '') + '>' + esc(s.busy ? (s.v === 'signup' ? 'กำลังสร้างบัญชี…' : s.v === 'forgot' ? 'กำลังส่ง…' : 'กำลังตรวจสอบ…') : label) + '</button>';
      let pn = '';
      if (s.v === 'welcome') {
        pn = '<div class="tp"><button class="pb" data-act="view" data-arg="signin">เข้าสู่ระบบ</button><button class="pb o" data-act="view" data-arg="signup">สมัครสมาชิก</button></div>';
      } else if (s.v === 'signin') {
        pn = '<form class="tp" data-sub="signin" novalidate data-key="signin"><h2 class="ttl">ยินดีต้อนรับกลับมา</h2><p class="sub">เข้าสู่ระบบเพื่อจัดการร้านของคุณ</p>' + msg
          + '<label class="lb" for="id">อีเมลหรือชื่อผู้ใช้</label><input id="id" name="id" class="in' + bad('id') + '" type="text" autocomplete="username" placeholder="owner@solva.demo" value="' + esc(s.id) + '">'
          + '<label class="lb" for="pw">รหัสผ่าน</label><div class="pw"><input id="pw" name="pw" class="in' + bad('pw') + '" type="' + (s.show ? 'text' : 'password') + '" autocomplete="current-password" placeholder="••••••••" value="' + esc(s.pw || '') + '">'
          + '<button type="button" class="ey" aria-label="' + (s.show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน') + '" data-act="eye">' + eye(s.show) + '</button></div>'
          + '<div class="row"><label class="ck"><input type="checkbox" name="rem"' + (s.rem ? ' checked' : '') + '>จดจำฉันไว้</label><button type="button" class="lk" data-act="view" data-arg="forgot">ลืมรหัสผ่าน?</button></div>'
          + btn('เข้าสู่ระบบ')
          + '<div class="row" style="justify-content:center;margin-top:4px"><span>ยังไม่มีบัญชี?</span><button type="button" class="lk" data-act="view" data-arg="signup">สมัครสมาชิก</button></div></form>';
      } else if (s.v === 'signup') {
        pn = '<form class="tp" data-sub="signup" novalidate data-key="signup"><h2 class="ttl">สร้างบัญชีร้านของคุณ</h2><p class="sub">ใช้เวลาไม่ถึงหนึ่งนาที</p>' + msg
          + '<label class="lb" for="n">ชื่อ-นามสกุล</label><input id="n" name="n" class="in' + bad('n') + '" type="text" autocomplete="name">'
          + '<label class="lb" for="e2">อีเมล</label><input id="e2" name="e2" class="in' + bad('e2') + '" type="email" autocomplete="email" placeholder="you@example.com">'
          + '<label class="lb" for="p2">รหัสผ่าน (อย่างน้อย 8 ตัว มีตัวอักษรและตัวเลข)</label><input id="p2" name="p2" class="in' + bad('p2') + '" type="password" autocomplete="new-password">'
          + '<label class="lb" for="p3">ยืนยันรหัสผ่าน</label><input id="p3" name="p3" class="in' + bad('p3') + '" type="password" autocomplete="new-password">'
          + btn('สมัครสมาชิก')
          + '<div class="row" style="justify-content:center;margin-top:4px"><span>มีบัญชีแล้ว?</span><button type="button" class="lk" data-act="view" data-arg="signin">เข้าสู่ระบบ</button></div></form>';
      } else if (s.v === 'forgot') {
        pn = '<form class="tp" data-sub="forgot" novalidate data-key="forgot"><h2 class="ttl">ลืมรหัสผ่าน</h2><p class="sub">กรอกอีเมลที่ใช้สมัคร เพื่อรับลิงก์ตั้งรหัสผ่านใหม่</p>' + msg
          + '<label class="lb" for="e3">อีเมล</label><input id="e3" name="id" class="in' + bad('id') + '" type="email" autocomplete="email" placeholder="you@example.com" value="' + esc(s.id.includes('@') ? s.id : '') + '">'
          + btn('ส่งลิงก์รีเซ็ต')
          + '<div class="row" style="justify-content:center;margin-top:4px"><button type="button" class="lk" data-act="view" data-arg="signin">‹ กลับไปเข้าสู่ระบบ</button></div></form>';
      } else if (s.v === 'done') {
        pn = '<div class="tp ok"><svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#fff"/><path d="M19 33l9 9 17-19" fill="none" stroke="#FF6FFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          + '<h2 class="ttl">เข้าสู่ระบบสำเร็จ</h2><p class="sub">สวัสดี ' + esc(s.who) + ' · กำลังพาไปหน้า Dashboard…</p><a class="pb go" href="#/dashboard">ไปที่ Dashboard ทันที</a></div>';
      }
      return '<div class="auth"><div class="pg"><div class="arch"></div><span class="bb b1"></span><span class="bb b2"></span>'
        + spark('left:18%;top:20%') + spark('right:16%;top:30%;animation-delay:1s')
        + '<div class="col' + (s.v !== 'welcome' ? ' f' : '') + '"><div class="lg"><h1>Solva</h1><p>Your all-in-one<br>beauty business manager.</p></div><div class="pn">' + pn
        + '<div class="dm"><b>โหมดเดโม</b>ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น · บัญชีทดลอง owner@solva.demo / solva1234</div></div></div></div></div>';
    },

    actions: {
      view(el) {
        const s = S.pageState('login', page.init), v = el.dataset.arg;
        Object.assign(s, { v, err: '', ef: '', ok: '', show: false, pw: '' });
        if (v === 'signin' && !s.id) { const r = remembered(); Object.assign(s, { id: r || 'owner@solva.demo', pw: r ? '' : 'solva1234', rem: !!r }); }
        S.render();
      },
      eye() {
        const s = S.pageState('login', page.init);
        const f = document.querySelector('form[data-sub="signin"]');
        if (f) { s.id = f.elements.id.value; s.pw = f.elements.pw.value; s.rem = f.elements.rem.checked; }
        s.show = !s.show; S.render();
      },
      signin(form) {
        const s = S.pageState('login', page.init);
        if (s.busy) return;
        const d = S.formData(form), id = d.id.trim();
        Object.assign(s, { id, pw: '', rem: d.rem });
        const fail = (f, m) => { Object.assign(s, { err: m, ef: f, ok: '', busy: false }); S.render(); };
        if (!id) return fail('id', 'กรุณากรอกอีเมลหรือชื่อผู้ใช้');
        if (id.includes('@') ? !EM.test(id) : !UN.test(id)) return fail('id', 'รูปแบบอีเมลหรือชื่อผู้ใช้ไม่ถูกต้อง (ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัว)');
        if (!d.pw) return fail('pw', 'กรุณากรอกรหัสผ่าน');
        if (d.pw.length < 6) return fail('pw', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        Object.assign(s, { busy: true, err: '', ef: '' }); S.render();
        setTimeout(() => {
          const key = id.toLowerCase(), acc = S.store.state.users[key];
          if (!acc || acc.pw !== d.pw) return fail('pw', 'อีเมล/ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง');
          try { if (d.rem) localStorage.setItem(REM, id); else localStorage.removeItem(REM); } catch (e) { /* ignore */ }
          S.auth.login(key, acc, d.rem);
          Object.assign(s, { busy: false, v: 'done', who: acc.name });
          S.render();
          setTimeout(() => { if (S.ui.route.name === 'login') S.go('#/dashboard'); }, 900);
        }, 600);
      },
      signup(form) {
        const s = S.pageState('login', page.init);
        if (s.busy) return;
        const d = S.formData(form), em = d.e2.toLowerCase();
        const fail = (f, m) => { Object.assign(s, { err: m, ef: f, ok: '' }); S.render(); };
        if (d.n.length < 2) return fail('n', 'กรุณากรอกชื่อ-นามสกุล');
        if (!EM.test(em)) return fail('e2', 'รูปแบบอีเมลไม่ถูกต้อง');
        if (d.p2.length < 8 || !/[A-Za-z]/.test(d.p2) || !/\d/.test(d.p2)) return fail('p2', 'รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีทั้งตัวอักษรและตัวเลข');
        if (d.p3 !== d.p2) return fail('p3', 'รหัสผ่านที่ยืนยันไม่ตรงกัน');
        if (S.store.state.users[em]) return fail('e2', 'อีเมลนี้ถูกใช้สมัครแล้ว');
        Object.assign(s, { busy: true, err: '', ef: '' }); S.render();
        setTimeout(() => {
          // Demo-only account store: credentials live in this browser's localStorage, unhashed.
          S.store.state.users[em] = { pw: d.p2, name: d.n, role: 'owner' };
          S.store.save();
          Object.assign(s, { busy: false, v: 'signin', id: em, pw: '', ok: 'สมัครสมาชิกเรียบร้อย กรุณาเข้าสู่ระบบ' });
          S.render();
        }, 700);
      },
      forgot(form) {
        const s = S.pageState('login', page.init);
        if (s.busy) return;
        const em = S.formData(form).id;
        const fail = m => { Object.assign(s, { err: m, ef: 'id', ok: '' }); S.render(); };
        if (!em) return fail('กรุณากรอกอีเมล');
        if (!EM.test(em)) return fail('รูปแบบอีเมลไม่ถูกต้อง');
        Object.assign(s, { busy: true, err: '', ef: '', id: em }); S.render();
        setTimeout(() => { Object.assign(s, { busy: false, ok: 'รับคำขอสำหรับ ' + em + ' แล้ว (เดโม: ยังไม่มีการส่งอีเมลจริง)' }); S.render(); }, 700);
      }
    }
  };
  S.pages.login = page;
})(window.Solva = window.Solva || {});
