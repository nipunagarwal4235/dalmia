import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { templates, buildFurniture, cleanParams, defaultSpots, autoFit, fits, fittingSizes, defaultSize, variantFor, unitPrice, billOfMaterials, bomCSV, liftFor, encodeDesign, decodeDesign, newDesign, toMillimetres, fromMillimetres, templateFor, syncFittings } from '../lib/playground.mjs';
const catalog = JSON.parse(readFileSync(new URL('../data/catalog.json', import.meta.url)));
const product = id => catalog.products.find(p => p.id === id);
const ids = catalog.products.map(p => p.id);

test('Every template builds parts with unique ids, positive sizes and nothing below the floor', () => {
  for (const type of Object.keys(templates)) for (const lift of [0, 100, 152.4]) {
    const parts = buildFurniture(type, {}, lift);
    assert.equal(new Set(parts.map(p => p.id)).size, parts.length, type);
    for (const p of parts) {
      assert.ok(p.size.every(n => n > 0), `${type} ${p.id} size`);
      assert.ok(p.pos[1] - p.size[1] / 2 >= -0.001, `${type} ${p.id} floor`);
    }
    assert.ok(parts.some(p => p.slot), `${type} has an attachment slot`);
  }
});

test('Parameters are clamped and snapped to their steps', () => {
  assert.deepEqual(cleanParams('wardrobe', { width: 99999, doors: 2.6, height: 'x' }), { width: 2700, height: 2100, depth: 600, doors: 3, drawers: 1 });
  assert.equal(cleanParams('kitchen', { layout: 'bogus' }).layout, 'mixed');
  assert.equal(cleanParams('kitchen', { wall: 'yes' }).wall, true);
});

test('Wardrobe doors pair their hinges and handles sit on the opening edge', () => {
  const doors = buildFurniture('wardrobe', { doors: 3, drawers: 0 }).filter(p => p.slot === 'door');
  assert.deepEqual(doors.map(d => d.hinge), ['left', 'right', 'right']);
  const [left] = defaultSpots(doors[0], 'handle'), [right] = defaultSpots(doors[1], 'handle');
  assert.ok(left.u > 0.9 && right.u < 0.1);
  assert.equal(left.spin, 90);
  const handleHeight = doors[0].pos[1] - doors[0].size[1] / 2 + left.v * doors[0].size[1];
  assert.ok(Math.abs(handleHeight - 1050) < 1, 'tall doors put the handle at 1050 mm');
});

test('Wide drawers take two knobs and one handle', () => {
  const drawer = buildFurniture('dresser', { width: 1200, columns: 1 }).find(p => p.slot === 'drawer');
  assert.equal(defaultSpots(drawer, 'knob').length, 2);
  assert.equal(defaultSpots(drawer, 'handle').length, 1);
});

test('Compatibility keeps legs off doors and handles off legs', () => {
  assert.ok(fits('Door handles', 'entry') && fits('Knobs', 'drawer') && fits('Sofa legs', 'leg') && fits('Brackets', 'bracket'));
  assert.ok(!fits('Sofa legs', 'door') && !fits('Knobs', 'entry') && !fits('Door handles', 'leg') && !fits('Unknown', 'door'));
});

test('Auto-fit fills every compatible part and replaces the same kind only', () => {
  const parts = buildFurniture('wardrobe', { doors: 2, drawers: 2 });
  let fittings = autoFit(parts, [], product('door-handles-1701'));
  assert.equal(fittings.length, 4);
  assert.ok(fittings.every(f => f.size === '12 in'));
  fittings = autoFit(parts, fittings, product('knobs-2004'), { onlySlot: 'drawer' });
  assert.equal(fittings.filter(f => f.kind === 'handle').length, 4, 'handles stay when knobs are added');
  fittings = autoFit(parts, fittings, product('door-handles-1702'), { onlySlot: 'drawer' });
  assert.equal(fittings.filter(f => f.product === 'door-handles-1702').length, 2);
  assert.equal(fittings.filter(f => f.part.startsWith('drawer') && f.kind === 'handle').length, 2, 'drawer handles replaced');
  const sofa = buildFurniture('sofa', { legs: '6' });
  assert.equal(autoFit(sofa, [], product('sofa-legs-1501')).length, 6);
  assert.equal(autoFit(sofa, [], product('door-handles-1701')).length, 0);
});

test('Sizes expand per-inch ranges and pick sensible defaults', () => {
  assert.deepEqual(fittingSizes(product('sofa-legs-1501')), ['3 in', '4 in', '6 in']);
  assert.equal(defaultSize(product('sofa-legs-1501')), '4 in');
  assert.equal(defaultSize(product('door-handles-1701')), '12 in');
  assert.deepEqual(fittingSizes(product('knobs-2004')), []);
  const profile = fittingSizes(product('profile-handles-dh-1001'));
  assert.equal(profile[0], '4 in');
  assert.equal(profile.at(-1), '30 in');
});

