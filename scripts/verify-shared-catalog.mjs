import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fetchCatalog} from '../web-app/lib/catalog-api.mjs';

const root = new URL('../', import.meta.url);
const readEnv = async app => Object.fromEntries((await readFile(new URL(`${app}/.env.local`, root), 'utf8'))
  .split('\n').filter(line => /^[A-Z_]+=/.test(line)).map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()]));
const web = await readEnv('web-app');
const mobile = await readEnv('mobile-app');
const url = web.NEXT_PUBLIC_SUPABASE_URL;
const key = web.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key, 'The web app needs Supabase connection values.');
assert.equal(mobile.EXPO_PUBLIC_SUPABASE_URL, url, 'Both apps must use the same project.');
assert.equal(mobile.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, key, 'Both apps must use the same publishable key.');
assert.match(key, /^sb_publishable_/, 'Apps must use a publishable key.');

const [full, compact] = await Promise.all([
  fetchCatalog({url, key}),
  fetchCatalog({url, key, includePages: false}),
]);
assert.deepEqual(compact.products, full.products.map(({catalogText, ...product}) => product));
assert.deepEqual(compact.documents, full.documents);
assert.deepEqual(compact.pages, []);
if (process.argv.includes('--initial-import')) {
  const original = JSON.parse(await readFile(new URL('web-app/data/catalog.json', root), 'utf8'));
  assert.deepEqual(full, original, 'The initial database import must preserve the source catalog exactly.');
}

// Invalid inserts and updates against an impossible filter cannot change real records.
for (const table of ['catalog_products', 'catalog_documents', 'catalog_pages', 'catalog_settings']) {
  const filter = table === 'catalog_pages' ? 'document_id=eq.__permission_test__' : table === 'catalog_settings' ? 'id=eq.false' : 'id=eq.__permission_test__';
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    const response = await fetch(`${url}/rest/v1/${table}?${filter}`, {
      method,
      headers: {apikey: key, 'Content-Type': 'application/json'},
      ...(method === 'POST' ? {body: '{}'} : method === 'PATCH' ? {body: JSON.stringify({updated_at: new Date().toISOString()})} : {}),
      signal: AbortSignal.timeout(10000),
    });
    assert.ok([401, 403].includes(response.status), `${method} ${table} must reject public writes, received ${response.status}.`);
  }
}
console.log(`Shared database verified: ${full.products.length} products, ${full.documents.length} documents, ${full.pages.length} pages. Both app responses match. Public writes are denied.`);
