import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogMediaURL, catalogDocumentURL} from '../lib/media.mjs';
const origin = 'https://qjaryhukmpodadrcfopb.supabase.co';

test('both apps resolve catalog files to Storage and preserve spaces and page references', () => {
  assert.equal(catalogMediaURL('/assets/products/heavy bracket.jpg', origin + '/'), `${origin}/storage/v1/object/public/catalog-media/assets/products/heavy%20bracket.jpg`);
  assert.equal(catalogDocumentURL({file: 'SOFA LEG (1).pdf'}, 8, origin), `${origin}/storage/v1/object/public/catalog-media/documents/SOFA%20LEG%20(1).pdf#page=8`);
  assert.equal(catalogMediaURL('https://example.org/custom.jpg', origin), 'https://example.org/custom.jpg');
});

test('unconfigured apps keep their local files and existing web fallback', () => {
  assert.equal(catalogMediaURL('assets/image.jpg'), '/assets/image.jpg');
  assert.equal(catalogDocumentURL({file: 'prices.pdf'}, undefined, '', 'https://dalmia-blush.vercel.app'), 'https://dalmia-blush.vercel.app/documents/prices.pdf');
});

test('mobile uses the same Storage path rules as the web app', async () => {
  assert.equal(await readFile(new URL('../lib/media.mjs', import.meta.url), 'utf8'), await readFile(new URL('../../mobile-app/src/lib/media.mjs', import.meta.url), 'utf8'));
});
