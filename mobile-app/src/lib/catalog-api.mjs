// This module is copied into the mobile app by sync-catalog.mjs.
export function isCatalog(value) {
  const strings = values => Array.isArray(values) && values.every(item => typeof item === 'string');
  return !!value && Array.isArray(value.products) && value.products.every(product => product &&
    typeof product.id === 'string' && typeof product.model === 'string' &&
    typeof product.category === 'string' && typeof product.searchText === 'string' &&
    strings(product.sizes) && strings(product.specs) && strings(product.notes) &&
    Array.isArray(product.sources) && Array.isArray(product.images) &&
    Array.isArray(product.variants) && product.variants.every(variant => variant &&
      typeof variant.finish === 'string' && typeof variant.unit === 'string' &&
      variant.prices && typeof variant.prices === 'object' && !Array.isArray(variant.prices) &&
      Object.values(variant.prices).every(price => price === null || (typeof price === 'number' && Number.isFinite(price)))
    ) && (product.minPrice === null || typeof product.minPrice === 'number') &&
    (product.maxPrice === null || typeof product.maxPrice === 'number')
  ) && new Set(value.products.map(product => product.id)).size === value.products.length &&
    Array.isArray(value.documents) && value.documents.every(document => document &&
      typeof document.id === 'string' && typeof document.file === 'string'
    ) && typeof value.priceNote === 'string';
}

export async function fetchCatalog({url, key, includePages = true, fetcher = fetch}) {
  if (!url && !key) return null;
  if (!url || !key) throw new Error('Set both the Supabase URL and publishable key.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher(`${url.replace(/\/+$/, '')}/rest/v1/rpc/get_catalog`, {
      method: 'POST',
      headers: {apikey: key, 'Content-Type': 'application/json'},
      body: JSON.stringify({include_pages: includePages}),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Catalog request failed (${response.status}).`);
    const catalog = await response.json();
    if (!isCatalog(catalog) || (includePages && (!Array.isArray(catalog.pages) || typeof catalog.terms !== 'string'))) {
      throw new Error('The database returned an invalid catalog.');
    }
    return catalog;
  } finally {
    clearTimeout(timer);
  }
}
