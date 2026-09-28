import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogMediaURL, catalogDocumentURL} from '../lib/media.mjs';
const origin = 'https://qjaryhukmpodadrcfopb.supabase.co';

test('both apps resolve catalog files to Storage and preserve spaces and page references', () => {
  assert.equal(catalogMediaURL('/assets/products/heavy bracket.jpg', origin + '/'), `${origin}/storage/v1/object/public/catalog-media/assets/products/heavy%20bracket.jpg`);
  assert.equal(catalogDocumentURL({file: 'SOFA LEG (1).pdf'}, 8, origin), `${origin}/storage/v1/object/public/catalog-media/documents/SOFA%20LEG%20(1).pdf#page=8`);
  const stored = `${origin}/storage/v1/object/public/catalog-media/assets/image.jpg`;
  assert.equal(catalogMediaURL(stored, origin), stored);
});

test('missing configuration and non-Storage URLs cannot fall back to other image hosts', () => {
  assert.throws(() => catalogMediaURL('assets/image.jpg'), /Set the Supabase project URL/);
  assert.throws(() => catalogDocumentURL({file: 'prices.pdf'}), /Set the Supabase project URL/);
  assert.throws(() => catalogMediaURL('https://example.org/custom.jpg', origin), /must use the configured Supabase/);
});

test('mobile uses the same Storage path rules as the web app', async () => {
  assert.equal(await readFile(new URL('../lib/media.mjs', import.meta.url), 'utf8'), await readFile(new URL('../../mobile-app/src/lib/media.mjs', import.meta.url), 'utf8'));
});
