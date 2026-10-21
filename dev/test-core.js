const THREE = require('three');           // r147 CJS
globalThis.THREE = THREE;
const C = require('../src/core.js');

let fails = 0;
function ok(cond, msg) { if (!cond) { fails++; console.log('FAIL', msg); } else console.log('ok  ', msg); }
function near(a, b, t, msg) { ok(Math.abs(a - b) <= (t || 1e-6) * Math.max(1, Math.abs(b)), msg + ' (' + a + ' vs ' + b + ')'); }

// 1. Shape factors vs mesh integration, and unit bounding boxes
for (const k of C.SHAPE_ORDER) {
  const g = C.makeGeometry(k);
  const pa = g.attributes.position, idx = g.index;
  const v = (i) => new THREE.Vector3().fromBufferAttribute(pa, i);
  let vol = 0;
  const tri = (a, b, c) => { vol += a.dot(b.clone().cross(c)) / 6; };
  if (idx) for (let i = 0; i < idx.count; i += 3) tri(v(idx.getX(i)), v(idx.getX(i + 1)), v(idx.getX(i + 2)));
  else for (let i = 0; i < pa.count; i += 3) tri(v(i), v(i + 1), v(i + 2));
  vol = Math.abs(vol);
  g.computeBoundingBox();
  const bb = g.boundingBox;
  const tolv = (k === 'sphere' ? 0.02 : (k === 'cylinder' || k === 'cone' || k === 'halfcyl') ? 0.005 : 1e-6);
  near(vol, C.SHAPES[k].vf, tolv, k + ' mesh volume matches vf');
  const dims = bb.max.clone().sub(bb.min);
  ok(Math.abs(dims.x - 1) < 1e-6 && Math.abs(dims.y - 1) < 1e-6 && Math.abs(dims.z - 1) < 1e-6, k + ' unit bbox ' + dims.toArray().map(n => n.toFixed(3)));
  ok(Math.abs(bb.min.x + bb.max.x) < 1e-6 && Math.abs(bb.min.y + bb.max.y) < 1e-6 && Math.abs(bb.min.z + bb.max.z) < 1e-6, k + ' centred');
}

// 2. Plan factor vs hull of vertices (unrotated)
for (const k of C.SHAPE_ORDER) {
  const b = { shape: k, position: [0, 0, 0], size: [4, 2, 3], rotation: [0, 0, 0], areaOverride: null };
  const analytic = C.blockPlanArea(b);
  b.rotation = [1e-3, 0, 0];   // force hull path (tiny tilt)
  const hull = C.blockPlanArea(b);
  near(hull, analytic, k === 'sphere' ? 0.02 : 0.01, k + ' hull footprint ~ analytic');
}

// 3. Tilted box: 90 deg about X -> footprint becomes L x H
{
  const b = { shape: 'box', position: [0, 0, 0], size: [4, 2, 3], rotation: [90, 0, 0], areaOverride: null };
  near(C.blockPlanArea(b), 12, 1e-6, 'box rotated 90 about X: footprint 4 x 3');
  const bx = C.blockWorldBox(b);
  near(bx.max[2] - bx.min[2], 2, 1e-6, 'box rotated 90 about X: height 2');
  b.rotation = [0, 0, 90];
  near(C.blockPlanArea(b), 8, 1e-6, 'yaw 90: footprint unchanged');
  const bz = C.blockWorldBox(b);
  near(bz.max[0] - bz.min[0], 2, 1e-6, 'yaw 90: X extent 2');
}

