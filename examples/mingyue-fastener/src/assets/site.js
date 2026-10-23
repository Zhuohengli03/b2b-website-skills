/* Mingyue Fastener · site.js（零依赖，≈6KB）
   1 导航（汉堡 / 下拉 Esc）  2 滚动渐入  3 载体场景段（滚动位置驱动，可逆）  4 Counter
   5 Accordion 一次展开一个  6 目录筛选（URL 参数可分享）  7 询盘表单（预填 / 校验 / 蜜罐 / 加载态）
   全部动效在 prefers-reduced-motion: reduce 时关闭。 */
(function () {
  'use strict';
  var d = document, w = window;
  var reduced = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  /* 页脚年份动态 */
  $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- 1 导航 ---------- */
  var burger = $('.nav-burger'), panel = $('#nav-panel');
  if (burger && panel) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      panel.classList.toggle('is-open', open);
      d.body.classList.toggle('menu-open', open);
    });
  }
  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (burger && burger.getAttribute('aria-expanded') === 'true') { burger.click(); burger.focus(); }
    var li = e.target.closest && e.target.closest('.has-dropdown');
    if (li) { li.classList.add('is-closed'); li.querySelector('a').focus(); setTimeout(function () { li.classList.remove('is-closed'); }, 300); }
  });

  /* ---------- 2 滚动渐入（一次触发，IntersectionObserver） ---------- */
  var reveals = $$('.reveal');
  if (reveals.length) {
    if (reduced || !('IntersectionObserver' in w)) {
      reveals.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
      reveals.forEach(function (el) { io.observe(el); });
      // 保险：3s 后无论是否进入视口全部显示，内容绝不因观察器失效而留空
      setTimeout(function () { reveals.forEach(function (el) { el.classList.add('is-in'); io.unobserve(el); }); }, 3000);
    }
  }

  /* ---------- 3 载体场景段：帧 = 区块在视口中的位置（0–4），可逆、无时长参数 ---------- */
  var carrier = $('[data-carrier]');
  if (carrier && !reduced && 'IntersectionObserver' in w) {
    var progress = $('[data-progress]', carrier);
    var active = false, raf = 0;
    var update = function () {
      raf = 0;
      var r = carrier.getBoundingClientRect(), vh = w.innerHeight || d.documentElement.clientHeight;
      // 起点：区块顶到视口 85% 处；终点：区块顶到视口 20% 处（或区块底到视口 70% 处，取先到者）
      var start = vh * 0.85, end = Math.max(vh * 0.2, r.height > vh * 0.6 ? vh * 0.7 - r.height : vh * 0.2);
      var p = (start - r.top) / (start - end);
      p = Math.max(0, Math.min(1, p));
      var frame = Math.min(4, Math.ceil(p * 4));
      if (carrier.getAttribute('data-frame') !== String(frame)) {
        carrier.setAttribute('data-frame', String(frame));
        if (progress) progress.textContent = '0' + frame;
      }
    };
    var onScroll = function () { if (!raf) raf = w.requestAnimationFrame(update); };
    var gate = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !active) { active = true; w.addEventListener('scroll', onScroll, { passive: true }); update(); }
        else if (!en.isIntersecting && active) { active = false; w.removeEventListener('scroll', onScroll); update(); }
      });
    }, { rootMargin: '20% 0px 20% 0px' });
    carrier.setAttribute('data-frame', '0');
    gate.observe(carrier);
    w.addEventListener('resize', onScroll);
  }

  /* ---------- 4 Counter：进视口滚一次 ≤ 2s，DOM 里已有真值 ---------- */
  var counts = $$('.count[data-to]');
  if (counts.length && !reduced && 'IntersectionObserver' in w) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var el = en.target, to = parseFloat(el.getAttribute('data-to')), t0 = null, dur = 1400;
        var step = function (ts) {
          if (!t0) t0 = ts;
          var k = Math.min(1, (ts - t0) / dur); k = 1 - Math.pow(1 - k, 3);
          el.textContent = String(Math.round(to * k));
          if (k < 1) w.requestAnimationFrame(step); else el.textContent = el.getAttribute('data-to');
        };
        w.requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    counts.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- 5 Accordion：同组一次只开一个（details name 属性的旧浏览器回退） ---------- */
  $$('details.acc').forEach(function (dt) {
    dt.addEventListener('toggle', function () {
      if (!dt.open) return;
      $$('details.acc[name="' + dt.getAttribute('name') + '"]').forEach(function (o) { if (o !== dt && o.open) o.open = false; });
    });
  });

  /* ---------- 6 目录筛选：复选 + 搜索 → URL 参数；无 JS 时显示全表 ---------- */
  var form = $('[data-filter-form]'), table = $('[data-catalog]');
  if (form && table) {
    var PAGE = 25, page = 1;
    var rows = $$('tbody tr:not([data-note])', table), noteRow = $('[data-note]', table);
    var countEl = $('[data-result-count]'), empty = $('[data-empty]'), pager = $('[data-pager]'), fcount = $('[data-filter-count]');
    var toggle = $('.filters-toggle'), filters = $('.filters');
    var keys = ['category', 'standard', 'thread', 'length', 'class', 'surface', 'application'];
    var state = function () {
      var s = { s: ($('[name="s"]', form).value || '').trim().toLowerCase() };
      keys.forEach(function (k) { s[k] = $$('[name="' + k + '"]:checked', form).map(function (i) { return i.value; }); });
      return s;
    };
    var apply = function (push) {
      var s = state(), n = 0, shown = [];
      rows.forEach(function (tr) {
        var ok = true;
        keys.forEach(function (k) {
          if (!ok || !s[k].length) return;
          var v = (tr.getAttribute('data-' + k) || '').split(' ');
          ok = s[k].some(function (x) { return v.indexOf(x) !== -1; });
        });
        if (ok && s.s) ok = (tr.getAttribute('data-search') || '').indexOf(s.s) !== -1;
        if (ok) { n++; shown.push(tr); }
        tr.hidden = !ok;
      });
      var pages = Math.max(1, Math.ceil(n / PAGE)); if (page > pages) page = pages;
      shown.forEach(function (tr, i) { tr.hidden = Math.floor(i / PAGE) + 1 !== page; });
      if (noteRow) noteRow.hidden = n === 0 || page !== pages;
      var realCount = shown.filter(function (tr) { return !tr.classList.contains('is-placeholder'); }).length;
      if (countEl) { countEl.textContent = String(realCount); var lbl = countEl.nextSibling; if (lbl && countEl.getAttribute('data-one')) lbl.textContent = ' ' + (realCount === 1 ? countEl.getAttribute('data-one') : countEl.getAttribute('data-many')); }
      if (empty) empty.hidden = n !== 0;
      if (pager) {
        pager.hidden = pages < 2; pager.innerHTML = '';
        for (var i = 1; i <= pages; i++) {
          var b = d.createElement('button'); b.type = 'button'; b.textContent = String(i);
          if (i === page) b.setAttribute('aria-current', 'page');
          b.addEventListener('click', (function (k) { return function () { page = k; apply(false); }; })(i));
          pager.appendChild(b);
        }
      }
      var active = keys.reduce(function (a, k) { return a + s[k].length; }, 0) + (s.s ? 1 : 0);
      if (fcount) fcount.textContent = active ? String(active) : '';
      if (push) {
        var q = new URLSearchParams();
        if (s.s) q.set('s', s.s);
        keys.forEach(function (k) { s[k].forEach(function (v) { q.append(k, v); }); });
        var qs = q.toString();
        history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
      }
    };
    // 从 URL 还原
    var q0 = new URLSearchParams(location.search);
    if (q0.get('s')) $('[name="s"]', form).value = q0.get('s');
    keys.forEach(function (k) { q0.getAll(k).forEach(function (v) { var i = $('[name="' + k + '"][value="' + CSS.escape(v) + '"]', form); if (i) i.checked = true; }); });
    form.addEventListener('change', function () { page = 1; apply(true); });
    form.addEventListener('input', function (e) { if (e.target.name === 's') { page = 1; apply(true); } });
    form.addEventListener('submit', function (e) { e.preventDefault(); page = 1; apply(true); });
    form.addEventListener('reset', function () { setTimeout(function () { page = 1; apply(true); }, 0); });
    if (toggle && filters) toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open)); filters.classList.toggle('is-open', open);
    });
    apply(false);
  }
  /* 整行可点（目录 / 分类页） */
  $$('tr.is-link[data-href]').forEach(function (tr) {
    tr.addEventListener('click', function (e) { if (e.target.closest('a')) return; location.href = tr.getAttribute('data-href'); });
  });

  /* ---------- 7 询盘表单 ---------- */
  var inq = $('[data-inquiry]');
  if (inq) {
    var q = new URLSearchParams(location.search);
    var topic = $('[data-topic]', inq), model = $('#f-model', inq), msg = $('#f-message', inq);
    var prefill = { 'not-listed': 'Size not listed:', 'audit': 'Factory audit:' };
    if (q.get('topic') && topic) topic.value = q.get('topic');
    if (q.get('model') && model) model.value = q.get('model');
    else if (q.get('category') && model) model.value = q.get('category').replace(/-/g, ' ').replace(/\b(din|iso)\b/gi, function (m) { return m.toUpperCase(); });
    if (prefill[q.get('topic')] && msg && !msg.value) msg.value = prefill[q.get('topic')] + ' ';

    var alertEl = $('[data-alert]', inq), submit = $('[data-submit]', inq), fs = $('fieldset', inq);
    var validate = function (el) {
      var box = el.closest('.field'), err = box && box.querySelector('.error'), bad = '';
      if (el.required && !el.value.trim()) bad = err ? err.getAttribute('data-error') : 'Required';
      else if (el.type === 'email' && el.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value)) bad = err ? err.getAttribute('data-error') : 'Invalid email';
      if (err) err.textContent = bad;
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      return !bad;
    };
    $$('[required]', inq).forEach(function (el) { el.addEventListener('blur', function () { validate(el); }); });
    inq.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true, first = null;
      $$('[required]', inq).forEach(function (el) { if (!validate(el)) { ok = false; first = first || el; } });
      if (!ok) { if (alertEl) alertEl.hidden = false; first.focus(); return; }
      if (alertEl) alertEl.hidden = true;
      if ($('[name="website"]', inq).value) { location.href = inq.getAttribute('data-thanks'); return; } // 蜜罐命中：静默丢弃
      submit.disabled = true; submit.setAttribute('aria-busy', 'true');
      submit.style.width = submit.getBoundingClientRect().width + 'px';
      $('.btn-label', submit).textContent = submit.getAttribute('data-sending');
      var endpoint = inq.getAttribute('data-endpoint');
      var data = new FormData(inq);
      var done = function () { location.href = inq.getAttribute('data-thanks'); };
      var fail = function () {
        submit.disabled = false; submit.removeAttribute('aria-busy'); submit.style.width = '';
        $('.btn-label', submit).textContent = 'Request a Quote';
        if (alertEl) { alertEl.hidden = false; alertEl.focus && alertEl.focus(); }
      };
      if (endpoint) {
        fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } }).then(function (r) { r.ok ? done() : fail(); }).catch(fail);
      } else {
        // 临时条目库（接收端未配置）：存到本机 localStorage，便于测试页面链路；不是正式收件通道
        try {
          var log = JSON.parse(localStorage.getItem('inquiry-log') || '[]'), o = {};
          data.forEach(function (v, k) { if (k !== 'attachment' && k !== 'website') o[k] = v; });
          o._at = new Date().toISOString(); log.push(o); localStorage.setItem('inquiry-log', JSON.stringify(log));
        } catch (err) { /* 隐私模式等：忽略 */ }
        setTimeout(done, 400);
      }
    });
  }
})();
