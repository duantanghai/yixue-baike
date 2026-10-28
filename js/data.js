// medweb/js/data.js
// 数据加载层：按需加载 index.json / specialties.json / <pkg>.json，带内存缓存。
(function (global) {
  'use strict';
  const BASE = 'data/';
  let _index = null;
  let _spec = null;
  const _pkgCache = {};

  async function loadIndex() {
    if (_index) return _index;
    const r = await fetch(BASE + 'index.json');
    _index = await r.json();
    return _index;
  }
  async function loadSpecialties() {
    if (_spec) return _spec;
    const r = await fetch(BASE + 'specialties.json');
    _spec = await r.json();
    return _spec;
  }
  async function loadPkg(pkg) {
    if (_pkgCache[pkg]) return _pkgCache[pkg];
    const r = await fetch(BASE + pkg + '.json');
    const arr = await r.json();
    _pkgCache[pkg] = arr;
    return arr;
  }
  async function findDisease(pkg, id) {
    const arr = await loadPkg(pkg);
    return arr.find(x => x.id === id) || null;
  }

  global.MedData = { loadIndex, loadSpecialties, loadPkg, findDisease };
})(window);
