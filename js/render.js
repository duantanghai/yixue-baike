// medweb/js/render.js
// 渲染核心：移植自小程序 detail.js 的 SECTIONS 顺序、buildCells 首列合并、normTables 归一化。
// 纯浏览器环境，无框架依赖。
(function (global) {
  'use strict';

  // 病种详情结构（顺序固定），与小程序 sections.js 一致
  const SECTIONS = [
    { key: 'overview', title: '概述' },
    { key: 'epidemiology', title: '流行病学' },
    { key: 'etiology', title: '病因和发病机制' },
    { key: 'pathophysiology', title: '病理生理' },
    { key: 'clinical', title: '临床表现', group: ['symptoms', 'signs'] },
    { key: 'complications', title: '并发症' },
    { key: 'laboratory', title: '实验室检查' },
    { key: 'imaging', title: '影像学检查' },
    { key: 'diagnosis', title: '诊断和鉴别诊断' },
    {
      key: 'treatment', title: '治疗',
      group: ['treatment_general', 'treatment_symptomatic', 'treatment_drug', 'treatment_surgery']
    },
    { key: 'prognosis', title: '预后' },
    { key: 'prevention', title: '预防' }
  ];

  const SUBSECTION_TITLES = {
    treatment_general: '一般治疗',
    treatment_symptomatic: '对症治疗',
    treatment_drug: '药物治疗',
    treatment_surgery: '手术治疗',
    symptoms: '症状',
    signs: '体征'
  };

  // ---------- 表格逻辑（与小程序 buildCells 一致） ----------
  function cellAt(row, c) {
    if (!row || c < 0) return '';
    const v = row[c];
    return (v === undefined || v === null) ? '' : String(v);
  }

  // 首列合并：相同值连续合并；首列留空视作延续上方分类（教材跨行合并语义）。
  // 仅首列参与合并；其余列即使相同也不合并（noMerge 整表关闭）。
  function buildCells(t) {
    const head = t.head || [];
    const rows = t.rows || [];
    let ncol = head.length;
    rows.forEach(r => { if (r.length > ncol) ncol = r.length; });
    if (ncol < 1) ncol = 1;
    const spanMap = [];
    const noMerge = !!t.noMerge;
    for (let c = 0; c < ncol; c++) {
      spanMap[c] = new Array(rows.length).fill(1);
      if (c > 0 || noMerge) continue;
      let r = 0;
      while (r < rows.length) {
        const val = cellAt(rows[r], c);
        if (val === '') { r++; continue; }
        let run = 1;
        while (r + run < rows.length) {
          const nv = cellAt(rows[r + run], c);
          if (nv === val || nv === '') run++;
          else break;
        }
        if (run > 1) {
          for (let k = 0; k < run; k++) spanMap[c][r + k] = (k === 0 ? run : 0);
          r += run;
        } else { spanMap[c][r] = 1; r++; }
      }
    }
    const cells = [];
    for (let c = 0; c < ncol; c++) {
      cells.push({ r: 0, c: c, text: head[c] !== undefined ? head[c] : '', span: 1, head: true, merge: false });
    }
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < ncol; c++) {
        const sp = spanMap[c][r];
        if (sp === 0) continue;
        cells.push({ r: r + 1, c: c, text: cellAt(rows[r], c), span: sp, head: false, merge: sp > 1 });
      }
    }
    return cells;
  }

  function normTables(v) {
    if (!v || typeof v !== 'object') return [];
    const list = [];
    if (v.table) list.push(v.table);
    if (Array.isArray(v.tables)) list.push.apply(list, v.tables);
    const out = [];
    return list
      .filter(t => t && (t.head || t.rows))
      .map(t => {
        const head = Array.isArray(t.head) ? t.head : [];
        const rows = (Array.isArray(t.rows) ? t.rows : []).map(r => (Array.isArray(r) ? r : [r]));
        let cols = head.length;
        rows.forEach(r => { if (r.length > cols) cols = r.length; });
        if (cols < 1) cols = 1;
        const base = {
          k: out.length,
          title: t.title || '',
          note: t.note || '',
          head: head,
          rows: rows,
          cols: cols,
          minW: cols <= 4 ? 640 : cols * 190
        };
        base.cells = buildCells(base);
        if (Array.isArray(t.w) && t.w.length) {
          base.colStyle = t.w.map(w => w + '%').join(' ');
        } else if (cols <= 1) {
          base.colStyle = '1fr';
        } else {
          const firstW = cols <= 4 ? 34 : (cols <= 5 ? 20 : cols <= 6 ? 17 : cols <= 7 ? 15 : cols <= 8 ? 13 : 12);
          base.colStyle = firstW + '% ' + new Array(cols - 1).fill('minmax(0,1fr)').join(' ');
        }
        return base;
      })
      .map(t => { out.push(t); t.k = out.length; return t; });
  }

  function norm(v) {
    if (!v) return { body: '', points: [], table: null, tables: [] };
    if (typeof v === 'string') return { body: v, points: [], table: null, tables: [] };
    return { body: v.body || '', points: v.points || [], table: v.table || null, tables: normTables(v) };
  }

  // 把一个 disease 构建成 views（与小程序 onLoad 一致，去掉 images 部分）
  function buildViews(disease) {
    const viewsAll = SECTIONS.map(s => {
      if (s.group) {
        const children = s.group
          .map(gk => {
            const n = norm(disease[gk]);
            return {
              key: gk, title: SUBSECTION_TITLES[gk] || gk,
              body: n.body, points: n.points, table: n.table, tables: n.tables, images: []
            };
          })
          .filter(c => c.body || c.points.length || c.tables.length);
        return { key: s.key, title: s.title, body: '', points: [], table: null, tables: [], images: [], children: children };
      }
      if (s.key === 'diagnosis') {
        const dg = disease.diagnosis || {};
        const children = [];
        if (dg.differential) {
          children.push({
            title: '鉴别诊断', body: dg.differential.body || '',
            points: dg.differential.points || [], table: null,
            tables: normTables(dg.differential), images: []
          });
        }
        if (dg.staging) {
          children.push({
            title: '分级与分期', body: dg.staging.body || '',
            points: dg.staging.points || [], table: dg.staging.table || null,
            tables: normTables(dg.staging), images: []
          });
        }
        return {
          key: s.key, title: s.title, body: dg.body || '',
          points: dg.points || [], table: dg.table || null,
          tables: normTables(dg), images: [], children: children
        };
      }
      const n = norm(disease[s.key]);
      return { key: s.key, title: s.title, body: n.body, points: n.points, table: n.table, tables: n.tables, images: [], children: null };
    });
    return viewsAll.filter(v =>
      v.body || (v.points && v.points.length) || (v.tables && v.tables.length) ||
      (v.children && v.children.length));
  }

  // ---------- HTML 转义与渲染 ----------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderTable(t) {
    if (!t || !(t.head || t.rows)) return '';
    const cells = t.cells || buildCells(t);
    const colStyle = t.colStyle || '1fr';
    let h = '';
    h += '<div class="tbl-scroll" style="min-width:' + (t.minW || 640) + 'px">';
    h += '<div class="sec-table" style="grid-template-columns:' + esc(colStyle) + '">';
    cells.forEach(c => {
      const cls = 'td' + (c.head ? ' td-h' : '') + (c.merge ? ' td-merge' : '') + (c.c === 0 && !c.head ? ' td-first' : '');
      const gridStyle = 'grid-column:' + (c.c + 1) + ';grid-row:' + (c.r + 1) + (c.span > 1 ? (' / span ' + c.span) : '') + ';';
      h += '<div class="' + cls + '" style="' + gridStyle + '">' + esc(c.text) + '</div>';
    });
    h += '</div></div>';
    let out = '';
    if (t.title) out += '<div class="tbl-title">' + esc(t.title) + '</div>';
    out += h;
    if (t.note) out += '<div class="tbl-note">' + esc(t.note).replace(/\n/g, '<br>') + '</div>';
    return '<div class="tbl-wrap">' + out + '</div>';
  }

  function renderBlocks(v) {
    let h = '';
    if (v.body) {
      v.body.split('\n').forEach(p => { if (p.trim()) h += '<p>' + esc(p) + '</p>'; });
    }
    if (v.points && v.points.length) {
      h += '<ul class="points">' + v.points.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>';
    }
    const tables = v.tables || [];
    tables.forEach(t => { h += renderTable(t); });
    return h;
  }

  function renderViews(views) {
    if (!views || !views.length) return '<p class="empty">该词条暂无详细内容。</p>';
    let nav = '<nav class="sec-nav">';
    views.forEach(v => { nav += '<a class="sec-nav-item" href="#sec-' + v.key + '">' + esc(v.title) + '</a>'; });
    nav += '</nav>';
    let body = '';
    views.forEach(v => {
      body += '<section id="sec-' + v.key + '" class="sec">';
      body += '<h2 class="sec-title">' + esc(v.title) + '</h2>';
      body += renderBlocks(v);
      if (v.children && v.children.length) {
        v.children.forEach(ch => {
          body += '<div class="subsec"><h3 class="subsec-title">' + esc(ch.title) + '</h3>' + renderBlocks(ch) + '</div>';
        });
      }
      body += '</section>';
    });
    return nav + body;
  }

  global.MedRender = {
    SECTIONS, SUBSECTION_TITLES, buildCells, normTables, norm, buildViews, renderViews, renderTable, esc
  };
})(window);
