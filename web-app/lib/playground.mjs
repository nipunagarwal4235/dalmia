// Fitting playground logic. Sizes are millimetres, the floor is y=0 and the furniture front faces +z.
// The 3D scene and the page share these rules, so tests cover them without a browser.
import { calculatedPrices, priceFields } from './pricing.mjs';

/** Fitting kinds by catalog category. `slots` are the furniture parts each kind can attach to. */
export const fittingKinds = {
  'Door handles': { kind: 'handle', slots: ['door', 'drawer', 'entry'] },
  'Concealed handles': { kind: 'handle', slots: ['door', 'drawer'] },
  'Profile handles': { kind: 'handle', slots: ['door', 'drawer'] },
  Knobs: { kind: 'knob', slots: ['door', 'drawer'] },
  'Sofa legs': { kind: 'leg', slots: ['leg'] },
  Brackets: { kind: 'bracket', slots: ['bracket'] },
};
export const slotLabels = { door: 'doors', drawer: 'drawers', entry: 'entrance door', leg: 'legs', bracket: 'table brackets' };
export const slotSingular = { door: 'door', drawer: 'drawer', entry: 'entrance door', leg: 'leg position under the piece', bracket: 'spot under the table top' };
export const kindOf = category => fittingKinds[category]?.kind ?? null;
export const fits = (category, slot) => !!fittingKinds[category]?.slots.includes(slot);

export const finishes = {
  front: ['White laminate', 'Natural oak', 'Walnut', 'Teak', 'Graphite', 'Sage green', 'Navy', 'Ivory lacquer'],
  body: ['Natural oak', 'White laminate', 'Walnut', 'Teak', 'Graphite', 'Ivory lacquer'],
  soft: ['Linen beige', 'Charcoal', 'Teal velvet', 'Terracotta', 'Marble white', 'Granite black'],
};
export const floors = ['Light oak planks', 'Grey tile', 'Dark walnut planks', 'Concrete'];

const BOARD = 18, GAP = 3, FRONT = 20;
const range = n => Array.from({ length: n }, (_, i) => i);
const box = (id, label, x, y, z, w, h, d, mat, extra = {}) => ({ id, label, pos: [x, y, z], size: [w, h, d], mat, ...extra });

/** Front panels split evenly across a width, with hinges on the outer edges of each pair. */
function doorRow(prefix, label, x0, width, y, height, z, count, extra = {}) {
  const w = (width - GAP * (count + 1)) / count;
  return range(count).map(i => box(`${prefix}-${i + 1}`, `${label} ${i + 1}`, x0 + GAP + w / 2 + i * (w + GAP), y + height / 2, z, w, height - GAP * 2, FRONT,
    'front', { slot: 'door', hinge: i % 2 === 0 && !(count % 2 === 1 && i === count - 1) ? 'left' : 'right', ...extra }));
}
function drawerStack(prefix, label, x, width, y0, height, z, rows, depth) {
  const h = (height - GAP * (rows + 1)) / rows;
  return range(rows).map(i => box(`${prefix}-${i + 1}`, `${label} ${rows - i}`, x, y0 + GAP + h / 2 + i * (h + GAP), z, width - GAP * 2, h, FRONT,
    'front', { slot: 'drawer', travel: Math.min(depth * 0.7, 450) }));
}
const legBase = (id, label, x, y, z, w, h, d, mat, spots) => box(id, label, x, y, z, w, h, d, mat, { slot: 'leg', spots });
const cornerSpots = (w, d, count, inset = 60) => {
  const u = [inset / w, 1 - inset / w], v = [inset / d, 1 - inset / d];
  const spots = [[u[0], v[0]], [u[1], v[0]], [u[0], v[1]], [u[1], v[1]]];
  return count >= 6 ? [...spots, [0.5, v[0]], [0.5, v[1]]] : spots;
};

/**
 * Furniture templates. `build(params, lift)` returns parts; `lift` is the leg height for pieces that stand on legs.
 * Part slots: door/drawer/entry use the front face, leg/bracket use the bottom face.
 */
