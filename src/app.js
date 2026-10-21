/* DBB Block Editor: scene, interaction and panels. Needs THREE, OrbitControls, TransformControls and DBBCore. */
(function () {
  'use strict';
  var C = window.DBBCore;
  var THREE = window.THREE;
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  /* Add new examples here: they appear in the Examples menu. */
  var EXAMPLES = [
    { id: 'simple', label: 'Simple (5 blocks)', make: function () { return C.simpleExample(); } },
    { id: 'gunnerus', label: 'R/V Gunnerus (15 blocks)', make: function () { return C.gunnerusExample(); } },
    { id: 'psv', label: 'PSV (20 blocks)', make: function () { return C.exampleProject(); } }
  ];
  var STORE_KEY = 'dbb-block-editor:project';

  /* ---------- small helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n, d) {
    if (d === undefined) d = 1;
    return Number(n).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fin(v) { return String(Math.round(v * 1000) / 1000); }
  function slug(s) { return (String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')) || 'dbb-project'; }

  var ICON_EYE = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8Z"/><circle cx="8" cy="8" r="2"/></svg>';
  var ICON_EYE_OFF = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8Z" opacity=".45"/><path d="M2.5 13.5 13.5 2.5"/></svg>';
  var SHAPE_ICONS = {
    box: '<path d="M16 4 27 10v12l-11 6L5 22V10Z M5 10l11 6 11-6 M16 16v12"/>',
    cylinder: '<ellipse cx="16" cy="8" rx="9" ry="3.5"/><path d="M7 8v16a9 3.5 0 0 0 18 0V8"/>',
    halfcyl: '<path d="M4 25h24 M4 25a12 14 0 0 1 24 0"/>',
    cone: '<path d="M16 4 26 24a10 4 0 0 1-20 0Z"/>',
    pyramid: '<path d="M16 4 4 24l12 5 12-5Z M16 4v25"/>',
    wedge: '<path d="M4 26h20V10Z M9 22h20V6Z M24 26l5-4 M24 10l5-4 M4 26l5-4"/>',
    sphere: '<circle cx="16" cy="16" r="11"/><ellipse cx="16" cy="16" rx="11" ry="4"/>'
  };
  var DEFAULT_SIZE = { box: [8, 6, 4], cylinder: [5, 5, 5], halfcyl: [8, 6, 4], cone: [5, 5, 5], pyramid: [6, 6, 5], wedge: [8, 6, 4], sphere: [6, 6, 6] };
  var NEW_GROUP_COLORS = ['#d96ca8', '#5db0e8', '#9bbf3b', '#e58b4a', '#7f7fd6', '#53c2a5'];

  /* ---------- state ---------- */
  var S = {
    model: null, sel: null, activeGroup: null, activeReq: null,
    collapsed: {}, mode: 'translate', snap: 0.5, xray: false,
    tab: 'summary', drawerOpen: true, delim: ','
  };
  var meshes = {};            // block id -> THREE.Mesh
  var theme = {};
  var labels = [];
  var toastTimer = 0, saveTimer = 0, uiRaf = 0;

  function blockById(id) {
    var bs = S.model.blocks;
    for (var i = 0; i < bs.length; i++) if (bs[i].id === id) return bs[i];
    return null;
  }
  function selBlock() { return S.sel ? blockById(S.sel) : null; }
  function groupById(id) { return C.groupMap(S.model)[id] || null; }
  function groupColor(id) { var g = groupById(id); return g ? g.color : '#8c97a8'; }
  function firstLeaf() {
    var ord = C.groupOrder(S.model);
    for (var i = 0; i < ord.length; i++) {
      var id = ord[i].group.id;
      if (!S.model.groups.some(function (g) { return g.parent === id; })) return id;
    }
    return S.model.groups[0].id;
  }

  /* ---------- three.js scene ---------- */
  var vp = $('#viewport');
  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  vp.insertBefore(renderer.domElement, vp.firstChild);
  var dom = renderer.domElement;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.5, 4000);
  camera.up.set(0, 0, 1);
  camera.position.set(-60, -110, 80);
  var orbit = new THREE.OrbitControls(camera, dom);
  orbit.target.set(42, 0, 8);
  orbit.minDistance = 2;
  orbit.maxDistance = 1800;
  orbit.screenSpacePanning = true;
  orbit.update();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x56627a, 0.95));
  var sun = new THREE.DirectionalLight(0xffffff, 0.75);
  sun.position.set(-60, -90, 140);
  scene.add(sun);

  var blocksRoot = new THREE.Group();
  scene.add(blocksRoot);
  var gridGroup = new THREE.Group();
  scene.add(gridGroup);

  var edgeMat = new THREE.LineBasicMaterial({ color: 0x172033, transparent: true, opacity: 0.55 });

  var tc = new THREE.TransformControls(camera, dom);
  tc.setSize(0.85);
  scene.add(tc);

  var selBox = new THREE.BoxHelper(new THREE.Object3D(), 0xff2e93);
  selBox.raycast = function () {};
  selBox.visible = false;
  scene.add(selBox);

  var needs = true;
  function request() { needs = true; }
  (function loop() {
    window.requestAnimationFrame(loop);
    if (needs) { needs = false; renderer.render(scene, camera); }
  })();
  orbit.addEventListener('change', request);
  tc.addEventListener('change', request);

  function resize() {
    var w = Math.max(10, vp.clientWidth), h = Math.max(10, vp.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    request();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(vp);
  window.addEventListener('resize', resize);

  /* ---------- theme-aware scene dressing ---------- */
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

  function makeLabel(text, color, scaleW) {
    var cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    var g = cv.getContext('2d');
    g.font = '500 30px ui-monospace, Menlo, Consolas, monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(text, 128, 34);
    var tex = new THREE.CanvasTexture(cv);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.scale.set(scaleW, scaleW / 4, 1);
    sp.renderOrder = 5;
    sp.raycast = function () {};
    return sp;
  }

  function buildDressing() {
    while (gridGroup.children.length) {
      var o = gridGroup.children.pop();
      if (o.geometry) o.geometry.dispose();
      if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
    }
    labels = [];
    var grid = new THREE.GridHelper(400, 80, new THREE.Color(theme.gridA), new THREE.Color(theme.gridB));
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.02;
    grid.raycast = function () {};
    gridGroup.add(grid);

    // axes at the origin: x forward (red), y to port (green), z up (blue)
    var len = 14, pos = [0, 0, 0, len, 0, 0, 0, 0, 0, 0, len, 0, 0, 0, 0, 0, 0, len];
    var col = [0.86, 0.2, 0.2, 0.86, 0.2, 0.2, 0.18, 0.62, 0.3, 0.18, 0.62, 0.3, 0.2, 0.4, 0.9, 0.2, 0.4, 0.9];
    var ag = new THREE.BufferGeometry();
    ag.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    ag.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    var axes = new THREE.LineSegments(ag, new THREE.LineBasicMaterial({ vertexColors: true }));
    axes.raycast = function () {};
    gridGroup.add(axes);

    function add(text, x, y, z, w) {
      var s = makeLabel(text, theme.label, w || 9);
      s.position.set(x, y, z);
      gridGroup.add(s);
    }
    add('+X bow', len + 6, 0, 0, 11);
    add('+Y port', 0, len + 5, 0, 11);
    add('+Z up', 0, 0, len + 3, 9);
    for (var x = 10; x <= 120; x += 10) add(x + ' m', x, -4.5, 0, 7);
    request();
  }

  function applyTheme() {
    theme = {
      bg: cssVar('--vp-bg'), gridA: cssVar('--grid-a'), gridB: cssVar('--grid-b'),
      edge: cssVar('--edge'), label: cssVar('--label'), sel: cssVar('--sel')
    };
    scene.background = new THREE.Color(theme.bg);
    edgeMat.color.set(theme.edge);
    selBox.material.color.set(theme.sel);
    buildDressing();
    reconcile();
  }

  /* ---------- meshes ---------- */
  function createMesh(b) {
    var mat = new THREE.MeshLambertMaterial({ color: groupColor(b.group), polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    var m = new THREE.Mesh(C.makeGeometry(b.shape), mat);
    m.userData.id = b.id;
    m.userData.shape = b.shape;
    var edges = new THREE.LineSegments(C.makeEdges(b.shape), edgeMat);
    edges.raycast = function () {};
    m.add(edges);
    m.userData.edges = edges;
    return m;
  }

  function swapShape(m, b) {
    m.geometry = C.makeGeometry(b.shape);
    m.remove(m.userData.edges);
    var edges = new THREE.LineSegments(C.makeEdges(b.shape), edgeMat);
    edges.raycast = function () {};
    m.add(edges);
    m.userData.edges = edges;
    m.userData.shape = b.shape;
  }

  function syncTransform(m, b) {
    m.position.set(b.position[0], b.position[1], b.position[2]);
    m.rotation.set(b.rotation[0] * D2R, b.rotation[1] * D2R, b.rotation[2] * D2R, 'XYZ');
    m.scale.set(b.size[0], b.size[1], b.size[2]);
  }

  function styleMesh(m, b) {
    var mat = m.material, sel = b.id === S.sel;
    mat.color.set(groupColor(b.group));
    mat.emissive.set(sel ? theme.sel || '#ff2e93' : '#000000');
    if (sel) mat.emissive.multiplyScalar(0.3);
    var tr = S.xray;
    if (mat.transparent !== tr) mat.needsUpdate = true;
    mat.transparent = tr;
    mat.opacity = tr ? 0.38 : 1;
    mat.depthWrite = !tr;
  }

  function reconcile() {
    if (!S.model) return;
    var seen = {};
    S.model.blocks.forEach(function (b) {
      seen[b.id] = true;
      var m = meshes[b.id];
      if (!m) { m = createMesh(b); meshes[b.id] = m; blocksRoot.add(m); }
      else if (m.userData.shape !== b.shape) swapShape(m, b);
      syncTransform(m, b);
      m.visible = !b.hidden && C.isGroupVisible(S.model, b.group);
      styleMesh(m, b);
    });
    Object.keys(meshes).forEach(function (id) {
      if (!seen[id]) {
        if (tc.object === meshes[id]) tc.detach();
        blocksRoot.remove(meshes[id]);
        meshes[id].material.dispose();
        delete meshes[id];
      }
    });
    updateGizmo();
  }

  function updateGizmo() {
    var m = S.sel ? meshes[S.sel] : null;
    if (m && m.visible) {
      if (tc.object !== m) tc.attach(m);
      tc.setMode(S.mode);
      selBox.setFromObject(m);
      selBox.visible = true;
    } else {
      tc.detach();
      selBox.visible = false;
    }
    request();
  }

  /* ---------- transform controls ---------- */
  function applySnapSettings() {
    tc.setTranslationSnap(null);                 // translation snaps block faces in objectChange below
    tc.setRotationSnap(S.snap ? 15 * D2R : null);
    tc.setScaleSnap(S.snap || null);
  }

  function readMesh(m, b) {
    b.position = [m.position.x, m.position.y, m.position.z];
    b.size = [Math.max(0.05, m.scale.x), Math.max(0.05, m.scale.y), Math.max(0.05, m.scale.z)];
    b.rotation = [m.rotation.x * R2D, m.rotation.y * R2D, m.rotation.z * R2D].map(function (v) { return Math.abs(v) < 1e-7 ? 0 : Math.round(v * 1e4) / 1e4; });
  }

  function snapFaces(b, m) {
    var s = S.snap;
    if (!s) return;
    var bx = C.blockWorldBox(b);
    for (var i = 0; i < 3; i++) {
      var d = Math.round(bx.min[i] / s) * s - bx.min[i];
      b.position[i] = Math.round((b.position[i] + d) * 1e6) / 1e6;
    }
    m.position.set(b.position[0], b.position[1], b.position[2]);
  }

  tc.addEventListener('objectChange', function () {
    var m = tc.object;
    if (!m) return;
    var b = blockById(m.userData.id);
    if (!b) return;
    if (S.mode === 'scale') m.scale.set(Math.max(0.05, m.scale.x), Math.max(0.05, m.scale.y), Math.max(0.05, m.scale.z));
    readMesh(m, b);
    if (S.mode === 'translate') snapFaces(b, m);
    selBox.update();
    uiSoon();
    request();
  });
  tc.addEventListener('dragging-changed', function (e) {
    orbit.enabled = !e.value;
    if (!e.value) { var m = tc.object; if (m) { var b = blockById(m.userData.id); if (b) readMesh(m, b); } renderAll(); pushHistory(); }
  });

  /* ---------- picking ---------- */
  var rc = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  function setRay(e) {
    var r = dom.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rc.setFromCamera(ndc, camera);
  }
  function visibleMeshes() { return Object.keys(meshes).map(function (k) { return meshes[k]; }).filter(function (m) { return m.visible; }); }

  var down = null;
  dom.addEventListener('pointerdown', function (e) {
    down = { x: e.clientX, y: e.clientY, onGizmo: !!(tc.axis || tc.dragging), button: e.button };
  });
  dom.addEventListener('pointerup', function (e) {
    var d = down; down = null;
    if (!d || d.button !== 0 || d.onGizmo) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return;
    setRay(e);
    var hit = rc.intersectObjects(visibleMeshes(), false)[0];
    select(hit ? hit.object.userData.id : null);
  });

  var groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  function dropPoint(e) {
    setRay(e);
    var hit = rc.intersectObjects(visibleMeshes(), false)[0];
    if (hit) {
      var b = blockById(hit.object.userData.id);
      return { x: hit.point.x, y: hit.point.y, z: b ? C.blockWorldBox(b).max[2] : 0 };
    }
    var p = new THREE.Vector3();
    if (rc.ray.intersectPlane(groundPlane, p)) return { x: p.x, y: p.y, z: 0 };
    return { x: orbit.target.x, y: orbit.target.y, z: 0 };
  }

  /* ---------- camera views ---------- */
  function setView(name) {
    var env = C.envelope(S.model);
    var cx = 42, cy = 0, cz = 8, R = 45;
    if (env) {
      cx = (env.min[0] + env.max[0]) / 2; cy = (env.min[1] + env.max[1]) / 2; cz = (env.min[2] + env.max[2]) / 2;
      R = Math.max(4, 0.5 * Math.sqrt(env.length * env.length + env.beam * env.beam + env.height * env.height));
    }
    var dir;
    if (name === 'fit') dir = camera.position.clone().sub(orbit.target).normalize();
    else if (name === 'top') dir = new THREE.Vector3(0, -0.015, 1).normalize();
    else if (name === 'side') dir = new THREE.Vector3(0, -1, 0);
    else if (name === 'front') dir = new THREE.Vector3(1, 0, 0);
    else dir = new THREE.Vector3(-0.7, -1, 0.62).normalize();
    var vf = camera.fov * D2R / 2;
    var hf = Math.atan(Math.tan(vf) * camera.aspect);
    var d = Math.max(R / Math.sin(vf), R / Math.sin(hf)) * 1.08;
    orbit.target.set(cx, cy, cz);
    camera.position.set(cx + dir.x * d, cy + dir.y * d, cz + dir.z * d);
    camera.near = Math.max(0.1, d / 200);
    camera.far = Math.max(4000, d * 30);
    camera.updateProjectionMatrix();
    orbit.update();
    request();
  }

  /* ---------- history, autosave ---------- */
  var H = { past: [], future: [] };
  function snapshot() { return JSON.stringify(S.model); }
  function pushHistory() {
    var s = snapshot();
    if (H.past[H.past.length - 1] === s) { updateUndo(); return; }
    H.past.push(s);
    if (H.past.length > 150) H.past.shift();
    H.future.length = 0;
    updateUndo();
    scheduleSave();
  }
  function restore(s) {
    S.model = JSON.parse(s);
    if (S.sel && !blockById(S.sel)) S.sel = null;
    fixActive();
    reconcile();
    renderAll();
    scheduleSave();
  }
  function undo() { if (H.past.length < 2) return; H.future.push(H.past.pop()); restore(H.past[H.past.length - 1]); }
  function redo() { if (!H.future.length) return; var s = H.future.pop(); H.past.push(s); restore(s); }
  function updateUndo() { $('#btnUndo').disabled = H.past.length < 2; $('#btnRedo').disabled = !H.future.length; }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { try { localStorage.setItem(STORE_KEY, snapshot()); } catch (e) { /* storage unavailable */ } }, 400);
  }
  function fixActive() {
    var gm = C.groupMap(S.model);
    if (!S.activeGroup || !gm[S.activeGroup]) S.activeGroup = firstLeaf();
    if (S.activeReq && !S.model.requirements.some(function (r) { return r.id === S.activeReq; })) S.activeReq = null;
  }

  function setModel(model, message) {
    S.model = model;
    S.sel = null;
    S.collapsed = {};
    S.activeGroup = null; S.activeReq = null;
    fixActive();
    reconcile();
    renderAll();
    setView('iso');
    pushHistory();
    if (message) toast(message);
  }

  /* ---------- actions: blocks ---------- */
  function nextBlockId() {
    var taken = {};
    S.model.blocks.forEach(function (b) { taken[b.id] = true; });
    return C.uid('b', taken);
  }
  function nextName(shape) {
    var base = C.SHAPES[shape].label, n = 1, names = {};
    S.model.blocks.forEach(function (b) { names[b.name] = true; });
    while (names[base + ' ' + n]) n++;
    return base + ' ' + n;
  }

  function addBlock(shape, at) {
    fixActive();
    var d = DEFAULT_SIZE[shape] || [8, 6, 4];
    var x = at ? at.x : orbit.target.x, y = at ? at.y : orbit.target.y, zb = at ? at.z : 0;
    var s = S.snap;
    var px = s ? Math.round((x - d[0] / 2) / s) * s + d[0] / 2 : x;
    var py = s ? Math.round((y - d[1] / 2) / s) * s + d[1] / 2 : y;
    var pz = s ? Math.round(zb / s) * s + d[2] / 2 : zb + d[2] / 2;
    var b = {
      id: nextBlockId(), name: nextName(shape), shape: shape, group: S.activeGroup, req: S.activeReq,
      position: [px, py, pz], size: d.slice(), rotation: [0, 0, 0], areaOverride: null, hidden: false
    };
    S.model.blocks.push(b);
    S.sel = b.id;
    reconcile();
    renderAll();
    pushHistory();
  }

  function select(id) {
    S.sel = id;
    reconcile();
    renderTree();
    renderProps();
    renderBlocksTab();
  }

  function deleteSelected() {
    var b = selBlock();
    if (!b) return;
    S.model.blocks = S.model.blocks.filter(function (x) { return x.id !== b.id; });
    S.sel = null;
    reconcile(); renderAll(); pushHistory();
  }

  function duplicateSelected() {
    var b = selBlock();
    if (!b) return;
    var c = JSON.parse(JSON.stringify(b));
    c.id = nextBlockId();
    c.name = nextName(b.shape);
    c.position[0] += 1; c.position[1] += 1;
    S.model.blocks.push(c);
    S.sel = c.id;
    reconcile(); renderAll(); pushHistory();
  }

  function toggleSelectedHidden() {
    var b = selBlock();
    if (!b) return;
    b.hidden = !b.hidden;
    reconcile(); renderAll(); pushHistory();
  }

  /* ---------- actions: groups ---------- */
  function addGroup(parentId) {
    var taken = {};
    S.model.groups.forEach(function (g) { taken[g.id] = true; });
    var id = C.uid('g', taken);
    var color = NEW_GROUP_COLORS[S.model.groups.length % NEW_GROUP_COLORS.length];
    S.model.groups.push({ id: id, name: 'New group', color: color, parent: parentId || null, visible: true });
    if (parentId) delete S.collapsed[parentId];
    S.activeGroup = id;
    reconcile(); renderAll(); pushHistory();
    setTimeout(function () { var i = $('#tree [data-gid="' + id + '"] .gname'); if (i) { i.focus(); i.select(); } }, 0);
  }

  function deleteGroup(id) {
    var g = groupById(id);
    if (!g) return;
    if (S.model.groups.length < 2) { toast('Keep at least one group.', true); return; }
    var target = g.parent || null;
    if (!target) {
      var others = S.model.groups.filter(function (x) { return x.id !== id && x.parent !== id; });
      target = others.length ? others[0].id : null;
    }
    S.model.groups.forEach(function (x) { if (x.parent === id) x.parent = g.parent || null; });
    S.model.groups = S.model.groups.filter(function (x) { return x.id !== id; });
    if (!target || !groupById(target)) target = S.model.groups[0].id;
    var moved = 0;
    S.model.blocks.forEach(function (b) { if (b.group === id) { b.group = target; moved++; } });
    fixActive();
    reconcile(); renderAll(); pushHistory();
    if (moved) toast(moved + ' block' + (moved > 1 ? 's' : '') + ' moved to ' + groupById(target).name + '.');
  }

  function showAll() {
    S.model.groups.forEach(function (g) { g.visible = true; });
    S.model.blocks.forEach(function (b) { b.hidden = false; });
    reconcile(); renderAll(); pushHistory();
  }

  /* ---------- actions: requirements ---------- */
  function addRequirement() {
    var taken = {};
    S.model.requirements.forEach(function (r) { taken[r.id] = true; });
    var id = C.uid('r', taken);
    S.model.requirements.push({ id: id, name: 'New requirement', metric: 'volume', sense: 'min', shall: null, should: null });
    setTab('reqs');
    renderAll(); pushHistory();
    setTimeout(function () { var i = $('#reqTbl [data-rid="' + id + '"] [data-f="rname"]'); if (i) { i.focus(); i.select(); } }, 0);
  }

  function deleteRequirement(id) {
    S.model.requirements = S.model.requirements.filter(function (r) { return r.id !== id; });
    S.model.blocks.forEach(function (b) { if (b.req === id) b.req = null; });
    fixActive();
    renderAll(); pushHistory();
  }

  /* ---------- rendering: hierarchy ---------- */
  function renderTree() {
    var sum = C.summarize(S.model);
    var tot = {};
    sum.rows.forEach(function (r) { tot[r.group.id] = r.total; });
    var byGroup = {};
    S.model.blocks.forEach(function (b) { (byGroup[b.group] = byGroup[b.group] || []).push(b); });
    var html = [];
    var hiddenDepth = -1;
    C.groupOrder(S.model).forEach(function (r) {
      var g = r.group;
      if (hiddenDepth >= 0 && r.depth > hiddenDepth) return;
      hiddenDepth = -1;
      var collapsed = !!S.collapsed[g.id];
      var visible = g.visible !== false;
      var t = tot[g.id] || { n: 0 };
      html.push('<div class="grow' + (r.depth === 0 ? ' top' : '') + (S.activeGroup === g.id ? ' active' : '') + (visible ? '' : ' off') + '" data-gid="' + esc(g.id) + '" style="--depth:' + r.depth + '">' +
        '<button class="ic" data-act="collapse" aria-label="' + (collapsed ? 'Expand' : 'Collapse') + ' group" aria-expanded="' + !collapsed + '">' + (collapsed ? '▸' : '▾') + '</button>' +
        '<input type="color" class="gcolor" value="' + esc(g.color) + '" aria-label="Colour of ' + esc(g.name) + '">' +
        '<input type="text" class="gname" value="' + esc(g.name) + '" aria-label="Group name" spellcheck="false">' +
        '<span class="cnt" title="Blocks in this group, subgroups included">' + t.n + '</span>' +
        '<button class="ic" data-act="gvis" aria-label="' + (visible ? 'Hide' : 'Show') + ' group" title="' + (visible ? 'Hide' : 'Show') + ' group">' + (visible ? ICON_EYE : ICON_EYE_OFF) + '</button>' +
        '<button class="ic" data-act="addsub" aria-label="Add subgroup" title="Add subgroup">+</button>' +
        '<button class="ic" data-act="delg" aria-label="Delete group" title="Delete group">×</button>' +
        '</div>');
      if (collapsed) { hiddenDepth = r.depth; return; }
      (byGroup[g.id] || []).forEach(function (b) {
        var off = b.hidden || !visible;
        html.push('<div class="brow' + (b.id === S.sel ? ' sel' : '') + (off ? ' off' : '') + '" data-bid="' + esc(b.id) + '" style="--depth:' + (r.depth + 1) + '">' +
          '<span class="sw" style="background:' + esc(g.color) + '"></span>' +
          '<button class="bname" data-act="selb" title="' + esc(b.name) + '">' + esc(b.name) + '</button>' +
          '<span class="bvol" title="Volume m³">' + fmt(C.blockVolume(b), 0) + '</span>' +
          '<button class="ic" data-act="bvis" aria-label="' + (b.hidden ? 'Show' : 'Hide') + ' block" title="' + (b.hidden ? 'Show' : 'Hide') + ' block">' + (b.hidden ? ICON_EYE_OFF : ICON_EYE) + '</button>' +
          '</div>');
      });
    });
    $('#tree').innerHTML = html.join('') || '<div class="empty-note">No groups.</div>';
  }

  function updateTreeVolumes() {
    $$('#tree .brow').forEach(function (row) {
      var b = blockById(row.getAttribute('data-bid'));
      var v = $('.bvol', row);
      if (b && v) v.textContent = fmt(C.blockVolume(b), 0);
    });
  }

  /* ---------- rendering: library selects ---------- */
  var sigNew = '';
  function groupOptionsHtml() {
    return C.groupOrder(S.model).map(function (r) {
      return '<option value="' + esc(r.group.id) + '">' + '  '.repeat(r.depth) + esc(r.group.name) + '</option>';
    }).join('');
  }
  function reqOptionsHtml(noneLabel) {
    return '<option value="">' + noneLabel + '</option>' + S.model.requirements.map(function (r) {
      return '<option value="' + esc(r.id) + '">' + esc(r.name) + '</option>';
    }).join('');
  }
  function renderLibrarySelects() {
    var sig = JSON.stringify([S.model.groups.map(function (g) { return [g.id, g.name, g.parent]; }), S.model.requirements.map(function (r) { return [r.id, r.name]; })]);
    if (sig !== sigNew) {
      sigNew = sig;
      $('#newGroup').innerHTML = groupOptionsHtml();
      $('#newReq').innerHTML = reqOptionsHtml('None');
    }
    $('#newGroup').value = S.activeGroup;
    $('#newReq').value = S.activeReq || '';
  }

  /* ---------- rendering: properties ---------- */
  var sigProps = '';
  function setVal(input, v) { if (document.activeElement !== input) input.value = v; }
  function renderProps() {
    var b = selBlock();
    $('#propsEmpty').hidden = !!b;
    $('#propsForm').hidden = !b;
    if (!b) return;
    var form = $('#propsForm');
    var sig = JSON.stringify([S.model.groups.map(function (g) { return [g.id, g.name, g.parent]; }), S.model.requirements.map(function (r) { return [r.id, r.name]; })]);
    if (sig !== sigProps) {
      sigProps = sig;
      $('[data-f="group"]', form).innerHTML = groupOptionsHtml();
      $('[data-f="req"]', form).innerHTML = reqOptionsHtml('None');
      $('[data-f="shape"]', form).innerHTML = C.SHAPE_ORDER.map(function (k) { return '<option value="' + k + '">' + C.SHAPES[k].label + '</option>'; }).join('');
    }
    setVal($('[data-f="name"]', form), b.name);
    $('[data-f="shape"]', form).value = b.shape;
    $('[data-f="group"]', form).value = b.group;
    $('[data-f="req"]', form).value = b.req || '';
    $$('[data-f="size"]', form).forEach(function (i) { setVal(i, fin(b.size[+i.dataset.i])); });
    $$('[data-f="pos"]', form).forEach(function (i) { setVal(i, fin(b.position[+i.dataset.i])); });
    $$('[data-f="rot"]', form).forEach(function (i) { setVal(i, fin(b.rotation[+i.dataset.i])); });
    var on = b.areaOverride != null;
    $('[data-f="areaon"]', form).checked = on;
    $('#areaRow').hidden = !on;
    if (on) setVal($('[data-f="area"]', form), fin(b.areaOverride));
    var bx = C.blockWorldBox(b);
    function ext(i) { return fmt(bx.min[i], 2) + ' → ' + fmt(bx.max[i], 2); }
    $('#pOut').innerHTML =
      '<dt>Volume</dt><dd>' + fmt(C.blockVolume(b), 2) + ' m³</dd>' +
      '<dt>Plan area</dt><dd>' + fmt(C.blockPlanArea(b), 2) + ' m²</dd>' +
      '<dt>Used area</dt><dd>' + fmt(C.blockArea(b), 2) + ' m²' + (on ? ' (typed)' : '') + '</dd>' +
      '<dt>X from–to</dt><dd>' + ext(0) + '</dd>' +
      '<dt>Y from–to</dt><dd>' + ext(1) + '</dd>' +
      '<dt>Z from–to</dt><dd>' + ext(2) + '</dd>';
    $('#pHide').textContent = b.hidden ? 'Show' : 'Hide';
  }

  /* ---------- rendering: tables ---------- */
  function renderHud() {
    var e = C.envelope(S.model);
    $('#hud').innerHTML = e
      ? '<span><b>L</b>' + fmt(e.length, 2) + '</span><span><b>B</b>' + fmt(e.beam, 2) + '</span><span><b>H</b>' + fmt(e.height, 2) + '</span><span><b>V</b>' + fmt(C.summarize(S.model).total.vol, 0) + ' m³</span>'
      : '<span>L / B / H appear here</span>';
    $('#vpEmpty').hidden = S.model.blocks.length > 0;
  }

  function renderSummary() {
    var s = C.summarize(S.model);
    var e = s.envelope;
    $('#env').innerHTML =
      '<div><small>Length (X)</small><b>' + (e ? fmt(e.length, 2) : '–') + ' m</b></div>' +
      '<div><small>Beam (Y)</small><b>' + (e ? fmt(e.beam, 2) : '–') + ' m</b></div>' +
      '<div><small>Height (Z)</small><b>' + (e ? fmt(e.height, 2) : '–') + ' m</b></div>' +
      '<div><small>Gross volume</small><b>' + fmt(s.total.vol, 1) + ' m³</b></div>' +
      '<div><small>Gross area</small><b>' + fmt(s.total.area, 1) + ' m²</b></div>';
    var rows = ['<thead><tr><th>System</th><th class="num">Blocks</th><th class="num">Area m²</th><th class="num">Volume m³</th><th class="share">Share of volume</th></tr></thead><tbody>'];
    s.rows.forEach(function (r) {
      var pct = s.total.vol > 0 ? 100 * r.total.vol / s.total.vol : 0;
      var cls = r.depth === 0 ? 'sub' : (r.total.n === 0 ? 'zero' : '');
      rows.push('<tr class="' + cls + '"><td style="padding-left:' + (8 + r.depth * 16) + 'px"><span class="sw" style="background:' + esc(r.group.color) + '"></span>' + esc(r.group.name) + '</td>' +
        '<td class="num">' + r.total.n + '</td><td class="num">' + fmt(r.total.area) + '</td><td class="num">' + fmt(r.total.vol) + '</td>' +
        '<td class="share"><span class="bar" style="width:' + Math.round(pct * 0.9) + 'px;background:' + esc(r.group.color) + '"></span> <span class="mono">' + fmt(pct, 1) + '%</span></td></tr>');
    });
    rows.push('<tr class="tot"><td>Gross total</td><td class="num">' + s.total.n + '</td><td class="num">' + fmt(s.total.area) + '</td><td class="num">' + fmt(s.total.vol) + '</td><td></td></tr></tbody>');
    $('#sumTbl').innerHTML = rows.join('');
  }

  var sigReq = '';
  function statusChip(status, req) {
    var glyph = { should: '●', shall: '◐', fail: '✕', none: '–' }[status];
    var label = C.STATUS_LABEL[status];
    if (status === 'fail') label = req.sense === 'max' ? 'Over limit' : 'Below shall';
    return '<span class="chip ' + status + '"><span aria-hidden="true">' + glyph + '</span>' + label + '</span>';
  }
  function renderReqs() {
    var ev = C.evaluateRequirements(S.model);
    var bad = ev.filter(function (e) { return e.status === 'fail'; }).length;
    var badge = $('#reqBadge');
    badge.hidden = bad === 0;
    badge.textContent = bad;
    badge.title = bad + ' requirement' + (bad === 1 ? '' : 's') + ' not met';

    var sig = JSON.stringify(S.model.requirements.map(function (r) { return [r.id, r.metric, r.sense]; }));
    var tbl = $('#reqTbl');
    if (sig !== sigReq || !$('thead', tbl)) {
      sigReq = sig;
      var h = ['<thead><tr><th>Requirement</th><th>Metric</th><th>Sense</th><th class="num">Shall</th><th class="num">Should</th><th class="num">Achieved</th><th>Status</th><th class="num">Blocks</th><th></th></tr></thead><tbody>'];
      ev.forEach(function (e) {
        var r = e.req;
        h.push('<tr data-rid="' + esc(r.id) + '">' +
          '<td class="nm"><input type="text" data-f="rname" value="' + esc(r.name) + '" aria-label="Requirement name" spellcheck="false"></td>' +
          '<td><select data-f="rmetric" aria-label="Metric">' + Object.keys(C.METRICS).map(function (k) { return '<option value="' + k + '"' + (k === r.metric ? ' selected' : '') + '>' + C.METRICS[k].label + '</option>'; }).join('') + '</select></td>' +
          '<td><select data-f="rsense" aria-label="Sense"><option value="min"' + (r.sense === 'min' ? ' selected' : '') + '>at least</option><option value="max"' + (r.sense === 'max' ? ' selected' : '') + '>at most</option></select></td>' +
          '<td class="num"><input type="number" step="any" data-f="rshall" value="' + (r.shall == null ? '' : r.shall) + '" aria-label="Shall value"></td>' +
          '<td class="num"><input type="number" step="any" data-f="rshould" value="' + (r.should == null ? '' : r.should) + '" aria-label="Should value"></td>' +
          '<td class="num" data-c="ach"></td><td data-c="st"></td><td class="num" data-c="n"></td>' +
          '<td><button class="ic" data-act="delr" aria-label="Delete requirement" title="Delete requirement">×</button></td></tr>');
      });
      if (!ev.length) h.push('<tr><td colspan="9" class="empty-note">No requirements yet. Add one, then pick it for blocks in the library or the block panel.</td></tr>');
      h.push('</tbody>');
      tbl.innerHTML = h.join('');
    }
    ev.forEach(function (e) {
      var row = $('tr[data-rid="' + e.req.id + '"]', tbl);
      if (!row) return;
      $('[data-c="ach"]', row).textContent = fmt(e.achieved, 2) + ' ' + C.METRICS[e.req.metric].unit;
      $('[data-c="st"]', row).innerHTML = statusChip(e.status, e.req);
      $('[data-c="n"]', row).textContent = (e.req.metric === 'volume' || e.req.metric === 'area') ? e.n : '–';
    });
  }

  function renderBlocksTab() {
    var rm = {};
    S.model.requirements.forEach(function (r) { rm[r.id] = r.name; });
    var gm = C.groupMap(S.model);
    var h = ['<thead><tr><th>Name</th><th>Group</th><th>Requirement</th><th>Shape</th><th class="num">L</th><th class="num">B</th><th class="num">H</th><th class="num">X</th><th class="num">Y</th><th class="num">Z</th><th class="num">Volume m³</th><th class="num">Area m²</th></tr></thead><tbody>'];
    S.model.blocks.forEach(function (b) {
      var g = gm[b.group];
      h.push('<tr class="pick' + (b.id === S.sel ? ' sel' : '') + '" data-bid="' + esc(b.id) + '"><td><span class="sw" style="background:' + esc(g ? g.color : '#888') + '"></span>' + esc(b.name) + '</td>' +
        '<td>' + esc(g ? g.name : '') + '</td><td>' + esc(b.req ? rm[b.req] || '' : '') + '</td><td>' + C.SHAPES[b.shape].label + '</td>' +
        b.size.map(function (v) { return '<td class="num">' + fmt(v, 2) + '</td>'; }).join('') +
        b.position.map(function (v) { return '<td class="num">' + fmt(v, 2) + '</td>'; }).join('') +
        '<td class="num">' + fmt(C.blockVolume(b), 2) + '</td><td class="num">' + fmt(C.blockArea(b), 2) + (b.areaOverride != null ? '*' : '') + '</td></tr>');
    });
    if (!S.model.blocks.length) h.push('<tr><td colspan="12" class="empty-note">No blocks yet.</td></tr>');
    h.push('</tbody>');
    $('#blkTbl').innerHTML = h.join('');
  }

  function renderAll() {
    fixActive();
    renderLibrarySelects();
    renderTree();
    renderProps();
    renderHud();
    renderSummary();
    renderReqs();
    renderBlocksTab();
    $('#projName').value = S.model.name;
    updateUndo();
    request();
  }

  function uiSoon() {
    if (uiRaf) return;
    uiRaf = requestAnimationFrame(function () {
      uiRaf = 0;
      renderProps(); renderHud(); renderSummary(); renderReqs(); renderBlocksTab(); updateTreeVolumes();
    });
  }

  /* ---------- tabs, drawer ---------- */
  function setTab(t) {
    S.tab = t;
    ['summary', 'reqs', 'blocks'].forEach(function (k) {
      $('#tab-' + k).hidden = k !== t;
      $('#tabBtn-' + k).setAttribute('aria-selected', k === t ? 'true' : 'false');
    });
  }

  /* ---------- toasts, saving ---------- */
  function toast(msg, bad) {
    var t = $('#toast');
    t.textContent = msg;
    t.className = 'toast' + (bad ? ' bad' : '');
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, bad ? 5200 : 3200);
  }

  function showHelp() {
    var ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = '<div class="dialog help" role="dialog" aria-modal="true" aria-label="How to build a design"><h2>How to build a design</h2>' +
      '<ol>' +
      '<li><b>Start from your systems.</b> Take the spaces from your Systems Based Ship Design summary: each system that needs volume or deck area becomes a block. Use <i>New</i>, or open one from the <i>Examples</i> menu to see a finished design.</li>' +
      '<li><b>Set up groups.</b> The hierarchy on the left starts with Levander\u2019s OSV breakdown. Rename, recolour, add (<i>+ Group</i>, or + on a row) or delete groups to match your own division.</li>' +
      '<li><b>Write requirements.</b> Open the <i>Requirements</i> tab, add one, and choose a metric (volume, area, length, beam, height), whether it is at least or at most, and the <i>shall</i> and <i>should</i> values.</li>' +
      '<li><b>Pick the group and requirement for new blocks</b> in the two menus under the shape library. Volume and area requirements count only the blocks tagged with them.</li>' +
      '<li><b>Add blocks.</b> Click a shape, or drag it onto the workplane (dropping on a block puts it on top). It is placed in the chosen group.</li>' +
      '<li><b>Shape them.</b> Select a block, then use the <i>Move</i>, <i>Rotate</i> or <i>Scale</i> buttons above the 3D view (keys W, E, R). <b>To resize, choose Scale and drag the small coloured cubes</b>, or type the exact L, B, H, centre and rotation in the right panel. Snapping aligns block faces to the step you choose.</li>' +
      '<li><b>Read the tables.</b> <i>Summary</i> gives volume and area per group and the overall L, B, H. <i>Requirements</i> shows achieved values and whether shall/should are met. <i>Blocks</i> lists every block.</li>' +
      '<li><b>Iterate and save.</b> Resize or move blocks until the requirements are met. <i>Save</i> writes a JSON file you can reopen later; <i>Export CSV</i> saves the table you are viewing.</li>' +
      '</ol>' +
      '<h3>Reference</h3><ul class="refs">' +
      '<li>Gaspar, H.M., Fonseca, \u00CD.A. and Andrews, D., <i>Wither now the Design Building Block (DBB) Approach</i>. International Marine Design Conference (IMDC 2024). <a href="https://doi.org/10.59490/imdc.2024.915" target="_blank" rel="noopener">doi.org/10.59490/imdc.2024.915</a></li>' +
      '</ul>' +
      '<p class="note">Created by Henrique Gaspar, NTNU, October 2026.</p>' +
      '<p class="note">Axes: X forward from the aft end, Y to port, Z up from the baseline, in metres. Keys: W/E/R mode, Ctrl+D duplicate, Del delete, F fit, 1\u20134 views, Ctrl+Z undo.</p>' +
      '<div class="actions"><button class="btn primary" data-x="close">Got it</button></div></div>';
    document.body.appendChild(ov);
    function close() { ov.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.getAttribute('data-x') === 'close') close(); });
    $('[data-x="close"]', ov).focus();
  }

  function manualSave(filename, text, what) {
    var ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = '<div class="dialog" role="dialog" aria-modal="true" aria-label="' + esc(what) + '"><h2>' + esc(what) + '</h2>' +
      '<p>Saving files is not available here. Copy the text below and paste it into a file named <b>' + esc(filename) + '</b>.</p>' +
      '<textarea readonly spellcheck="false"></textarea><div class="actions"><button class="btn" data-x="copy">Copy</button><button class="btn primary" data-x="close">Close</button></div></div>';
    document.body.appendChild(ov);
    var ta = $('textarea', ov);
    ta.value = text;
    ta.focus(); ta.select();
    ov.addEventListener('click', function (e) {
      var x = e.target.getAttribute && e.target.getAttribute('data-x');
      if (x === 'close' || e.target === ov) ov.remove();
      if (x === 'copy') {
        var done = function () { toast('Copied.'); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { ta.select(); });
        else ta.select();
      }
    });
  }

  function browserDownload(filename, text) {
    try {
      var type = /\.csv$/.test(filename) ? 'text/csv;charset=utf-8' : 'application/json';
      var url = URL.createObjectURL(new Blob([text], { type: type }));
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return true;
    } catch (e) { return false; }
  }

  function deliver(filename, text, what) {
    if (!(window.claude && window.claude.use)) {   // standalone page (e.g. GitHub Pages): normal browser download
      if (browserDownload(filename, text)) toast(what + ' downloaded as ' + filename + '.');
      else manualSave(filename, text, what);
      return Promise.resolve();
    }
    var p = window.claude.use('downloads');
    return Promise.resolve(p).then(function (dl) {
      if (!dl) { manualSave(filename, text, what); return; }
      return dl.save({ filename: filename, data: text }).then(function () {
        toast(what + ' saved.');
      }, function (err) {
        if (err && err.code === 'declined') { toast('Save cancelled.'); return; }
        manualSave(filename, text, what);
      });
    }, function () { manualSave(filename, text, what); });
  }

  function saveProject() { deliver(slug(S.model.name) + '.json', C.serializeProject(S.model), 'Project'); }

  function exportCsv() {
    var name = slug(S.model.name), d = S.delim, csv, file;
    if (S.tab === 'reqs') { csv = C.requirementsCSV(S.model, d); file = name + '-requirements.csv'; }
    else if (S.tab === 'blocks') { csv = C.blocksCSV(S.model, d); file = name + '-blocks.csv'; }
    else { csv = C.summaryCSV(S.model, d); file = name + '-summary.csv'; }
    deliver(file, '﻿' + csv, 'Table');
  }

  function openText(text, label) {
    var res;
    try { res = C.sanitizeProject(JSON.parse(text)); }
    catch (err) { toast('Could not open ' + (label || 'file') + ': ' + (err && err.message ? err.message : err), true); return; }
    setModel(res.model, res.warnings.length ? 'Opened with notes: ' + res.warnings.slice(0, 2).join(' ') : 'Opened ' + (label || 'project') + '. Undo brings back the previous one.');
  }
  function openFile(file) {
    if (!file) return;
    var fr = new FileReader();
    fr.onload = function () { openText(String(fr.result), file.name); };
    fr.onerror = function () { toast('Could not read that file.', true); };
    fr.readAsText(file);
  }

  /* ---------- wiring ---------- */
  function wire() {
    // library tiles
    $('#lib').innerHTML = C.SHAPE_ORDER.map(function (k) {
      return '<button class="tile" draggable="true" data-shape="' + k + '" title="' + C.SHAPES[k].label + ' (click to add, or drag onto the workplane)">' +
        '<svg viewBox="0 0 32 32" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">' + SHAPE_ICONS[k] + '</svg><span>' + C.SHAPES[k].label + '</span></button>';
    }).join('');
    $('#lib').addEventListener('click', function (e) {
      var t = e.target.closest('[data-shape]');
      if (t) addBlock(t.getAttribute('data-shape'));
    });
    $('#lib').addEventListener('dragstart', function (e) {
      var t = e.target.closest('[data-shape]');
      if (!t) return;
      e.dataTransfer.setData('application/x-dbb-shape', t.getAttribute('data-shape'));
      e.dataTransfer.setData('text/plain', t.getAttribute('data-shape'));
      e.dataTransfer.effectAllowed = 'copy';
    });
    vp.addEventListener('dragover', function (e) {
      var types = Array.prototype.slice.call(e.dataTransfer.types || []);
      if (types.indexOf('application/x-dbb-shape') >= 0 || types.indexOf('Files') >= 0) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
    });
    vp.addEventListener('drop', function (e) {
      e.preventDefault();
      var f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) { openFile(f); return; }
      var k = e.dataTransfer.getData('application/x-dbb-shape');
      if (k && C.SHAPES[k]) addBlock(k, dropPoint(e));
    });

    $('#newGroup').addEventListener('change', function (e) { S.activeGroup = e.target.value; renderTree(); });
    $('#newReq').addEventListener('change', function (e) { S.activeReq = e.target.value || null; });

    // hierarchy
    var tree = $('#tree');
    tree.addEventListener('click', function (e) {
      var act = e.target.closest('[data-act]');
      var grow = e.target.closest('.grow'), brow = e.target.closest('.brow');
      if (act && grow) {
        var gid = grow.getAttribute('data-gid'), g = groupById(gid);
        if (!g) return;
        var a = act.getAttribute('data-act');
        if (a === 'collapse') { S.collapsed[gid] = !S.collapsed[gid]; renderTree(); }
        else if (a === 'gvis') { g.visible = g.visible === false; reconcile(); renderAll(); pushHistory(); }
        else if (a === 'addsub') addGroup(gid);
        else if (a === 'delg') deleteGroup(gid);
        return;
      }
      if (act && brow) {
        var b = blockById(brow.getAttribute('data-bid'));
        if (!b) return;
        if (act.getAttribute('data-act') === 'bvis') { b.hidden = !b.hidden; reconcile(); renderAll(); pushHistory(); }
        else select(b.id);
        return;
      }
      if (grow && !e.target.closest('input')) { S.activeGroup = grow.getAttribute('data-gid'); renderTree(); renderLibrarySelects(); }
    });
    tree.addEventListener('input', function (e) {
      if (!e.target.classList.contains('gcolor')) return;
      var g = groupById(e.target.closest('.grow').getAttribute('data-gid'));
      if (!g) return;
      g.color = e.target.value;
      reconcile(); renderSummary(); renderBlocksTab();
      $$('#tree .brow').forEach(function (r) {
        var b = blockById(r.getAttribute('data-bid'));
        if (b && b.group === g.id) $('.sw', r).style.background = g.color;
      });
    });
    tree.addEventListener('change', function (e) {
      var grow = e.target.closest('.grow');
      if (!grow) return;
      var g = groupById(grow.getAttribute('data-gid'));
      if (!g) return;
      if (e.target.classList.contains('gname')) g.name = e.target.value.trim() || g.name;
      renderAll(); pushHistory();
    });
    $('#btnAddGroup').addEventListener('click', function () { addGroup(null); });
    $('#btnShowAll').addEventListener('click', showAll);

    // top bar
    $('#projName').addEventListener('change', function (e) { S.model.name = e.target.value.trim() || 'Untitled design'; renderAll(); pushHistory(); });
    $('#btnUndo').addEventListener('click', undo);
    $('#btnRedo').addEventListener('click', redo);
    $('#btnNew').addEventListener('click', function () { setModel(C.emptyProject(), 'New project. Undo brings back the previous one.'); });
    var exSel = $('#exampleSel');
    EXAMPLES.forEach(function (ex) { var o = document.createElement('option'); o.value = ex.id; o.textContent = ex.label; exSel.appendChild(o); });
    exSel.addEventListener('change', function () {
      var ex = EXAMPLES.filter(function (x) { return x.id === exSel.value; })[0];
      exSel.value = '';
      if (ex) setModel(ex.make(), ex.label + ' loaded. Undo brings back the previous project.');
    });
    $('#btnHelp').addEventListener('click', showHelp);
    $('#btnOpen').addEventListener('click', function () { $('#fileIn').click(); });
    $('#fileIn').addEventListener('change', function (e) { openFile(e.target.files[0]); e.target.value = ''; });
    $('#btnSave').addEventListener('click', saveProject);

    // viewport tools
    $$('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
    });
    $('#snapSel').addEventListener('change', function (e) { S.snap = parseFloat(e.target.value) || 0; applySnapSettings(); });
    $('#btnXray').addEventListener('click', function (e) {
      S.xray = !S.xray;
      e.currentTarget.setAttribute('aria-pressed', S.xray ? 'true' : 'false');
      reconcile();
    });
    $$('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.getAttribute('data-view')); });
    });

    // drawer
    $$('.tab').forEach(function (b) { b.addEventListener('click', function () { setTab(b.getAttribute('data-tab')); if (!S.drawerOpen) toggleDrawer(); }); });
    $('#btnDrawer').addEventListener('click', toggleDrawer);
    $('#btnCsv').addEventListener('click', exportCsv);
    $('#csvDelim').addEventListener('change', function (e) { S.delim = e.target.value; });
    $('#btnAddReq').addEventListener('click', addRequirement);
    $('#blkTbl').addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-bid]');
      if (tr) select(tr.getAttribute('data-bid'));
    });
    var reqTbl = $('#reqTbl');
    reqTbl.addEventListener('click', function (e) {
      var act = e.target.closest('[data-act="delr"]');
      if (act) deleteRequirement(act.closest('tr').getAttribute('data-rid'));
    });
    reqTbl.addEventListener('change', function (e) {
      var tr = e.target.closest('tr[data-rid]');
      if (!tr) return;
      var r = S.model.requirements.filter(function (x) { return x.id === tr.getAttribute('data-rid'); })[0];
      if (!r) return;
      var f = e.target.getAttribute('data-f'), v = e.target.value;
      if (f === 'rname') r.name = v.trim() || r.name;
      else if (f === 'rmetric') r.metric = v;
      else if (f === 'rsense') r.sense = v === 'max' ? 'max' : 'min';
      else if (f === 'rshall') r.shall = v === '' ? null : C.num(v, null);
      else if (f === 'rshould') r.should = v === '' ? null : C.num(v, null);
      renderReqs(); renderLibrarySelects(); renderProps(); renderBlocksTab(); pushHistory();
      if (f === 'rname') { sigProps = ''; sigNew = ''; renderLibrarySelects(); renderProps(); }
    });

    // properties
    var form = $('#propsForm');
    form.addEventListener('change', function (e) {
      var b = selBlock();
      if (!b) return;
      var t = e.target, f = t.getAttribute('data-f'), i = +t.getAttribute('data-i');
      if (f === 'name') b.name = t.value.trim() || b.name;
      else if (f === 'shape') b.shape = t.value;
      else if (f === 'group') b.group = t.value;
      else if (f === 'req') b.req = t.value || null;
      else if (f === 'pos') b.position[i] = C.num(t.value, b.position[i]);
      else if (f === 'size') b.size[i] = Math.max(0.05, C.num(t.value, b.size[i]));
      else if (f === 'rot') b.rotation[i] = C.num(t.value, b.rotation[i]);
      else if (f === 'areaon') b.areaOverride = t.checked ? Math.round(C.blockPlanArea(b) * 1000) / 1000 : null;
      else if (f === 'area') b.areaOverride = Math.max(0, C.num(t.value, b.areaOverride || 0));
      reconcile(); renderAll(); pushHistory();
    });
    $('#pDup').addEventListener('click', duplicateSelected);
    $('#pDel').addEventListener('click', deleteSelected);
    $('#pHide').addEventListener('click', toggleSelectedHidden);

    // keyboard
    window.addEventListener('keydown', function (e) {
      var tg = e.target;
      if (tg && (/^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName) || tg.isContentEditable)) return;
      var k = e.key, mod = e.ctrlKey || e.metaKey;
      if (mod && k.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (mod && k.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      else if (mod && k.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); }
      else if (mod) return;
      else if (k === 'Delete' || k === 'Backspace') { if (S.sel) { e.preventDefault(); deleteSelected(); } }
      else if (k === 'Escape') select(null);
      else if (k === 'w' || k === 'W') setMode('translate');
      else if (k === 'e' || k === 'E') setMode('rotate');
      else if (k === 'r' || k === 'R') setMode('scale');
      else if (k === 'f' || k === 'F') setView('fit');
      else if (k === '1') setView('iso');
      else if (k === '2') setView('top');
      else if (k === '3') setView('side');
      else if (k === '4') setView('front');
    });

    // theme changes
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', applyTheme);
    }
    new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  function toggleDrawer() {
    S.drawerOpen = !S.drawerOpen;
    $('#drawer').classList.toggle('closed', !S.drawerOpen);
    $('#btnDrawer').setAttribute('aria-expanded', S.drawerOpen ? 'true' : 'false');
    $('#btnDrawer').innerHTML = S.drawerOpen ? '&#9662;' : '&#9652;';
    setTimeout(resize, 0);
  }

  function setMode(m) {
    S.mode = m;
    $$('[data-mode]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mode') === m); });
    if (tc.object) tc.setMode(m);
    request();
  }

  /* ---------- start ---------- */
  function start() {
    var restored = false, model = null;
    try {
      var saved = localStorage.getItem(STORE_KEY);
      if (saved) { model = C.sanitizeProject(JSON.parse(saved)).model; restored = true; }
    } catch (e) { model = null; }
    if (!model) model = C.exampleProject();
    S.model = model;
    applyTheme();
    wire();
    applySnapSettings();
    fixActive();
    reconcile();
    renderAll();
    resize();
    setView('iso');
    H.past = [snapshot()];
    updateUndo();
    if (restored) toast('Restored your last session. Use "PSV example" to start from the example.');
  }
  start();
})();
