// medweb/js/app.js
// 路由与页面渲染：首页（搜索+科室宫格+推荐）/ 列表页 / 详情页。
(function (global) {
  'use strict';
  const R = global.MedRender;
  const D = global.MedData;
  const $ = (s, el) => (el || document).querySelector(s);

  const RECOMMEND_IDS = [
    't2dm', 'htn', 'chd', 'dyslipidemia', 'gout', 'cap', 'pediatric_pneumonia',
    'acute_uri', 'copd', 'hf', 'ckd', 'lungca', 'mvyx_b1_cerebral_infarction',
    'ida', 'nafld', 'lumbar_disc_herniation', 'op', 'ra'
  ];
  const HOT_NAME_OVERRIDE = { gout: '高尿酸血症/痛风' };

  let _indexCache = null;
  async function getIndex() {
    if (!_indexCache) _indexCache = await D.loadIndex();
    return _indexCache;
  }

  function header() {
    return '<header class="topbar"><a class="brand" href="#/">医学知识百科 · 网页版</a>' +
      '<span class="brand-sub">医学知识查询</span></header>';
  }

  function disclaimer() {
    return '<div class="disclaimer">⚠️ 本内容仅供医学学习参考，不能替代执业医师诊疗。如有不适请及时就医。</div>';
  }

  // ---------- 首页 ----------
  async function renderHome() {
    const [index, specs] = await Promise.all([getIndex(), D.loadSpecialties()]);
    const counts = {};
    index.forEach(d => { counts[d.specialty] = (counts[d.specialty] || 0) + 1; });

    const app = $('#app');
    app.innerHTML = header() +
      '<main class="home">' +
      '<div class="hero"><div class="hero-title">医学知识百科</div>' +
      '<div class="hero-sub">覆盖 ' + index.length + ' 种疾病 · 依据教材 / 指南 / 共识整理</div></div>' +
      '<div class="search-bar"><input id="home-search" class="search-input" placeholder="搜索疾病名称 / 别名 / 科室" />' +
      '<button id="home-search-btn" class="search-btn">搜索</button></div>' +
      '<div id="search-results" class="search-results"></div>' +
      disclaimer() +
      '<div class="card block"><div class="sec-title">按科室浏览</div>' +
      '<div id="spec-grid" class="grid"></div></div>' +
      '<div class="card block"><div class="sec-title">常见 / 推荐病种</div>' +
      '<div id="hot-list" class="disease-list"></div></div>' +
      '<div class="footer">数据依据最新教材 / 指南 / 共识整理 · 持续扩充中</div>' +
      '</main>';

    // 科室宫格
    const grid = $('#spec-grid');
    grid.innerHTML = specs.map(s => {
      const n = counts[s.key] || 0;
      return '<a class="grid-item" href="#/list?specialty=' + encodeURIComponent(s.key) + '">' +
        '<div class="grid-icon">' + (s.icon || '📁') + '</div>' +
        '<div class="grid-name">' + R.esc(s.key) + '</div>' +
        '<div class="grid-count">' + n + ' 种</div></a>';
    }).join('');

    // 推荐
    const hotList = $('#hot-list');
    const hot = RECOMMEND_IDS.map(id => index.find(d => d.id === id)).filter(Boolean)
      .map(d => HOT_NAME_OVERRIDE[d.id] ? Object.assign({}, d, { name: HOT_NAME_OVERRIDE[d.id] }) : d);
    hotList.innerHTML = hot.map(d =>
      '<a class="disease-item" href="#/d/' + encodeURIComponent(d.pkg) + '/' + encodeURIComponent(d.id) + '">' +
      '<div class="disease-main"><div class="disease-name">' + R.esc(d.name) + '</div>' +
      '<div class="disease-en">' + R.esc(d.enName) + '</div></div>' +
      '<div class="disease-tag">' + R.esc(d.specialty) + '</div></a>'
    ).join('');

    // 搜索
    const input = $('#home-search');
    const doSearch = (q) => {
      q = (q || '').trim();
      const box = $('#search-results');
      if (!q) { box.innerHTML = ''; return; }
      const ql = q.toLowerCase();
      const res = index.filter(d =>
        (d.name || '').toLowerCase().includes(ql) ||
        (d.enName || '').toLowerCase().includes(ql) ||
        (d.specialty || '').toLowerCase().includes(ql) ||
        (d.aliases || []).join(',').toLowerCase().includes(ql)
      ).slice(0, 50);
      box.innerHTML = res.length
        ? res.map(d =>
          '<a class="disease-item" href="#/d/' + encodeURIComponent(d.pkg) + '/' + encodeURIComponent(d.id) + '">' +
          '<div class="disease-main"><div class="disease-name">' + R.esc(d.name) + '</div>' +
          '<div class="disease-en">' + R.esc(d.enName) + '</div></div>' +
          '<div class="disease-tag">' + R.esc(d.specialty) + '</div></a>'
        ).join('')
        : '<div class="empty">未找到匹配疾病</div>';
    };
    input.addEventListener('input', e => doSearch(e.target.value));
    $('#home-search-btn').addEventListener('click', () => {
      const q = input.value.trim();
      if (q) location.hash = '#/list?q=' + encodeURIComponent(q);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { const q = input.value.trim(); if (q) location.hash = '#/list?q=' + encodeURIComponent(q); }
    });
  }

  // ---------- 列表页 ----------
  async function renderList(params) {
    const index = await getIndex();
    const specialty = params.get('specialty') || '';
    const q = params.get('q') || '';
    let list, title;
    if (q) {
      const ql = q.toLowerCase();
      list = index.filter(d =>
        (d.name || '').toLowerCase().includes(ql) ||
        (d.enName || '').toLowerCase().includes(ql) ||
        (d.specialty || '').toLowerCase().includes(ql) ||
        (d.aliases || []).join(',').toLowerCase().includes(ql)
      );
      title = '搜索：“' + R.esc(q) + '”';
    } else {
      list = index.filter(d => d.specialty === specialty);
      title = specialty || '全部疾病';
    }

    const app = $('#app');
    app.innerHTML = header() +
      '<main class="list-page"><div class="list-head"><a class="back" href="#/">← 首页</a>' +
      '<h1 class="list-title">' + title + '</h1>' +
      '<div class="list-count">共 ' + list.length + ' 种</div></div>' +
      '<div id="list-box" class="disease-list"></div>' +
      (list.length ? '' : '<div class="empty">暂无数据</div>') +
      '</main>';

    $('#list-box').innerHTML = list.map(d =>
      '<a class="disease-item" href="#/d/' + encodeURIComponent(d.pkg) + '/' + encodeURIComponent(d.id) + '">' +
      '<div class="disease-main"><div class="disease-name">' + R.esc(d.name) + '</div>' +
      '<div class="disease-en">' + R.esc(d.enName) + '</div></div>' +
      '<div class="disease-tag">' + R.esc(d.specialty) + '</div></a>'
    ).join('');
  }

  // ---------- 详情页 ----------
  async function renderDetail(pkg, id) {
    const app = $('#app');
    app.innerHTML = header() + '<main class="detail-page"><div class="loading">加载中…</div></main>';
    let disease;
    try {
      disease = await D.findDisease(pkg, id);
    } catch (e) {
      app.querySelector('.detail-page').innerHTML = '<div class="empty">数据加载失败：' + R.esc(e.message) + '</div>';
      return;
    }
    if (!disease) {
      app.querySelector('.detail-page').innerHTML = '<div class="empty">未找到该病种</div>';
      return;
    }
    document.title = disease.name + ' · 医学知识百科';
    const views = R.buildViews(disease);
    const aliases = (disease.aliases || []).filter(a => a !== disease.name);
    const meta = [disease.specialty, disease.tags && disease.tags.join(' · ')].filter(Boolean).join(' · ');

    const html = '<main class="detail-page">' +
      '<div class="detail-head"><a class="back" href="#/">← 返回</a>' +
      '<h1 class="detail-name">' + R.esc(disease.name) + '</h1>' +
      (disease.enName ? '<div class="detail-en">' + R.esc(disease.enName) + '</div>' : '') +
      (meta ? '<div class="detail-meta">' + R.esc(meta) + '</div>' : '') +
      (aliases.length ? '<div class="detail-alias">别名：' + R.esc(aliases.join('、')) + '</div>' : '') +
      '</div>' +
      '<div class="detail-body">' + R.renderViews(views) + '</div>' +
      disclaimer() +
      '<div class="footer">数据依据最新教材 / 指南 / 共识整理 · 仅供学习参考</div>' +
      '</main>';
    app.innerHTML = header() + html;

    // 锚点平滑滚动（仅页面内跳转，不修改 hash，避免触发路由回到首页）
    app.querySelectorAll('.sec-nav-item').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const id = a.getAttribute('href').slice(1);
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    window.scrollTo(0, 0);
  }

  // ---------- 路由 ----------
  function route() {
    const hash = location.hash || '#/';
    const path = hash.replace(/^#\/?/, '');
    if (path === '' || path === '/') { renderHome(); return; }
    if (path.startsWith('list')) {
      const q = path.includes('?') ? path.split('?')[1] : '';
      renderList(new URLSearchParams(q));
      return;
    }
    const m = path.match(/^d\/([^/]+)\/(.+)$/);
    if (m) {
      renderDetail(decodeURIComponent(m[1]), decodeURIComponent(m[2]));
      return;
    }
    renderHome();
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('DOMContentLoaded', route);
  if (document.readyState !== 'loading') route();
})(window);