export const templates = {
  wardrobe: {
    label: 'Wardrobe', description: 'Hinged doors with optional drawers below', defaultFitting: 'Door handles',
    params: [
      { key: 'width', label: 'Width', min: 900, max: 2700, step: 50, default: 1800, unit: 'mm' },
      { key: 'height', label: 'Height', min: 1800, max: 2400, step: 50, default: 2100, unit: 'mm' },
      { key: 'depth', label: 'Depth', min: 500, max: 650, step: 10, default: 600, unit: 'mm' },
      { key: 'doors', label: 'Doors', min: 1, max: 5, step: 1, default: 3 },
      { key: 'drawers', label: 'Drawers below', min: 0, max: 3, step: 1, default: 1 },
    ],
    build({ width: W, height: H, depth: D, doors, drawers }) {
      const plinth = 80, z = D / 2 - FRONT / 2, drawerH = drawers * 220;
      return [
        box('body', 'Carcass', 0, H / 2, -FRONT / 2, W, H, D - FRONT, 'body'),
        box('plinth', 'Plinth', 0, plinth / 2, z - 20, W - 40, plinth, FRONT, 'body'),
        ...(drawers ? drawerStack('drawer', 'Drawer', 0, W, plinth, drawerH, z, drawers, D) : []),
        ...doorRow('door', 'Door', -W / 2, W, plinth + drawerH, H - plinth - drawerH, z, doors),
      ];
    },
  },
  kitchen: {
    label: 'Kitchen run', description: 'Base cabinets with worktop and wall units', defaultFitting: 'Profile handles', finishes: { soft: 'Marble white' },
    params: [
      { key: 'width', label: 'Width', min: 1200, max: 3600, step: 50, default: 2400, unit: 'mm' },
      { key: 'columns', label: 'Cabinets', min: 2, max: 6, step: 1, default: 4 },
      { key: 'layout', label: 'Base layout', options: [['mixed', 'Doors and drawers'], ['doors', 'All doors'], ['drawers', 'All drawers']], default: 'mixed' },
      { key: 'wall', label: 'Wall cabinets', type: 'toggle', default: true },
    ],
    build({ width: W, columns, layout, wall }) {
      const D = 580, plinth = 100, base = 820, top = 40, z = D / 2 - FRONT / 2, cw = W / columns, parts = [
        box('body', 'Base carcass', 0, plinth + (base - plinth) / 2, -FRONT / 2, W, base - plinth, D - FRONT, 'body'),
        box('plinth', 'Plinth', 0, plinth / 2, z - 40, W, plinth, FRONT, 'body'),
        box('worktop', 'Worktop', 0, base + top / 2, 10, W + 20, top, D + 20, 'soft'),
      ];
      range(columns).forEach(i => {
        const x0 = -W / 2 + i * cw, drawers = layout === 'drawers' || (layout === 'mixed' && i % 2 === 1);
        if (drawers) parts.push(...drawerStack(`drawer-${i + 1}`, `Cabinet ${i + 1} drawer`, x0 + cw / 2, cw, plinth, base - plinth, z, 3, D));
        else parts.push(...doorRow(`door-${i + 1}`, `Cabinet ${i + 1} door`, x0, cw, plinth, base - plinth, z, cw > 700 ? 2 : 1));
      });
      if (wall) {
        const y0 = 1450, h = 700, wd = 350;
        parts.push(box('wall-body', 'Wall carcass', 0, y0 + h / 2, -D / 2 + wd / 2 - FRONT / 2, W, h, wd - FRONT, 'body'));
        range(columns).forEach(i => parts.push(...doorRow(`wall-${i + 1}`, `Wall unit ${i + 1} door`, -W / 2 + i * cw, cw, y0, h, -D / 2 + wd - FRONT / 2, 1)));
      }
      return parts;
    },
  },
  dresser: {
    label: 'Chest of drawers', description: 'Drawer rows in one or two columns', defaultFitting: 'Knobs',
    params: [
      { key: 'width', label: 'Width', min: 500, max: 1800, step: 50, default: 1000, unit: 'mm' },
      { key: 'height', label: 'Height', min: 600, max: 1400, step: 50, default: 900, unit: 'mm' },
      { key: 'rows', label: 'Drawer rows', min: 2, max: 7, step: 1, default: 4 },
      { key: 'columns', label: 'Columns', min: 1, max: 2, step: 1, default: 1 },
    ],
    build({ width: W, height: H, rows, columns }, lift) {
      const D = 480, z = D / 2 - FRONT / 2, cw = W / columns, top = 25;
      return [
        legBase('body', 'Carcass', 0, lift + (H - lift) / 2, -FRONT / 2, W, H - lift, D - FRONT, 'body', cornerSpots(W, D - FRONT, 4, 40)),
        box('top', 'Top', 0, H + top / 2, 0, W + 10, top, D + 10, 'body'),
        ...range(columns).flatMap(i => drawerStack(columns > 1 ? `drawer-${i ? 'right' : 'left'}` : 'drawer', columns > 1 ? `${i ? 'Right' : 'Left'} drawer` : 'Drawer', -W / 2 + cw * i + cw / 2, cw, lift, H - lift, z, rows, D)),
      ];
    },
  },
  bedside: {
    label: 'Bedside table', description: 'Two drawers raised on legs', defaultFitting: 'Knobs',
    params: [
      { key: 'width', label: 'Width', min: 400, max: 700, step: 10, default: 500, unit: 'mm' },
      { key: 'height', label: 'Body height', min: 350, max: 600, step: 10, default: 420, unit: 'mm' },
      { key: 'drawers', label: 'Drawers', min: 1, max: 3, step: 1, default: 2 },
    ],
    build({ width: W, height: H, drawers }, lift) {
      const D = 400, z = D / 2 - FRONT / 2;
      return [
        legBase('body', 'Carcass', 0, lift + H / 2, -FRONT / 2, W, H, D - FRONT, 'body', cornerSpots(W, D - FRONT, 4, 35)),
        ...drawerStack('drawer', 'Drawer', 0, W, lift, H, z, drawers, D),
      ];
    },
  },
  tvunit: {
    label: 'TV unit', description: 'Low console with drawers or flap doors on legs', defaultFitting: 'Concealed handles',
    params: [
      { key: 'width', label: 'Width', min: 1200, max: 2400, step: 50, default: 1800, unit: 'mm' },
      { key: 'columns', label: 'Sections', min: 2, max: 5, step: 1, default: 3 },
      { key: 'fronts', label: 'Fronts', options: [['flaps', 'Flap doors'], ['drawers', 'Drawers'], ['mixed', 'Flaps and drawers']], default: 'mixed' },
    ],
    build({ width: W, columns, fronts }, lift) {
      const H = 420, D = 420, z = D / 2 - FRONT / 2, cw = W / columns, parts = [
        legBase('body', 'Carcass', 0, lift + H / 2, -FRONT / 2, W, H, D - FRONT, 'body', cornerSpots(W, D - FRONT, W > 1600 ? 6 : 4, 50)),
      ];
      range(columns).forEach(i => {
        const x = -W / 2 + cw * i + cw / 2, drawer = fronts === 'drawers' || (fronts === 'mixed' && i % 2 === 1);
        parts.push(drawer ? drawerStack(`drawer-${i + 1}`, `Section ${i + 1} drawer`, x, cw, lift, H, z, 2, D) : [box(`flap-${i + 1}`, `Flap ${i + 1}`, x, lift + H / 2, z, cw - GAP * 2, H - GAP * 2, FRONT, 'front', { slot: 'door', hinge: 'bottom' })]);
      });
      return parts.flat();
    },
  },
  sofa: {
    label: 'Sofa', description: 'Seats on a raised base for sofa legs', defaultFitting: 'Sofa legs',
    params: [
      { key: 'seats', label: 'Seats', min: 1, max: 4, step: 1, default: 3 },
      { key: 'depth', label: 'Depth', min: 800, max: 1000, step: 10, default: 880, unit: 'mm' },
      { key: 'legs', label: 'Legs', options: [['4', 'Four'], ['6', 'Six']], default: '6' },
    ],
    build({ seats, depth: D, legs }, lift) {
      const seatW = 640, arm = 160, W = seats * seatW + arm * 2, baseH = 200, cushion = 160, back = 420;
      return [
        legBase('base', 'Sofa base', 0, lift + baseH / 2, 0, W, baseH, D, 'soft', cornerSpots(W, D, Number(legs), 70)),
        box('back', 'Back', 0, lift + baseH + back / 2, -D / 2 + 100, W - arm * 2, back, 200, 'soft'),
        box('arm-left', 'Left arm', -W / 2 + arm / 2, lift + baseH + 140, 0, arm, 280, D, 'soft'),
        box('arm-right', 'Right arm', W / 2 - arm / 2, lift + baseH + 140, 0, arm, 280, D, 'soft'),
        ...range(seats).map(i => box(`seat-${i + 1}`, `Seat ${i + 1}`, -W / 2 + arm + seatW * i + seatW / 2, lift + baseH + cushion / 2, 100, seatW - 10, cushion, D - 200, 'soft')),
        ...range(seats).map(i => box(`pillow-${i + 1}`, `Back cushion ${i + 1}`, -W / 2 + arm + seatW * i + seatW / 2, lift + baseH + cushion + 190, -D / 2 + 260, seatW - 30, 380, 140, 'soft')),
      ];
    },
  },
  bed: {
    label: 'Bed', description: 'Platform bed with headboard on legs', defaultFitting: 'Sofa legs',
    params: [
      { key: 'width', label: 'Mattress width', options: [['1000', 'Single'], ['1500', 'Queen'], ['1800', 'King']], default: '1500' },
      { key: 'legs', label: 'Legs', options: [['4', 'Four'], ['6', 'Six']], default: '6' },
    ],
    build({ width, legs }, lift) {
      const W = Number(width) + 60, L = 2060, frame = 240;
      return [
        legBase('frame', 'Bed frame', 0, lift + frame / 2, 0, W, frame, L, 'body', cornerSpots(W, L, Number(legs), 60)),
        box('mattress', 'Mattress', 0, lift + frame + 110, 10, W - 60, 220, L - 80, 'soft'),
        box('headboard', 'Headboard', 0, (lift + frame + 820) / 2, -L / 2 - 30, W + 40, lift + frame + 820, 60, 'body'),
      ];
    },
  },
  ottoman: {
    label: 'Ottoman', description: 'Upholstered footstool on four legs', defaultFitting: 'Sofa legs',
    params: [
      { key: 'width', label: 'Width', min: 400, max: 1200, step: 10, default: 800, unit: 'mm' },
      { key: 'depth', label: 'Depth', min: 400, max: 900, step: 10, default: 500, unit: 'mm' },
    ],
    build({ width: W, depth: D }, lift) {
      return [legBase('base', 'Ottoman', 0, lift + 170, 0, W, 340, D, 'soft', cornerSpots(W, D, 4, 50))];
    },
  },
  foldingtable: {
    label: 'Wall folding table', description: 'Table top on folding wall brackets', defaultFitting: 'Brackets',
    params: [
      { key: 'width', label: 'Width', min: 600, max: 1500, step: 50, default: 1000, unit: 'mm' },
      { key: 'depth', label: 'Depth', min: 300, max: 600, step: 10, default: 450, unit: 'mm' },
      { key: 'height', label: 'Height', min: 700, max: 1100, step: 10, default: 750, unit: 'mm' },
    ],
    build({ width: W, depth: D, height: H }) {
      return [
        box('panel', 'Wall panel', 0, H - 250, -D / 2 - 10, W + 100, 700, 20, 'body'),
        box('top', 'Table top', 0, H - 15, 0, W, 30, D, 'front', { slot: 'bracket', spots: [[0.15, 0.08], [0.85, 0.08]] }),
      ];
    },
  },
  door: {
    label: 'Entrance door', description: 'Full height door leaf in a frame', defaultFitting: 'Door handles',
    params: [
      { key: 'width', label: 'Leaf width', min: 750, max: 1200, step: 10, default: 900, unit: 'mm' },
      { key: 'height', label: 'Leaf height', min: 2000, max: 2400, step: 10, default: 2100, unit: 'mm' },
      { key: 'hinge', label: 'Hinge side', options: [['left', 'Left'], ['right', 'Right']], default: 'left' },
    ],
    build({ width: W, height: H, hinge }) {
      const f = 70;
      return [
        box('frame-left', 'Frame', -W / 2 - f / 2, (H + f) / 2, 0, f, H + f, 120, 'body'),
        box('frame-right', 'Frame', W / 2 + f / 2, (H + f) / 2, 0, f, H + f, 120, 'body'),
        box('frame-top', 'Frame', 0, H + f / 2, 0, W + f * 2, f, 120, 'body'),
        box('leaf', 'Door leaf', 0, H / 2, 0, W - 6, H - 6, 45, 'front', { slot: 'entry', hinge }),
      ];
    },
  },
};

