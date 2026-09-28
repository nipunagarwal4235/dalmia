export const catalogBucket = 'catalog-media';

// Catalog records retain portable object paths. Both apps resolve the same paths.
export function catalogMediaURL(path, supabaseURL = '') {
  if (!supabaseURL) throw new Error('Set the Supabase project URL to load catalog media.');
  const origin = `${supabaseURL.replace(/\/+$/, '')}/storage/v1/object/public/${catalogBucket}/`;
  if (/^https?:\/\//.test(path)) {
    if (!path.startsWith(origin)) throw new Error('Catalog media must use the configured Supabase Storage bucket.');
    return path;
  }
  const objectPath = path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  return `${origin}${objectPath}`;
}

export function catalogDocumentURL(document, page, supabaseURL = '') {
  const url = catalogMediaURL(`documents/${document.file}`, supabaseURL);
  return url + (page ? `#page=${page}` : '');
}
