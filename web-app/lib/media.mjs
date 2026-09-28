export const catalogBucket = 'catalog-media';

// Catalog records retain portable object paths. Both apps resolve the same paths.
export function catalogMediaURL(path, supabaseURL = '', fallbackOrigin = '') {
  if (/^https?:\/\//.test(path)) return path;
  const objectPath = path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  const origin = supabaseURL
    ? `${supabaseURL.replace(/\/+$/, '')}/storage/v1/object/public/${catalogBucket}`
    : fallbackOrigin.replace(/\/+$/, '');
  return `${origin}/${objectPath}`;
}

export function catalogDocumentURL(document, page, supabaseURL = '', fallbackOrigin = '') {
  const url = catalogMediaURL(`documents/${document.file}`, supabaseURL, fallbackOrigin);
  return url + (page ? `#page=${page}` : '');
}