/** Fills in defaults and clamps values, so stored or shared designs cannot produce broken furniture. */
export function cleanParams(type, params = {}) {
  const t = templates[type];
  return Object.fromEntries(t.params.map(p => {
    const value = params[p.key];
    if (p.options) return [p.key, p.options.some(([v]) => v === value) ? value : p.default];
    if (p.type === 'toggle') return [p.key, typeof value === 'boolean' ? value : p.default];
    const n = Number(value);
    return [p.key, Number.isFinite(n) ? Math.min(p.max, Math.max(p.min, Math.round(n / p.step) * p.step)) : p.default];
  }));
}

export const DEFAULT_LIFT = 100;
/** Builds a template. `lift` raises leg-mounted pieces to the attached leg height. */
export function buildFurniture(type, params, lift = DEFAULT_LIFT) {
  return templates[type].build(cleanParams(type, params), lift);
}
export const faceOf = slot => (slot === 'leg' || slot === 'bracket' ? 'bottom' : 'front');
export const slotsIn = parts => [...new Set(parts.map(p => p.slot).filter(Boolean))];

/** Recommended attachment spots on one part. Returns face coordinates u,v (0–1) and a spin in degrees. */
export function defaultSpots(part, kind) {
  const [w, h] = part.size, bottom = part.pos[1] - h / 2;
  if (part.slot === 'leg' || part.slot === 'bracket') return (part.spots ?? [[0.5, 0.5]]).map(([u, v]) => ({ u, v, spin: 0 }));
  if (part.slot === 'drawer') {
    if (kind === 'knob' && w > 700) return [{ u: 0.25, v: 0.5, spin: 0 }, { u: 0.75, v: 0.5, spin: 0 }];
    return [{ u: 0.5, v: h > 250 ? 0.8 : 0.5, spin: 0 }];
  }
  const spin = kind === 'knob' ? 0 : 90;
  if (part.hinge === 'bottom') return [{ u: 0.5, v: 1 - 45 / h, spin: 0 }];
  if (part.hinge === 'top') return [{ u: 0.5, v: 45 / h, spin: 0 }];
  const inset = part.slot === 'entry' ? 75 : 45, u = part.hinge === 'right' ? inset / w : 1 - inset / w;
  const v = bottom > 1200 ? Math.min(0.5, 90 / h + 0.08) : h < 900 ? Math.max(0.5, 1 - 110 / h) : Math.min(0.85, Math.max(0.15, (1050 - bottom) / h));
  return [{ u, v, spin }];
}

