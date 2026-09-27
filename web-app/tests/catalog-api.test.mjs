import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fetchCatalog, isCatalog} from '../lib/catalog-api.mjs';
const source = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'));

test('catalog fetch uses a public API key and requests one database snapshot', async () => {
  const catalog = await fetchCatalog({url: 'https://example.supabase.co/', key: 'sb_publishable_test', includePages: false, fetcher: async (url, request) => {
    assert.equal(url, 'https://example.supabase.co/rest/v1/rpc/get_catalog');
    assert.equal(request.headers.apikey, 'sb_publishable_test');
    assert.equal(request.headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(request.body), {include_pages: false});
    return Response.json(source);
  }});
  assert.deepEqual(catalog, source);
});

test('missing configuration uses the bundled catalog, partial configuration reports an error', async () => {
  assert.equal(await fetchCatalog({}), null);
  await assert.rejects(fetchCatalog({url: 'https://example.supabase.co'}), /both/);
});

test('invalid catalog responses and network failures cannot replace the catalog', async () => {
  for (const response of [Response.json(null), Response.json({products: []}), new Response('', {status: 503})]) {
    await assert.rejects(fetchCatalog({url: 'https://example.supabase.co', key: 'public', fetcher: async () => response}));
  }
  assert.equal(isCatalog({...source, products: [...source.products, source.products[0]]}), false);
  assert.equal(isCatalog({...source, products: [{...source.products[0], variants: [{prices: {size: 'bad'}}]}]}), false);
  assert.equal(isCatalog({...source, products: []}), true);
});

test('mobile uses the identical catalog client', async () => {
  assert.equal(await readFile(new URL('../lib/catalog-api.mjs', import.meta.url), 'utf8'), await readFile(new URL('../../mobile-app/src/lib/catalog-api.mjs', import.meta.url), 'utf8'));
});
