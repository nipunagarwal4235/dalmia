import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const db = new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
await db.exec(await readFile(new URL('../migrations/20260927040000_shared_catalog.sql', import.meta.url), 'utf8'));
const seed = await readFile(new URL('../seed.sql', import.meta.url), 'utf8');
await db.exec(seed);
const original = JSON.parse(await readFile(new URL('../../web-app/data/catalog.json', import.meta.url), 'utf8'));
after(() => db.close());

test('the database reproduces every catalog field without changing prices or source records', async () => {
  const {rows} = await db.query('select public.get_catalog() as catalog');
  assert.deepEqual(rows[0].catalog, original);
});

test('mobile and web receive the same products, prices and documents', async () => {
  const {rows} = await db.query('select public.get_catalog(false) as catalog');
  assert.deepEqual(rows[0].catalog.products, original.products.map(({catalogText, ...product}) => product));
  assert.deepEqual(rows[0].catalog.documents, original.documents);
  assert.deepEqual(rows[0].catalog.pages, []);
});

for (const role of ['anon', 'authenticated']) {
  test(`${role} can read the catalog but cannot insert, update, delete or truncate`, async () => {
    await db.exec(`set role ${role}`);
    try {
      assert.equal((await db.query('select public.get_catalog() as catalog')).rows[0].catalog.products.length, 149);
      for (const table of ['catalog_products', 'catalog_documents', 'catalog_pages', 'catalog_settings']) {
        assert.ok((await db.query(`select * from public.${table}`)).rows.length);
        for (const sql of [
          `insert into public.${table} default values`,
          `update public.${table} set updated_at = now()`,
          `delete from public.${table}`,
          `truncate public.${table}`,
        ]) await assert.rejects(db.exec(sql), /permission denied/);
      }
    } finally {await db.exec('reset role');}
  });
}

test('all exposed catalog tables enforce row security', async () => {
  const {rows} = await db.query("select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'");
  assert.equal(rows.length, 4);
  assert.ok(rows.every(row => row.relrowsecurity));
});

test('reapplying the seed preserves database edits', async () => {
  await db.exec('begin');
  await db.exec("update public.catalog_products set data = jsonb_set(data, '{notes}', '[\"Updated in Supabase\"]') where position = 0");
  // The seed owns its transaction, so remove that wrapper for this rollback test.
  await db.exec(seed.replace(/^begin;$/m, '').replace(/^commit;$/m, ''));
  assert.deepEqual((await db.query('select data from public.catalog_products where position = 0')).rows[0].data.notes, ['Updated in Supabase']);
  assert.equal((await db.query('select count(*)::int as count from public.catalog_products')).rows[0].count, 149);
  await db.exec('rollback');
});

test('the catalog function returns more than the REST row limit', async () => {
  await db.exec('begin');
  await db.exec(`insert into public.catalog_products (id, position, data)
    select 'extra-' || n, n, jsonb_build_object('id', 'extra-' || n, 'model', 'Extra', 'category', 'Test', 'variants', '[]'::jsonb, 'images', '[]'::jsonb)
    from generate_series(1000, 2000) n`);
  await db.exec('set local role anon');
  assert.equal((await db.query('select jsonb_array_length(public.get_catalog()->\'products\') as count')).rows[0].count, 1150);
  await db.exec('rollback');
});