// 4. Example project summary
const ex = C.exampleProject();
const clean = C.sanitizeProject(JSON.parse(JSON.stringify(ex)));
ok(clean.warnings.length === 0, 'example sanitizes without warnings');
const sum = C.summarize(ex);
const env = sum.envelope;
console.log('envelope', env.length, env.beam, env.height, 'total vol', sum.total.vol.toFixed(1), 'area', sum.total.area.toFixed(1), 'blocks', sum.total.n);
near(env.length, 85, 1e-9, 'PSV length 85');
near(env.beam, 17, 1e-9, 'PSV beam 17');
near(env.height, 18.7, 1e-9, 'PSV height 18.7');
// parent totals equal sum of children
const task = sum.rows.find(r => r.group.id === 'g_task'), ship = sum.rows.find(r => r.group.id === 'g_ship');
near(task.total.vol + ship.total.vol, sum.total.vol, 1e-9, 'top-level rollups add to total');
const ev = C.evaluateRequirements(ex, sum);
ev.forEach(e => console.log('  req', e.req.name.padEnd(22), e.achieved.toFixed(2).padStart(10), e.status, 'n=' + e.n));
const byId = Object.fromEntries(ev.map(e => [e.req.id, e]));
near(byId.r_liq.achieved, 2592, 1e-9, 'liquid cargo 2592');
ok(byId.r_liq.status === 'shall', 'liquid cargo meets shall only');
near(byId.r_deck.achieved, 780, 1e-9, 'deck area 780');
near(byId.r_dry.achieved, 2 * Math.PI / 4 * 25 * 6, 1e-9, 'dry bulk 2 cylinders');
near(byId.r_cabin.achieved, 352 + 210, 1e-9, 'cabin area 562');
ok(byId.r_cabin.status === 'fail', 'cabin area fails shall (teaching case)');
ok(byId.r_loa.status === 'should', 'LOA <= should');
ok(byId.r_beam.status === 'should', 'beam <= should');

// 5. Round trip
const text = C.serializeProject(ex);
const back = C.sanitizeProject(JSON.parse(text));
ok(back.warnings.length === 0, 'round trip has no warnings');
near(C.summarize(back.model).total.vol, sum.total.vol, 1e-6, 'round trip keeps volume');
ok(/"position": \[[-\d., ]+\]/.test(text), 'arrays are compact in JSON');
console.log(text.split('\n').slice(0, 24).join('\n'));

// 6. Sanitizer robustness
try { C.sanitizeProject('nope'); ok(false, 'rejects string'); } catch (e) { ok(true, 'rejects string: ' + e.message); }
try { C.sanitizeProject({ app: 'other', blocks: [] }); ok(false, 'rejects foreign app'); } catch (e) { ok(true, 'rejects foreign app'); }
const messy = C.sanitizeProject({ blocks: [{ shape: 'torus', group: 'nope', size: [0, -2, 'x'], position: [1, 2] }, null, { name: 'ok', size: [1, 1, 1] }],
  groups: [{ id: 'a', parent: 'b' }, { id: 'b', parent: 'a' }], requirements: [{ metric: 'weird', shall: '12' }] });
console.log('messy warnings:', messy.warnings);
ok(messy.model.blocks.length === 2, 'messy: null block dropped');
ok(messy.model.blocks[0].shape === 'box', 'messy: unknown shape -> box');
ok(messy.model.blocks[0].size.every(s => s >= 0.01), 'messy: sizes clamped');
ok(messy.model.groups.every(g => g.parent === null || messy.model.groups.some(h => h.id === g.parent)), 'messy: parents valid');
ok(!messy.model.groups.every(g => g.parent !== null), 'messy: cycle broken (at least one root)');
ok(messy.model.requirements[0].metric === 'volume' && messy.model.requirements[0].shall === 12, 'messy: requirement cleaned');

// 7. Status semantics
const m = C.emptyProject();
m.requirements = [{ id: 'r', name: 'x', metric: 'volume', sense: 'min', shall: 100, should: 200 }];
m.blocks = [{ id: 'b', name: 'b', shape: 'box', group: 'g_cargo', req: 'r', position: [0, 0, 0], size: [10, 10, 1.5], rotation: [0, 0, 0], areaOverride: null, hidden: false }];
ok(C.evaluateRequirements(m)[0].status === 'shall', '150 between shall and should');
m.blocks[0].size[2] = 0.5; ok(C.evaluateRequirements(m)[0].status === 'fail', '50 below shall');
m.blocks[0].size[2] = 2; ok(C.evaluateRequirements(m)[0].status === 'should', '200 meets should (boundary)');
m.requirements[0].shall = null; m.requirements[0].should = null; ok(C.evaluateRequirements(m)[0].status === 'none', 'no targets');

// 8. CSV
const csv = C.summaryCSV(ex, ',');
console.log(csv.split('\r\n').slice(0, 6).join('\n'));
ok(csv.includes('Gross total'), 'summary csv has total');
ok(C.blocksCSV(ex, ';').split('\r\n').length === ex.blocks.length + 2, 'blocks csv row count');
ok(C.requirementsCSV(ex, ',').includes('Not met'), 'requirements csv has status');

console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED');
process.exit(fails ? 1 : 0);