test('3D finish names find their price list entries', () => {
  const leg = product('sofa-legs-1501');
  assert.equal(variantFor(leg, 'D · Green').finish, 'D, E');
  assert.equal(unitPrice(leg, 'D · Green', '4 in'), 430);
  assert.equal(unitPrice(leg, 'A · Black & rose gold', '4 in'), 415);
  assert.equal(unitPrice(product('knobs-2004'), 'Gold'), 155);
  const profile = product('profile-handles-dh-1001');
  assert.equal(unitPrice(profile, 'Black', '10 in'), 390);
  assert.equal(unitPrice(profile, 'CP', '10 in'), 300);
  assert.equal(unitPrice(profile, 'Gold', '30 in'), null, 'outside the listed range');
});

test('Bill of materials groups, totals and flags missing prices', () => {
  const sofa = buildFurniture('sofa', { legs: '4' });
  const fittings = autoFit(sofa, [], product('sofa-legs-1501'), { finish: 'B · Black', size: '6 in' });
  const bom = billOfMaterials(fittings, catalog.products);
  assert.equal(bom.rows.length, 1);
  assert.equal(bom.rows[0].quantity, 4);
  assert.equal(bom.total, 4 * 495);
  assert.equal(billOfMaterials(fittings, catalog.products, 'off65').total, 4 * 173.25);
  const csv = bomCSV(bom, 'Sofa');
  assert.match(csv, /^Furniture,Category,Model/);
  assert.match(csv, /Sofa,Sofa legs,1501,B · Black,6 in,4,495,1980/);
  assert.equal(liftFor(fittings, sofa), 6 * 25.4);
  assert.equal(liftFor([], sofa), 100);
});

test('Millimetre positions convert both ways', () => {
  const door = buildFurniture('door', {}).find(p => p.slot === 'entry');
  const mm = toMillimetres(door, 0.5, 0.25);
  assert.deepEqual(fromMillimetres(door, mm.across, mm.up), { u: 0.5, v: mm.up / door.size[1] });
  assert.deepEqual(fromMillimetres(door, -50, 99999), { u: 0, v: 1 });
});

test('Share links round-trip and reject tampered content', () => {
  const design = newDesign('sofa');
  design.fittings = autoFit(buildFurniture('sofa', design.params), [], product('sofa-legs-1501'), { finish: 'C · Black & gold' });
  const back = decodeDesign(encodeDesign(design), ids);
  assert.equal(back.type, 'sofa');
  assert.equal(back.fittings.length, design.fittings.length);
  assert.equal(back.fittings[0].finish, 'C · Black & gold');
  assert.equal(decodeDesign('not base64!', ids), null);
  const evil = encodeDesign({ ...design, type: 'sofa', params: { seats: 50 }, finishes: { front: '<script>' }, fittings: [{ product: 'nope', part: 'base', kind: 'leg' }, { ...design.fittings[0], u: 9 }] });
  const cleaned = decodeDesign(evil, ids);
  assert.equal(cleaned.params.seats, 4);
  assert.equal(cleaned.finishes.front, 'White laminate');
  assert.equal(cleaned.fittings.length, 1);
  assert.equal(cleaned.fittings[0].u, 1);
});

test('Products open matching furniture', () => {
  assert.equal(templateFor('Sofa legs'), 'sofa');
  assert.equal(templateFor('Brackets'), 'foldingtable');
  assert.equal(templateFor('Knobs'), 'dresser');
});

test('Furniture changes keep fittings in sync', () => {
  const two = buildFurniture('wardrobe', { doors: 2, drawers: 0 });
  const fittings = autoFit(two, [], product('door-handles-1701'), { finish: 'B · Satin & chrome' });
  const four = buildFurniture('wardrobe', { doors: 4, drawers: 0 });
  const grown = syncFittings(four, fittings, catalog.products);
  assert.equal(grown.fittings.length, 4);
  assert.equal(grown.added, 2);
  assert.ok(grown.fittings.every(f => f.finish === 'B · Satin & chrome' && f.product === 'door-handles-1701'));
  const shrunk = syncFittings(buildFurniture('wardrobe', { doors: 1, drawers: 0 }), grown.fittings, catalog.products);
  assert.equal(shrunk.fittings.length, 1);
  assert.equal(shrunk.removed, 3);
  assert.equal(syncFittings(buildFurniture('sofa', {}), fittings, catalog.products).fittings.length, 0, 'handles do not move onto a sofa');
});
