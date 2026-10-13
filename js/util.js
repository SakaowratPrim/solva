// Small helpers shared by every module: formatting, Thai dates, HTML escaping.
(function (S) {
  'use strict';

  const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const MONTHS_S = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const DAYS_S = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  const pad = n => String(n).padStart(2, '0');

  const U = {
    MONTHS, MONTHS_S, DAYS, DAYS_S, pad,

    esc(v) {
      return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    },
    num: n => Math.round(n || 0).toLocaleString('en-US'),
    fm: n => (n < 0 ? '−฿' : '฿') + Math.abs(Math.round(n || 0)).toLocaleString('en-US'),
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),

    // ---- dates (always local time, ISO "YYYY-MM-DD") ----
    iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
    parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
    today() { return U.iso(new Date()); },
    addDays(s, n) { const d = U.parse(s); d.setDate(d.getDate() + n); return U.iso(d); },
    ym: s => s.slice(0, 7),
    addMonths(ym, n) { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); },
    daysBetween(a, b) { return Math.round((U.parse(b) - U.parse(a)) / 864e5); },
    nowMin() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); },
    nowHM() { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); },

    // Thai formats with Buddhist-era year
    thDate(s) { const d = U.parse(s); return d.getDate() + ' ' + MONTHS_S[d.getMonth()] + ' ' + (d.getFullYear() + 543); },
    thShort(s) { const d = U.parse(s); return d.getDate() + ' ' + MONTHS_S[d.getMonth()]; },
    thShortY(s) { const d = U.parse(s); return d.getDate() + ' ' + MONTHS_S[d.getMonth()] + ' ' + String(d.getFullYear() + 543).slice(2); },
    thLong(s) { const d = U.parse(s); return 'วัน' + DAYS[d.getDay()] + 'ที่ ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + (d.getFullYear() + 543); },
    thMonth(ym) { const [y, m] = ym.split('-').map(Number); return MONTHS[m - 1] + ' ' + (y + 543); },
    thMonthS(ym) { const [y, m] = ym.split('-').map(Number); return MONTHS_S[m - 1] + ' ' + (y + 543); },

    // ---- time "HH:MM" <-> minutes ----
    toMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; },
    fromMin(n) { return pad(Math.floor(n / 60)) + ':' + pad(n % 60); },

    // tenure from an ISO start date to `ref`
    tenure(start, ref) {
      const a = U.parse(start), b = U.parse(ref || U.today());
      let y = b.getFullYear() - a.getFullYear(), m = b.getMonth() - a.getMonth();
      if (b.getDate() < a.getDate()) m--;
      if (m < 0) { y--; m += 12; }
      if (y < 0) return '0 เดือน';
      return (y ? y + ' ปี ' : '') + m + ' เดือน';
    },

    // deterministic PRNG so the demo seed is identical on every reset
    rng(seed) {
      let a = seed >>> 0;
      const r = () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
      r.pick = arr => arr[Math.floor(r() * arr.length)];
      return r;
    },

    uid(p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },

    initial(name) {
      // skip Thai leading vowels (เ แ โ ใ ไ) so "เจน" shows "จ"
      const m = String(name || '').replace(/^คุณ/, '').match(/[ก-ฮA-Za-z0-9]/);
      return m ? m[0] : '?';
    },

    download(filename, blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    },

    csv(rows) {
      const cell = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      return '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n');
    }
  };

  S.U = U;
})(typeof window !== 'undefined' ? (window.Solva = window.Solva || {}) : (globalThis.Solva = globalThis.Solva || {}));
