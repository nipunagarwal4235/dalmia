import { calculatedPrices, priceFields } from './pricing.mjs';
export const normalize = (value) => String(value ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
export const matchesQuery = (text, query) => query.trim().split(/\s+/).every(token => {
  const term = normalize(token);
  if (/^\d{3,4}$/.test(term)) return new RegExp('(?<![0-9])' + term + '(?![0-9])').test(text);
  if (/^dh\d{3,4}$/.test(term)) return new RegExp('dh[\\s-]*' + term.slice(2) + '(?![0-9])', 'i').test(text);
  return normalize(text).includes(term);
});
export function matchesFinish(product, finish) {
  if (!finish) return true;
  const text = normalize(product.searchText);
  const aliases = { rosegold: ['rosegold', 'rg'], antique: ['antique', 'antic', 'ab'], cp: ['cp'], grey: ['grey', 'gray'] };
  return (aliases[normalize(finish)] || [normalize(finish)]).some(value => text.includes(value));
}
export function matchesSize(product, size) {
  if (!size) return true;
  const wanted = parseInt(size, 10);
  return product.sizes.some(s => {
    const range = s.match(/^(\d+)[–-](\d+) in$/);
    return range ? wanted >= Number(range[1]) && wanted <= Number(range[2]) : s === size;
  });
}
export function filterProducts(products, state, saved = new Set()) {
  return products.filter(p => (state.view !== 'saved' || saved.has(p.id))
    && (!state.category || p.category === state.category)
    && state.query.trim().split(/\s+/).every(token => { const term=normalize(token); return /^(dh)?\d{3,4}$/.test(term) ? normalize(p.model).includes(term) : normalize(p.searchText).includes(term); })
    && matchesSize(p, state.size) && matchesFinish(p, state.finish)
    && (!state.status || (state.status === 'priced' && p.minPrice !== null)
      || (state.status === 'unpriced' && p.minPrice === null)
      || (state.status === 'notes' && p.notes.length > 0)
      || (state.status === 'no-picture' && p.images.length === 0)))
    .sort((a,b) => {
      const exactA = !!state.query && normalize(a.model) === normalize(state.query);
      const exactB = !!state.query && normalize(b.model) === normalize(state.query);
      if (exactA !== exactB) return exactA ? -1 : 1;
      if (state.sort.startsWith('price')) {
        if (a.minPrice === null || b.minPrice === null) return a.minPrice === b.minPrice ? 0 : a.minPrice === null ? 1 : -1;
        const diff = a.minPrice-b.minPrice;
        if (diff) return state.sort === 'price-asc' ? diff : -diff;
      }
      return a.model.localeCompare(b.model, 'en', {numeric:true});
    });
}
const csvCell = value => '"' + String(value ?? '').replace(/^[=+@\-]/, "'$&").replaceAll('"', '""') + '"';
export function exportCSV(products, documents) {
  const rows = [['Model','Category','Finish / color','Thickness','Size','Listed price','Rate basis','Box quantity','Box unit','Weight','Source file','PDF page','Source notes',...priceFields.map(field => field.label)]];
  for (const p of products) {
    if (!p.variants.length) rows.push([p.model,p.category,'','','','','','','','','','','Price not listed',...priceFields.map(() => '')]);
    for (const v of p.variants) for (const [size, price] of Object.entries(v.prices)) {
      rows.push([p.model,p.category,v.finish,v.thickness,size,price,v.unit,v.box,v.boxUnit || (v.box ? 'pcs' : ''),v.weight,documents.find(d => d.id === v.source.document)?.file,v.source.page,p.notes.join(' | '),...calculatedPrices(price).map(amount => amount == null ? '' : amount.toFixed(2))]);
    }
  }
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
