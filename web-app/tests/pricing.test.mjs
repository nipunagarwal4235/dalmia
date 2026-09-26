import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculatedPrices, priceFields } from '../lib/pricing.mjs';
import { exportCSV } from '../lib/catalog.mjs';
const catalog = JSON.parse(readFileSync(new URL('../data/catalog.json', import.meta.url)));

test('Discounts apply before additions and round the final amount', () => {
  assert.deepEqual(calculatedPrices(1000), [350, 250, 413, 295, 381.5, 272.5]);
  assert.deepEqual(calculatedPrices(30), [10.5, 7.5, 12.39, 8.85, 11.45, 8.18]);
  assert.deepEqual(calculatedPrices(10), [3.5, 2.5, 4.13, 2.95, 3.82, 2.73]);
  assert.deepEqual(calculatedPrices(5755), [2014.25, 1438.75, 2376.82, 1697.73, 2195.53, 1568.24]);
});

test('Missing prices stay missing and zero remains zero', () => {
  assert.deepEqual(calculatedPrices(null), Array(6).fill(null));
  assert.deepEqual(calculatedPrices(undefined), Array(6).fill(null));
  assert.deepEqual(calculatedPrices(0), Array(6).fill(0));
});

function parseCSV(csv) {
  return csv.replace(/^\uFEFF/, '').split('\r\n').map(row => [...row.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(cell => cell[1].replaceAll('""', '"')));
}

test('CSV includes six calculated fields for each price, with blank fields for unavailable prices', () => {
  const products = ['DH-1001','1272','1203'].map(model => catalog.products.find(p => p.model === model));
  const rows = parseCSV(exportCSV(products, catalog.documents));
  assert.deepEqual(rows[0].slice(-6), priceFields.map(field => field.label));
  assert.ok(rows.every(row => row.length === rows[0].length));
  const rate = rows.find(row => row[0] === 'DH-1001' && row[5] === '30');
  assert.equal(rate[6], 'Per inch');
  assert.deepEqual(rate.slice(-6), ['10.50','7.50','12.39','8.85','11.45','8.18']);
  for (const row of rows.slice(1).filter(row => !row[5])) assert.deepEqual(row.slice(-6), Array(6).fill(''));
});