let counter = 0;
export const newId = () => `f${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Places a product on every compatible part (or only `onlySlot` parts), replacing fittings of the same kind there. */
export function autoFit(parts, fittings, product, { onlySlot, partId, finish, size } = {}) {
  const kind = kindOf(product.category);
  const targets = parts.filter(p => p.slot && fits(product.category, p.slot) && (!onlySlot || p.slot === onlySlot) && (!partId || p.id === partId));
  const ids = new Set(targets.map(p => p.id));
  const kept = fittings.filter(f => !(ids.has(f.part) && f.kind === kind));
  const added = targets.flatMap(p => defaultSpots(p, kind).map(s => ({ id: newId(), product: product.id, kind, part: p.id, finish, size: size ?? defaultSize(product), tilt: 0, ...s })));
  return [...kept, ...added];
}

/** Sizes offered for a product. Per-inch ranges become even inch steps. */
export function fittingSizes(product) {
  const keys = [...new Set(product.variants.flatMap(v => Object.keys(v.prices)))].filter(k => /\d/.test(k));
  const out = new Set();
  for (const key of keys) {
    const span = key.match(/^(\d+)\s*[–-]\s*(\d+)\s*in$/);
    if (span) for (let i = Number(span[1]); i <= Number(span[2]); i += 2) out.add(`${i} in`);
    else out.add(key);
  }
  return [...out].sort((a, b) => parseFloat(a) - parseFloat(b));
}

/** Handles default to 12 in (the modelled length) and legs to 4 in when the catalog lists them. */
export function defaultSize(product) {
  const sizes = fittingSizes(product), prefer = kindOf(product.category) === 'leg' ? '4 in' : '12 in';
  return sizes.includes(prefer) ? prefer : sizes[Math.floor((sizes.length - 1) / 2)];
}
const letters = finish => finish.split(/[,/&]| and /).map(s => s.trim()).filter(s => /^[A-Z]$/.test(s));
const squash = s => s.toLowerCase().replace(/[^a-z]/g, '');
/** Finds the price list entry for a 3D finish name such as "A · Black & gold", "Gold" or "CP". */
export function variantFor(product, finish = '') {
  const letter = finish.match(/^([A-Z]) ·/)?.[1], name = squash(finish.replace(/^[A-Z] · /, ''));
  return (letter && product.variants.find(v => letters(v.finish).includes(letter)))
    || (name && product.variants.find(v => squash(v.finish) === name))
    || (name && product.variants.find(v => squash(v.finish).includes(name)))
    || product.variants[0];
}
/** Listed unit price for one fitting, or null when the catalog has no price. */
export function unitPrice(product, finish, size) {
  const variant = variantFor(product, finish);
  if (!variant) return null;
  const entries = Object.entries(variant.prices);
  if (variant.unit === 'Per inch') {
    const inches = parseFloat(size ?? '') || parseFloat(entries[0]?.[0] ?? '');
    const rate = entries.find(([k]) => { const m = k.match(/(\d+)\s*[–-]\s*(\d+)/); return m && inches >= Number(m[1]) && inches <= Number(m[2]); })?.[1];
    return rate == null || !inches ? null : rate * inches;
  }
  if (size && size in variant.prices) return variant.prices[size];
  return entries.length === 1 ? entries[0][1] : null;
}
export const priceBases = [{ key: 'listed', label: 'Listed price' }, ...priceFields.map(({ key, label }) => ({ key, label }))];
export function applyBasis(price, basis) {
  if (price == null || basis === 'listed') return price;
  return calculatedPrices(price)[priceFields.findIndex(f => f.key === basis)] ?? null;
}

/** Groups fittings by product, finish and size, with quantities and totals. */
export function billOfMaterials(fittings, products, basis = 'listed') {
  const byId = new Map(products.map(p => [p.id, p]));
  const rows = new Map();
  for (const f of fittings) {
    const product = byId.get(f.product);
    if (!product) continue;
    const key = [f.product, f.finish ?? '', f.size ?? ''].join('|');
    const row = rows.get(key) ?? { key, product, finish: f.finish ?? '', size: f.size ?? '', quantity: 0, unit: applyBasis(unitPrice(product, f.finish, f.size), basis) };
    row.quantity += 1;
    rows.set(key, row);
  }
  const list = [...rows.values()].map(r => ({ ...r, total: r.unit == null ? null : Math.round(r.unit * r.quantity * 100) / 100 }));
  return { rows: list, total: Math.round(list.reduce((s, r) => s + (r.total ?? 0), 0) * 100) / 100, unpriced: list.filter(r => r.total == null).length, count: fittings.length };
}
const cell = v => /[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v);
export function bomCSV(bom, furnitureLabel) {
  const lines = [['Furniture', 'Category', 'Model', 'Finish', 'Size', 'Quantity', 'Unit price', 'Line total'],
    ...bom.rows.map(r => [furnitureLabel, r.product.category, r.product.model, r.finish, r.size, r.quantity, r.unit ?? '', r.total ?? '']),
    ['', '', '', '', '', bom.count, 'Total', bom.total]];
  return lines.map(l => l.map(cell).join(',')).join('\n');
}

/** Height of the attached legs in mm, so the furniture rests on them. */
export function liftFor(fittings, parts) {
  const legs = fittings.filter(f => f.kind === 'leg' && parts.some(p => p.id === f.part && p.slot === 'leg'));
  const sizes = legs.map(f => parseFloat(f.size ?? '')).filter(Boolean);
  return sizes.length ? Math.max(...sizes) * 25.4 : DEFAULT_LIFT;
}

/** Converts face coordinates to millimetres from the left and bottom (or back) edge for the inspector. */
export const toMillimetres = (part, u, v) => {
  const [w, h, d] = part.size;
  return faceOf(part.slot) === 'front' ? { across: Math.round(u * w), up: Math.round(v * h) } : { across: Math.round(u * w), up: Math.round(v * d) };
};
export const fromMillimetres = (part, across, up) => {
  const [w, h, d] = part.size, clamp = n => Math.min(1, Math.max(0, n));
  return { u: clamp(across / w), v: clamp(up / (faceOf(part.slot) === 'front' ? h : d)) };
};

export const designVersion = 1;
/** Share links carry the design as base64url JSON. */
export function encodeDesign(design) {
  const json = JSON.stringify({ v: designVersion, ...design, fittings: design.fittings.map(({ id, ...f }) => f) });
  return btoa(String.fromCharCode(...new TextEncoder().encode(json))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
/** Reads a shared design. Unknown furniture, products and parts are dropped and numbers are clamped. */
export function decodeDesign(text, productIds) {
  try {
    const bytes = Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
    const raw = JSON.parse(new TextDecoder().decode(bytes));
    return cleanDesign(raw, productIds);
  } catch { return null; }
}
const num = (v, min, max, d) => Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : d;
const pick = (v, list, d) => list.includes(v) ? v : d;
export function cleanDesign(raw, productIds) {
  if (!raw || typeof raw !== 'object' || !templates[raw.type]) return null;
  const params = cleanParams(raw.type, raw.params);
  const parts = buildFurniture(raw.type, params);
  const known = new Set(productIds);
  const fittings = (Array.isArray(raw.fittings) ? raw.fittings : []).slice(0, 300).flatMap(f => {
    if (!f || !known.has(f.product) || !parts.some(p => p.id === f.part) || !['handle', 'knob', 'leg', 'bracket'].includes(f.kind)) return [];
    return [{ id: newId(), product: f.product, kind: f.kind, part: f.part, u: num(f.u, 0, 1, 0.5), v: num(f.v, 0, 1, 0.5), spin: num(f.spin, -360, 360, 0), tilt: num(f.tilt, -360, 360, 0),
      finish: typeof f.finish === 'string' ? f.finish.slice(0, 80) : undefined, size: typeof f.size === 'string' ? f.size.slice(0, 20) : undefined }];
  });
  const f = raw.finishes ?? {}, room = raw.room ?? {};
  return {
    type: raw.type, params, fittings,
    finishes: { front: pick(f.front, finishes.front, finishes.front[0]), body: pick(f.body, finishes.body, finishes.body[0]), soft: pick(f.soft, finishes.soft, finishes.soft[0]) },
    room: { wall: room.wall !== false, floor: pick(room.floor, floors, floors[0]) },
  };
}
export function newDesign(type = 'wardrobe') {
  return { type, params: cleanParams(type), fittings: [], finishes: { front: finishes.front[0], body: finishes.body[0], soft: finishes.soft[0], ...templates[type].finishes }, room: { wall: true, floor: floors[0] } };
}
/** Furniture that suits a product, for opening the playground from a product page. */
export const templateFor = category => Object.entries(templates).find(([, t]) => t.defaultFitting === category)?.[0] ?? 'wardrobe';

/**
 * Keeps fittings consistent after the furniture changes: drops fittings on removed parts, and gives new parts
 * the fitting most used on other parts of the same slot, so adding a door also adds its handle.
 */
export function syncFittings(parts, fittings, products) {
  const byPart = new Map(parts.map(p => [p.id, p]));
  const kept = fittings.filter(f => byPart.has(f.part) && fits(products.find(p => p.id === f.product)?.category, byPart.get(f.part).slot));
  const added = [];
  for (const slot of slotsIn(parts)) {
    const used = kept.filter(f => byPart.get(f.part).slot === slot), counts = new Map();
    for (const f of used) { const key = [f.product, f.finish ?? '', f.size ?? ''].join('|'); counts.set(key, (counts.get(key) ?? 0) + 1); }
    const top = [...counts].sort((a, b) => b[1] - a[1])[0];
    if (!top) continue;
    const sample = used.find(f => [f.product, f.finish ?? '', f.size ?? ''].join('|') === top[0]);
    for (const part of parts.filter(p => p.slot === slot && !kept.some(f => f.part === p.id)))
      added.push(...defaultSpots(part, sample.kind).map(s => ({ id: newId(), product: sample.product, kind: sample.kind, part: part.id, finish: sample.finish, size: sample.size, tilt: sample.tilt ?? 0, ...s })));
  }
  return { fittings: [...kept, ...added], removed: fittings.length - kept.length, added: added.length };
}
