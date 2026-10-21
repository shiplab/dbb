/* DBB core: shapes, geometry maths, project model, summaries, CSV.
   Needs a global THREE. Exposes DBBCore (browser: window.DBBCore, node: module.exports). */
(function (root) {
  'use strict';
  var T = root.THREE;
  var D2R = Math.PI / 180;
  var FORMAT = 'dbb-block-editor';
  var VERSION = 1;

  /* ---------- shape library ----------
     Every shape fits a unit bounding box centred on the origin (Z up).
     vf   = volume as a fraction of the bounding box
     plan = plan-view (footprint) area as a fraction of L x B, when the shape is not tilted */
  var SHAPES = {
    box:      { label: 'Box',           vf: 1,            plan: 1 },
    cylinder: { label: 'Cylinder',      vf: Math.PI / 4,  plan: Math.PI / 4 },
    halfcyl:  { label: 'Half cylinder', vf: Math.PI / 4,  plan: 1 },
    cone:     { label: 'Cone',          vf: Math.PI / 12, plan: Math.PI / 4 },
    pyramid:  { label: 'Pyramid',       vf: 1 / 3,        plan: 1 },
    wedge:    { label: 'Wedge',         vf: 1 / 2,        plan: 1 },
    sphere:   { label: 'Sphere',        vf: Math.PI / 6,  plan: Math.PI / 4 }
  };
  var SHAPE_ORDER = ['box', 'cylinder', 'halfcyl', 'cone', 'pyramid', 'wedge', 'sphere'];

  var METRICS = {
    volume: { label: 'Volume',               unit: 'm³' },
    area:   { label: 'Area',                 unit: 'm²' },
    length: { label: 'Overall length (X)',   unit: 'm' },
    beam:   { label: 'Overall beam (Y)',     unit: 'm' },
    height: { label: 'Overall height (Z)',   unit: 'm' }
  };

  var geomCache = {};
  var edgeCache = {};

  function makeGeometry(kind) {
    if (geomCache[kind]) return geomCache[kind];
    var g, s;
    switch (kind) {
      case 'cylinder':
        g = new T.CylinderGeometry(0.5, 0.5, 1, 48);
        g.rotateX(Math.PI / 2);
        break;
      case 'cone':
        g = new T.ConeGeometry(0.5, 1, 48);
        g.rotateX(Math.PI / 2);
        break;
      case 'pyramid':
        g = new T.ConeGeometry(Math.SQRT1_2, 1, 4);
        g.rotateY(Math.PI / 4);
        g.rotateX(Math.PI / 2);
        break;
      case 'sphere':
        g = new T.SphereGeometry(0.5, 32, 20);
        break;
      case 'halfcyl':
        s = new T.Shape();
        s.moveTo(-0.5, -0.5);
        s.lineTo(0.5, -0.5);
        s.absellipse(0, -0.5, 0.5, 1, 0, Math.PI, false, 0);
        s.closePath();
        g = new T.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 32, steps: 1 });
        g.rotateX(Math.PI / 2);
        g.translate(0, 0.5, 0);
        break;
      case 'wedge':
        s = new T.Shape();
        s.moveTo(-0.5, -0.5);
        s.lineTo(0.5, -0.5);
        s.lineTo(0.5, 0.5);
        s.closePath();
        g = new T.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, steps: 1 });
        g.rotateX(Math.PI / 2);
        g.translate(0, 0.5, 0);
        break;
      default:
        g = new T.BoxGeometry(1, 1, 1);
    }
    geomCache[kind] = g;
    return g;
  }

  function makeEdges(kind) {
    if (!edgeCache[kind]) edgeCache[kind] = new T.EdgesGeometry(makeGeometry(kind), 30);
    return edgeCache[kind];
  }

  /* ---------- block maths ---------- */
  function num(v, d) {
    v = Number(v);
    return isFinite(v) ? v : d;
  }

  function blockMatrix(b) {
    var q = new T.Quaternion().setFromEuler(new T.Euler(b.rotation[0] * D2R, b.rotation[1] * D2R, b.rotation[2] * D2R, 'XYZ'));
    return new T.Matrix4().compose(
      new T.Vector3(b.position[0], b.position[1], b.position[2]), q,
      new T.Vector3(b.size[0], b.size[1], b.size[2]));
  }

  function blockVolume(b) {
    return SHAPES[b.shape].vf * b.size[0] * b.size[1] * b.size[2];
  }

  function worldVerts(b) {
    var pa = makeGeometry(b.shape).attributes.position;
    var m = blockMatrix(b);
    var v = new T.Vector3();
    var out = new Array(pa.count * 3);
    for (var i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i).applyMatrix4(m);
      out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
    }
    return out;
  }

  function blockWorldBox(b) {
    var w = worldVerts(b);
    var min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (var i = 0; i < w.length; i += 3) {
      for (var k = 0; k < 3; k++) {
        if (w[i + k] < min[k]) min[k] = w[i + k];
        if (w[i + k] > max[k]) max[k] = w[i + k];
      }
    }
    return { min: min, max: max };
  }

  function hull2D(pts) {
    pts = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var n = pts.length;
    if (n < 3) return pts;
    function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lower = [], upper = [], i;
    for (i = 0; i < n; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop();
      lower.push(pts[i]);
    }
    for (i = n - 1; i >= 0; i--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop();
      upper.push(pts[i]);
    }
    upper.pop(); lower.pop();
    return lower.concat(upper);
  }

  function polyArea(p) {
    var s = 0;
    for (var i = 0; i < p.length; i++) {
      var j = (i + 1) % p.length;
      s += p[i][0] * p[j][1] - p[j][0] * p[i][1];
    }
    return Math.abs(s) / 2;
  }

  /* Plan-view footprint. Exact when the block is only turned about the vertical axis;
     otherwise the area of the convex hull of its projected corners (all shapes are convex). */
  function blockPlanArea(b) {
    var tilted = Math.abs(b.rotation[0]) > 1e-6 || Math.abs(b.rotation[1]) > 1e-6;
    if (!tilted) return SHAPES[b.shape].plan * b.size[0] * b.size[1];
    var w = worldVerts(b), pts = [];
    for (var i = 0; i < w.length; i += 3) pts.push([w[i], w[i + 1]]);
    return polyArea(hull2D(pts));
  }

  function blockArea(b) {
    return b.areaOverride != null ? b.areaOverride : blockPlanArea(b);
  }

  /* ---------- groups ---------- */
  function defaultGroups() {
    return [
      { id: 'g_task',   name: 'Task related systems',      color: '#9aa3b0', parent: null,     visible: true },
      { id: 'g_cargo',  name: 'Cargo spaces',              color: '#e0603c', parent: 'g_task', visible: true },
      { id: 'g_ah',     name: 'Anchor handling and towing', color: '#f2a93b', parent: 'g_task', visible: true },
      { id: 'g_oc',     name: 'Offshore construction',     color: '#8e63c9', parent: 'g_task', visible: true },
      { id: 'g_ship',   name: 'Ship systems',              color: '#9aa3b0', parent: null,     visible: true },
      { id: 'g_struct', name: 'Ship structure',            color: '#8c97a8', parent: 'g_ship', visible: true },
      { id: 'g_outfit', name: 'Ship outfitting',           color: '#2fa7b8', parent: 'g_ship', visible: true },
      { id: 'g_acc',    name: 'Accommodation',             color: '#4fae6a', parent: 'g_ship', visible: true },
      { id: 'g_mach',   name: 'Machinery',                 color: '#e9cf3a', parent: 'g_ship', visible: true },
      { id: 'g_tanks',  name: 'Tanks and voids',           color: '#3f72d6', parent: 'g_ship', visible: true }
    ];
  }

  function groupMap(model) {
    var m = {};
    model.groups.forEach(function (g) { m[g.id] = g; });
    return m;
  }

  /* Tree order: [{group, depth}] */
  function groupOrder(model) {
    var kids = {}, out = [], seen = {};
    model.groups.forEach(function (g) {
      var k = g.parent || '';
      (kids[k] = kids[k] || []).push(g);
    });
    function walk(parentKey, depth) {
      (kids[parentKey] || []).forEach(function (g) {
        if (seen[g.id]) return;
        seen[g.id] = true;
        out.push({ group: g, depth: depth });
        walk(g.id, depth + 1);
      });
    }
    walk('', 0);
    return out;
  }

  function groupPath(model, id) {
    var map = groupMap(model), names = [], guard = 0, g = map[id];
    while (g && guard++ < 50) { names.unshift(g.name); g = g.parent ? map[g.parent] : null; }
    return names.join(' / ');
  }

  function isGroupVisible(model, id) {
    var map = groupMap(model), g = map[id], guard = 0;
    while (g && guard++ < 50) {
      if (g.visible === false) return false;
      g = g.parent ? map[g.parent] : null;
    }
    return true;
  }

  function descendantIds(model, id) {
    var out = [id], i = 0;
    while (i < out.length) {
      var cur = out[i++];
      model.groups.forEach(function (g) { if (g.parent === cur && out.indexOf(g.id) < 0) out.push(g.id); });
    }
    return out;
  }

  /* ---------- summaries ---------- */
  function envelope(model) {
    if (!model.blocks.length) return null;
    var min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    model.blocks.forEach(function (b) {
      var bx = blockWorldBox(b);
      for (var k = 0; k < 3; k++) {
        if (bx.min[k] < min[k]) min[k] = bx.min[k];
        if (bx.max[k] > max[k]) max[k] = bx.max[k];
      }
    });
    return { min: min, max: max, length: max[0] - min[0], beam: max[1] - min[1], height: max[2] - min[2] };
  }

  function summarize(model) {
    var own = {}, total = { n: 0, vol: 0, area: 0 };
    model.groups.forEach(function (g) { own[g.id] = { n: 0, vol: 0, area: 0 }; });
    model.blocks.forEach(function (b) {
      var o = own[b.group];
      var v = blockVolume(b), a = blockArea(b);
      if (o) { o.n++; o.vol += v; o.area += a; }
      total.n++; total.vol += v; total.area += a;
    });
    var order = groupOrder(model);
    var rows = order.map(function (r) {
      var ids = descendantIds(model, r.group.id);
      var t = { n: 0, vol: 0, area: 0 };
      ids.forEach(function (id) { var o = own[id]; if (o) { t.n += o.n; t.vol += o.vol; t.area += o.area; } });
      return { group: r.group, depth: r.depth, own: own[r.group.id], total: t, hasKids: ids.length > 1 };
    });
    return { rows: rows, total: total, envelope: envelope(model) };
  }

  /* ---------- requirements ---------- */
  function tol(thr) { return 1e-6 * Math.max(1, Math.abs(thr)); }

  function evaluateRequirements(model, summary) {
    var env = (summary || summarize(model)).envelope;
    return model.requirements.map(function (r) {
      var achieved = 0, n = 0;
      if (r.metric === 'volume' || r.metric === 'area') {
        model.blocks.forEach(function (b) {
          if (b.req === r.id) {
            n++;
            achieved += r.metric === 'volume' ? blockVolume(b) : blockArea(b);
          }
        });
      } else {
        achieved = env ? env[r.metric] : 0;
        n = model.blocks.length;
      }
      function ok(thr) {
        if (thr == null) return null;
        return r.sense === 'max' ? achieved <= thr + tol(thr) : achieved >= thr - tol(thr);
      }
      var okShall = ok(r.shall), okShould = ok(r.should);
      var status;
      if (r.shall == null && r.should == null) status = 'none';
      else if (okShould === true) status = 'should';
      else if (okShall === true) status = 'shall';
      else status = 'fail';
      return { req: r, achieved: achieved, n: n, status: status };
    });
  }

  var STATUS_LABEL = { should: 'Meets should', shall: 'Meets shall', fail: 'Not met', none: 'No target' };

  /* ---------- project model ---------- */
  function emptyProject(name) {
    return { app: FORMAT, version: VERSION, name: name || 'Untitled design', groups: defaultGroups(), requirements: [], blocks: [] };
  }

  function mkBlock(id, name, shape, group, req, x0, x1, y0, y1, z0, z1) {
    return {
      id: id, name: name, shape: shape, group: group, req: req,
      position: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2],
      size: [x1 - x0, y1 - y0, z1 - z0],
      rotation: [0, 0, 0], areaOverride: null, hidden: false
    };
  }

  /* Very small teaching example: 5 blocks, 3 requirements. */
  function simpleExample() {
    var m = emptyProject('Simple example');
    m.requirements = [
      { id: 'r_cargo', name: 'Cargo volume',      metric: 'volume', sense: 'min', shall: 400, should: 600 },
      { id: 'r_acc',   name: 'Accommodation area', metric: 'area',  sense: 'min', shall: 70,  should: 100 },
      { id: 'r_loa',   name: 'Overall length',    metric: 'length', sense: 'max', shall: 32,  should: 30 }
    ];
    m.blocks = [
      mkBlock('b1', 'Cargo hold',      'box', 'g_cargo',  'r_cargo', 0, 18, -4, 4, 0, 3.5),
      mkBlock('b2', 'Machinery room',  'box', 'g_mach',   null,      18, 26, -4, 4, 0, 4),
      mkBlock('b3', 'Fuel oil tanks',  'box', 'g_tanks',  null,      26, 30, -4, 4, 0, 4),
      mkBlock('b4', 'Accommodation',   'box', 'g_acc',    'r_acc',   20, 30, -4, 4, 4, 7),
      mkBlock('b5', 'Wheelhouse',      'box', 'g_outfit', null,      22, 28, -3, 3, 7, 9.4)
    ];
    return m;
  }

  /* Very simplified R/V Gunnerus. Dimensions: LOA 36.25 m, B 9.6 m, depth to 1-deck 4.287 m, A-deck 6.6 m.
     Space areas and tank volumes from the GA metadata (shiplab.github.io/gunnerus); positions are approximate. */
  function gunnerusExample() {
    var m = emptyProject('Gunnerus (simplified)');
    m.groups.push({ id: 'g_res', name: 'Research and survey', color: '#c2548a', parent: 'g_task', visible: true });
    m.requirements = [
      { id: 'r_hold', name: 'Cargo hold volume',        metric: 'volume', sense: 'min', shall: 35,  should: 40 },
      { id: 'r_lab',  name: 'Labs and data room area',  metric: 'area',   sense: 'min', shall: 36,  should: 40 },
      { id: 'r_work', name: 'Aft working deck area',    metric: 'area',   sense: 'min', shall: 70,  should: 90 },
      { id: 'r_cab',  name: 'Cabin area',               metric: 'area',   sense: 'min', shall: 100, should: 120 },
      { id: 'r_fuel', name: 'Fuel oil volume',          metric: 'volume', sense: 'min', shall: 55,  should: 65 },
      { id: 'r_loa',  name: 'Overall length',           metric: 'length', sense: 'max', shall: 38,  should: 36.5 },
      { id: 'r_beam', name: 'Overall beam',             metric: 'beam',   sense: 'max', shall: 10,  should: 9.6 }
    ];
    var B = [];
    // Below 1-deck (z 1.0 to 4.287 above the tank top)
    B.push(mkBlock('b1',  'Engine room',                 'box', 'g_mach',   null,     6, 18, -4.8, 4.8, 1, 4.287));
    B.push(mkBlock('b2',  'ECR and switchboards',        'box', 'g_mach',   null,     18, 22, -4.8, 4.8, 1, 4.287));
    B.push(mkBlock('b3',  'Cabins below 1-deck',         'box', 'g_acc',    'r_cab',  22, 30.4, -4.8, 4.8, 1, 4.287));
    B.push(mkBlock('b4',  'Cargo hold',                  'box', 'g_cargo',  'r_hold', 30.4, 34, -1.6, 1.6, 1, 4.287));
    B.push(mkBlock('b5',  'Thruster room',               'box', 'g_outfit', null,     34, 36.25, -3, 3, 0, 4.287));
    // Tank top (z 0 to 1.0)
    B.push(mkBlock('b6',  'Fuel oil tank P',             'box', 'g_tanks',  'r_fuel', 6, 18, 1, 3.5, 0, 1));
    B.push(mkBlock('b7',  'Fuel oil tank S',             'box', 'g_tanks',  'r_fuel', 6, 18, -3.5, -1, 0, 1));
    B.push(mkBlock('b8',  'Fresh and technical water',   'box', 'g_tanks',  null,     18, 30.4, -2.35, 2.35, 0, 1));
    B.push(mkBlock('b9',  'Waste and sludge tanks',      'box', 'g_tanks',  null,     0, 6, -1.6, 1.6, 0, 1));
    // 1-deck (z 4.287 to 6.6)
    B.push(mkBlock('b10', 'Aft working deck',            'box', 'g_res',    'r_work', 0, 9, -4.5, 4.5, 4.287, 4.587));
    B.push(mkBlock('b11', 'Wet lab, dry lab, data room', 'box', 'g_res',    'r_lab',  9, 12.9, -4.8, 4.8, 4.287, 6.6));
    B.push(mkBlock('b12', 'Cabins 1-deck',               'box', 'g_acc',    'r_cab',  12.9, 16, -4.8, 4.8, 4.287, 6.6));
    B.push(mkBlock('b13', 'Workshop and stores',         'box', 'g_outfit', null,     16, 19, -4.8, 4.8, 4.287, 6.6));
    // A-deck (z 6.6 to 8.9) and wheelhouse
    B.push(mkBlock('b14', 'A-deck: day room and galley', 'box', 'g_acc',    null,     12.9, 19, -4.2, 4.2, 6.6, 8.9));
    B.push(mkBlock('b15', 'Wheelhouse',                  'box', 'g_outfit', null,     14, 18, -2.5, 2.5, 8.9, 11.4));
    m.blocks = B;
    return m;
  }

  /* Illustrative PSV, divided with Levander's taxonomy. x forward from the aft end, y to port, z up from baseline. */
  function exampleProject() {
    var m = emptyProject('PSV example');
    m.requirements = [
      { id: 'r_liq',   name: 'Liquid cargo volume',  metric: 'volume', sense: 'min', shall: 2000, should: 2800 },
      { id: 'r_deck',  name: 'Cargo deck area',      metric: 'area',   sense: 'min', shall: 600,  should: 800 },
      { id: 'r_dry',   name: 'Dry bulk volume',      metric: 'volume', sense: 'min', shall: 200,  should: 300 },
      { id: 'r_fuel',  name: 'Fuel oil volume',      metric: 'volume', sense: 'min', shall: 800,  should: 1200 },
      { id: 'r_cabin', name: 'Cabin area',           metric: 'area',   sense: 'min', shall: 600,  should: 700 },
      { id: 'r_loa',   name: 'Overall length',       metric: 'length', sense: 'max', shall: 90,   should: 85 },
      { id: 'r_beam',  name: 'Overall beam',         metric: 'beam',   sense: 'max', shall: 20,   should: 18 }
    ];
    var B = [];
    // Task related systems / Cargo spaces
    B.push(mkBlock('b1',  'Open cargo deck',       'box',      'g_cargo',  'r_deck', 0, 52, -7.5, 7.5, 7.5, 7.9));
    B.push(mkBlock('b2',  'Brine tanks',           'box',      'g_cargo',  'r_liq',  6, 24, -6, 6, 1.5, 7.5));
    B.push(mkBlock('b3',  'Drill water tanks',     'box',      'g_cargo',  'r_liq',  24, 42, -6, 6, 1.5, 7.5));
    B.push(mkBlock('b4',  'Dry bulk tank P',       'cylinder', 'g_cargo',  'r_dry',  42, 47, 0.8, 5.8, 1.5, 7.5));
    B.push(mkBlock('b5',  'Dry bulk tank S',       'cylinder', 'g_cargo',  'r_dry',  42, 47, -5.8, -0.8, 1.5, 7.5));
    B.push(mkBlock('b6',  'Cargo pump room',       'box',      'g_cargo',  null,     47, 51, -6, 6, 1.5, 7.5));
    // Ship systems / Machinery
    B.push(mkBlock('b7',  'Engine room',           'box',      'g_mach',   null,     51, 67, -8, 8, 1.5, 7.5));
    B.push(mkBlock('b8',  'Auxiliary machinery',   'box',      'g_mach',   null,     67, 73, -6, 6, 1.5, 7.5));
    B.push(mkBlock('b9',  'Engine casing and funnel', 'box',   'g_mach',   null,     68, 74, -3, 3, 10.3, 18.7));
    // Ship systems / Tanks and voids
    B.push(mkBlock('b10', 'Fuel oil tanks',        'box',      'g_tanks',  'r_fuel', 6, 50, -8, 8, 0, 1.5));
    B.push(mkBlock('b11', 'Ballast tanks',         'box',      'g_tanks',  null,     51, 73, -8, 8, 0, 1.5));
    B.push(mkBlock('b12', 'Forepeak tank',         'box',      'g_tanks',  null,     79, 85, -4, 4, 0, 3.5));
    // Ship systems / Ship outfitting
    B.push(mkBlock('b13', 'Steering gear room',    'box',      'g_outfit', null,     0, 6, -6, 6, 1.5, 7.5));
    B.push(mkBlock('b14', 'Bow thruster room',     'box',      'g_outfit', null,     73, 79, -5, 5, 1.5, 5.5));
    B.push(mkBlock('b15', 'Chain locker P',        'cylinder', 'g_outfit', null,     79.25, 82.75, 0.45, 3.95, 3.5, 8.0));
    B.push(mkBlock('b16', 'Chain locker S',        'cylinder', 'g_outfit', null,     79.25, 82.75, -3.95, -0.45, 3.5, 8.0));
    B.push(mkBlock('b17', 'Wheelhouse',            'box',      'g_outfit', null,     50, 60, -8.5, 8.5, 15.9, 18.7));
    // Ship systems / Accommodation
    B.push(mkBlock('b18', 'Cabins A-deck',         'box',      'g_acc',    'r_cabin', 52, 74, -8, 8, 7.5, 10.3));
    B.push(mkBlock('b19', 'Cabins B-deck',         'box',      'g_acc',    'r_cabin', 52, 66, -7.5, 7.5, 10.3, 13.1));
    B.push(mkBlock('b20', 'Mess and galley',       'box',      'g_acc',    null,     52, 62, -7, 7, 13.1, 15.9));
    m.blocks = B;
    return m;
  }

  function isHex(c) { return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c); }

  function sanitizeProject(raw) {
    var warnings = [];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('This file is not a DBB project (expected a JSON object).');
    if (raw.app && raw.app !== FORMAT) throw new Error('This file was not made by the DBB Block Editor.');
    if (!Array.isArray(raw.blocks) && !Array.isArray(raw.groups)) throw new Error('No groups or blocks found in this file.');
    if (raw.version && raw.version > VERSION) warnings.push('File version ' + raw.version + ' is newer than this editor. Some data may be ignored.');

    var model = { app: FORMAT, version: VERSION, name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Untitled design', groups: [], requirements: [], blocks: [] };

    // groups
    var seen = {};
    (Array.isArray(raw.groups) ? raw.groups : []).forEach(function (g, i) {
      if (!g || typeof g !== 'object') return;
      var id = typeof g.id === 'string' && g.id && !seen[g.id] ? g.id : uid('g', seen);
      seen[id] = true;
      model.groups.push({
        id: id,
        name: typeof g.name === 'string' && g.name.trim() ? g.name : 'Group ' + (i + 1),
        color: isHex(g.color) ? g.color : '#8c97a8',
        parent: typeof g.parent === 'string' ? g.parent : null,
        visible: g.visible !== false
      });
    });
    if (!model.groups.length) { model.groups = defaultGroups(); warnings.push('No groups in file. Levander groups were added.'); }
    var gm = groupMap(model);
    model.groups.forEach(function (g) {
      if (g.parent && (!gm[g.parent] || g.parent === g.id)) g.parent = null;
    });
    model.groups.forEach(function (g) {          // break cycles
      var cur = g, guard = 0;
      while (cur && cur.parent && guard++ < model.groups.length + 2) cur = gm[cur.parent];
      if (guard > model.groups.length) g.parent = null;
    });

    // requirements
    var rseen = {};
    (Array.isArray(raw.requirements) ? raw.requirements : []).forEach(function (r, i) {
      if (!r || typeof r !== 'object') return;
      var id = typeof r.id === 'string' && r.id && !rseen[r.id] ? r.id : uid('r', rseen);
      rseen[id] = true;
      var shall = r.shall === null || r.shall === '' || r.shall === undefined ? null : num(r.shall, null);
      var should = r.should === null || r.should === '' || r.should === undefined ? null : num(r.should, null);
      model.requirements.push({
        id: id,
        name: typeof r.name === 'string' && r.name.trim() ? r.name : 'Requirement ' + (i + 1),
        metric: METRICS[r.metric] ? r.metric : 'volume',
        sense: r.sense === 'max' ? 'max' : 'min',
        shall: shall, should: should
      });
    });

    // blocks
    var bseen = {}, fallbackGroup = leafFallback(model), dropped = 0;
    (Array.isArray(raw.blocks) ? raw.blocks : []).forEach(function (b, i) {
      if (!b || typeof b !== 'object') { dropped++; return; }
      var id = typeof b.id === 'string' && b.id && !bseen[b.id] ? b.id : uid('b', bseen);
      bseen[id] = true;
      var shape = SHAPES[b.shape] ? b.shape : 'box';
      if (b.shape && shape !== b.shape) warnings.push('Block "' + (b.name || id) + '" has an unknown shape and became a box.');
      var group = gm[b.group] ? b.group : fallbackGroup;
      if (b.group && group !== b.group) warnings.push('Block "' + (b.name || id) + '" had no valid group and was moved to ' + gm[group].name + '.');
      var pos = vec3(b.position, 0), size = vec3(b.size, 1), rot = vec3(b.rotation, 0);
      size = size.map(function (s) { return Math.max(0.01, Math.abs(s)); });
      model.blocks.push({
        id: id,
        name: typeof b.name === 'string' && b.name.trim() ? b.name : 'Block ' + (i + 1),
        shape: shape, group: group,
        req: typeof b.req === 'string' && rseen[b.req] ? b.req : null,
        position: pos, size: size, rotation: rot,
        areaOverride: b.areaOverride === null || b.areaOverride === undefined ? null : Math.max(0, num(b.areaOverride, 0)),
        hidden: b.hidden === true
      });
    });
    if (dropped) warnings.push(dropped + ' unreadable block entries were skipped.');
    return { model: model, warnings: warnings };
  }

  function vec3(a, d) {
    var out = [d, d, d];
    if (Array.isArray(a)) for (var i = 0; i < 3; i++) out[i] = num(a[i], d);
    return out;
  }

  function leafFallback(model) {
    var ord = groupOrder(model);
    for (var i = 0; i < ord.length; i++) {
      var id = ord[i].group.id;
      if (!model.groups.some(function (g) { return g.parent === id; })) return id;
    }
    return model.groups[0].id;
  }

  function uid(prefix, taken) {
    var n = 1;
    while (taken[prefix + n]) n++;
    return prefix + n;
  }

  function r4(v) { return Math.round(v * 1e4) / 1e4; }

  function serializeProject(model) {
    var out = {
      app: FORMAT,
      version: VERSION,
      name: model.name,
      units: 'm',
      axes: 'x forward from the aft end, y to port from the centreline, z up from the baseline; positions are block centres; rotation is Euler XYZ in degrees',
      taxonomy: 'Levander system based design (editable)',
      shapes: SHAPE_ORDER.map(function (k) { return { id: k, label: SHAPES[k].label, volumeFactor: r4(SHAPES[k].vf), planFactor: r4(SHAPES[k].plan) }; }),
      groups: model.groups.map(function (g) { return { id: g.id, name: g.name, color: g.color, parent: g.parent, visible: g.visible !== false }; }),
      requirements: model.requirements.map(function (r) { return { id: r.id, name: r.name, metric: r.metric, sense: r.sense, shall: r.shall, should: r.should }; }),
      blocks: model.blocks.map(function (b) {
        return {
          id: b.id, name: b.name, shape: b.shape, group: b.group, req: b.req,
          position: b.position.map(r4), size: b.size.map(r4), rotation: b.rotation.map(r4),
          areaOverride: b.areaOverride == null ? null : r4(b.areaOverride), hidden: !!b.hidden,
          computed: { volume: r4(blockVolume(b)), area: r4(blockArea(b)) }
        };
      })
    };
    var text = JSON.stringify(out, null, 2);
    return text.replace(/\[([^\[\]{}"]*?)\]/g, function (m, inner) {
      return '[' + inner.replace(/\s*\n\s*/g, ' ').trim() + ']';
    });
  }

  /* ---------- CSV ---------- */
  function csvCell(v, delim) {
    if (v === null || v === undefined) return '';
    var s = String(v);
    if (s.indexOf(delim) >= 0 || /["\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function toCSV(rows, delim) {
    return rows.map(function (r) { return r.map(function (c) { return csvCell(c, delim); }).join(delim); }).join('\r\n') + '\r\n';
  }

  function summaryCSV(model, delim) {
    var s = summarize(model);
    var rows = [['System', 'Level', 'Blocks', 'Area (m2)', 'Volume (m3)', 'Volume share (%)']];
    s.rows.forEach(function (r) {
      rows.push([r.group.name, r.depth + 1, r.total.n, r4(r.total.area), r4(r.total.vol), s.total.vol > 0 ? r4(100 * r.total.vol / s.total.vol) : 0]);
    });
    rows.push(['Gross total', '', s.total.n, r4(s.total.area), r4(s.total.vol), s.total.vol > 0 ? 100 : 0]);
    rows.push([]);
    rows.push(['Overall dimensions', '', '', '', '', '']);
    var e = s.envelope;
    rows.push(['Length (X)', 'm', '', '', e ? r4(e.length) : 0, '']);
    rows.push(['Beam (Y)', 'm', '', '', e ? r4(e.beam) : 0, '']);
    rows.push(['Height (Z)', 'm', '', '', e ? r4(e.height) : 0, '']);
    return toCSV(rows, delim);
  }

  function requirementsCSV(model, delim) {
    var rows = [['Requirement', 'Metric', 'Unit', 'Sense', 'Shall', 'Should', 'Achieved', 'Linked blocks', 'Status']];
    evaluateRequirements(model).forEach(function (e) {
      var r = e.req;
      rows.push([r.name, METRICS[r.metric].label, METRICS[r.metric].unit, r.sense === 'max' ? 'at most' : 'at least',
        r.shall == null ? '' : r.shall, r.should == null ? '' : r.should, r4(e.achieved), e.n, STATUS_LABEL[e.status]]);
    });
    return toCSV(rows, delim);
  }

  function blocksCSV(model, delim) {
    var rmap = {};
    model.requirements.forEach(function (r) { rmap[r.id] = r.name; });
    var rows = [['Id', 'Name', 'Group path', 'Group', 'Requirement', 'Shape', 'X (m)', 'Y (m)', 'Z (m)', 'Length (m)', 'Beam (m)', 'Height (m)', 'Rot X (deg)', 'Rot Y (deg)', 'Rot Z (deg)', 'Volume (m3)', 'Area (m2)', 'Area overridden']];
    var gm = groupMap(model);
    model.blocks.forEach(function (b) {
      rows.push([b.id, b.name, groupPath(model, b.group), gm[b.group] ? gm[b.group].name : '', b.req ? rmap[b.req] : '', SHAPES[b.shape].label,
        r4(b.position[0]), r4(b.position[1]), r4(b.position[2]), r4(b.size[0]), r4(b.size[1]), r4(b.size[2]),
        r4(b.rotation[0]), r4(b.rotation[1]), r4(b.rotation[2]), r4(blockVolume(b)), r4(blockArea(b)), b.areaOverride != null ? 'yes' : 'no']);
    });
    return toCSV(rows, delim);
  }

  var api = {
    FORMAT: FORMAT, VERSION: VERSION, SHAPES: SHAPES, SHAPE_ORDER: SHAPE_ORDER, METRICS: METRICS, STATUS_LABEL: STATUS_LABEL,
    makeGeometry: makeGeometry, makeEdges: makeEdges,
    blockMatrix: blockMatrix, blockVolume: blockVolume, blockPlanArea: blockPlanArea, blockArea: blockArea,
    blockWorldBox: blockWorldBox, envelope: envelope,
    defaultGroups: defaultGroups, groupMap: groupMap, groupOrder: groupOrder, groupPath: groupPath,
    isGroupVisible: isGroupVisible, descendantIds: descendantIds,
    summarize: summarize, evaluateRequirements: evaluateRequirements,
    emptyProject: emptyProject, exampleProject: exampleProject, simpleExample: simpleExample, gunnerusExample: gunnerusExample,
    sanitizeProject: sanitizeProject, serializeProject: serializeProject,
    summaryCSV: summaryCSV, requirementsCSV: requirementsCSV, blocksCSV: blocksCSV,
    uid: uid, num: num
  };

  root.DBBCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
