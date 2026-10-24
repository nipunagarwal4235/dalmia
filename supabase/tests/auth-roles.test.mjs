import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;
  create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
  grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
for (const file of ['20260927040000_shared_catalog.sql', '20260928120000_auth_roles.sql', '20260928121000_bootstrap_super_admin.sql', '20261002180000_catalog_management_and_saved.sql', '20261025120000_delete_own_account.sql']) {
  await db.exec(await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
}
await db.exec(await readFile(new URL('../seed.sql', import.meta.url), 'utf8'));
const roles = ['super_admin', 'admin', 'manufacturer', 'retailer', 'wholesaler', 'dealer', 'customer'];
const ids = Object.fromEntries(roles.map((role, i) => [role, `00000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`]));
for (const role of roles) {
  await db.query('insert into auth.users(id, raw_user_meta_data) values($1, $2)', [ids[role], {role: 'super_admin', roles: ['super_admin']}]);
  assert.deepEqual((await db.query('select role from public.user_roles where user_id = $1',[ids[role]])).rows, [{role:'customer'}]);
  await db.query('update public.user_roles set role = $1 where user_id = $2', [role, ids[role]]);
}
const asUser = async (role, fn) => {
  await db.exec('begin');
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [ids[role]]);
    await db.exec('set local role authenticated');
    await fn();
  } finally {await db.exec('rollback');}
};
after(() => db.close());

test('only a trusted operator can bootstrap one confirmed super admin', async () => {
  await asUser('customer', async () => {
    await assert.rejects(db.query('select public.bootstrap_super_admin($1)', [ids.customer]), /permission denied/);
  });
  await db.exec('begin');
  try {
    await db.exec("delete from public.user_roles where role = 'super_admin'");
    await db.exec('savepoint unconfirmed');
    await assert.rejects(db.query('select public.bootstrap_super_admin($1)', [ids.customer]), /confirm their email/);
    await db.exec('rollback to savepoint unconfirmed');
    await db.query('update auth.users set email_confirmed_at = now() where id = $1',[ids.customer]);
    await db.query('select public.bootstrap_super_admin($1)', [ids.customer]);
    assert.deepEqual((await db.query('select role from public.user_roles where user_id = $1', [ids.customer])).rows,[{role:'super_admin'}]);
    await assert.rejects(db.query('select public.bootstrap_super_admin($1)', [ids.admin]), /already exists/);
  } finally {await db.exec('rollback');}
});

test('each role gets its exact permissions from trusted tables', async () => {
  for (const role of roles) await asUser(role, async () => {
    const context = (await db.query('select public.get_access_context() as context')).rows[0].context;
    assert.deepEqual(context.roles, [role]);
    assert.equal(context.permissions.includes('roles.manage'), role === 'super_admin');
    assert.equal(context.permissions.includes('catalog.manage'), ['super_admin','admin'].includes(role));
    assert.equal(context.permissions.includes('catalog.assigned.manage'), role === 'manufacturer');
  });
});

test('business roles cannot change roles, disable accounts, or edit arbitrary products', async () => {
  for (const role of roles.slice(2)) {
    await asUser(role, async () => {
      assert.equal((await db.query("update public.catalog_products set data = data where id = 'door-handles-1701' returning id")).rows.length, 0);
      assert.equal((await db.query('select * from public.profiles')).rows.length, 1);
      await assert.rejects(db.exec("update public.user_roles set role = 'super_admin'"), /permission denied/);
    });
    await asUser(role, async () => {
      await assert.rejects(db.query("select public.set_user_access($1, array['super_admin']::public.app_role[], true)", [ids[role]]), /Access denied/);
    });
    await asUser(role, async () => {
      await assert.rejects(db.exec('update public.profiles set active = true'), /permission denied/);
    });
  }
});

test('manufacturers can edit only assigned products', async () => {
  await db.query("insert into public.product_manufacturers values('door-handles-1701', $1)", [ids.manufacturer]);
  await asUser('manufacturer', async () => {
    assert.equal((await db.query("update public.catalog_products set data = data where id = 'door-handles-1701' returning id")).rows.length, 1);
    assert.equal((await db.query("update public.catalog_products set data = data where id = 'door-handles-1702' returning id")).rows.length, 0);
    assert.equal((await db.query("delete from public.catalog_products where id = 'door-handles-1701' returning id")).rows.length, 0);
  });
});

test('admins manage business roles but cannot assign staff roles or change staff accounts', async () => {
  await asUser('admin', async () => {
    await db.query("select public.set_user_access($1, array['dealer','retailer']::public.app_role[], true)", [ids.customer]);
    assert.equal((await db.query('select * from public.user_roles where user_id = $1', [ids.customer])).rows.length, 2);
    assert.equal((await db.query('select * from public.access_audit')).rows.length, 1);
  });
  for (const target of ['customer', 'super_admin']) await asUser('admin', async () => {
    await assert.rejects(db.query("select public.set_user_access($1, array['admin']::public.app_role[], true)", [ids[target]]), /Only a super admin/);
  });
});

test('super admins can manage staff but cannot remove their own access', async () => {
  await asUser('super_admin', async () => {
    await db.query("select public.set_user_access($1, array['admin']::public.app_role[], true)", [ids.customer]);
    assert.equal((await db.query('select role from public.user_roles where user_id = $1',[ids.customer])).rows[0].role, 'admin');
  });
  await asUser('super_admin', async () => {
    await assert.rejects(db.query("select public.set_user_access($1, array['customer']::public.app_role[], false)", [ids.super_admin]), /your own access/);
  });
});

test('disabled accounts lose permissions even with an existing session', async () => {
  await db.query('update public.profiles set active = false where id = $1', [ids.manufacturer]);
  await asUser('manufacturer', async () => {
    assert.deepEqual((await db.query('select public.get_access_context() as context')).rows[0].context.permissions, []);
    assert.equal((await db.query("update public.catalog_products set data = data where id = 'door-handles-1701' returning id")).rows.length, 0);
  });
  await db.query('update public.profiles set active = true where id = $1', [ids.manufacturer]);
});

test('permission changes apply immediately and cannot give staff powers to business roles', async () => {
  await asUser('super_admin', async () => {
    await db.exec("select public.set_role_permissions('dealer', array['catalog.read'])");
    assert.equal((await db.query("select * from public.role_permissions where role='dealer'")).rows.length, 1);
  });
  await asUser('super_admin', async () => {
    await assert.rejects(db.exec("select public.set_role_permissions('customer', array['roles.manage'])"), /staff_permissions_only/);
  });
  await asUser('admin', async () => {
    await assert.rejects(db.exec("select public.set_role_permissions('dealer', array['catalog.read'])"), /Access denied/);
  });
});


test('saved collections stay private and users cannot write another collection', async () => {
  await asUser('customer', async () => {
    await db.exec("select public.set_saved_product('door-handles-1701', true)");
    assert.deepEqual((await db.query('select public.get_saved_products() ids')).rows[0].ids, ['door-handles-1701']);
    await db.exec("select public.set_saved_product('door-handles-1701', false)");
    assert.deepEqual((await db.query('select public.get_saved_products() ids')).rows[0].ids, []);
    await assert.rejects(db.query('insert into public.saved_products values ($1,$2)', [ids.admin,'door-handles-1701']), /row-level security/);
  });
  await db.query('insert into public.saved_products values ($1,$2)', [ids.customer,'door-handles-1701']);
  await asUser('admin', async () => {
    assert.deepEqual((await db.query('select public.get_saved_products() ids')).rows[0].ids, []);
    assert.equal((await db.query('delete from public.saved_products where user_id=$1 returning *', [ids.customer])).rows.length, 0);
  });
});

test('product edits derive search, sizes and prices and reject invalid prices', async () => {
  await asUser('admin', async () => {
    const product = (await db.query("select data from public.catalog_products where id='door-handles-1701'")).rows[0].data;
    product.model='Managed model';product.variants[0].prices={'55 in':123.45};product.variants=product.variants.slice(0,1);
    const row=(await db.query("update public.catalog_products set data=$1 where id='door-handles-1701' returning data",[product])).rows[0].data;
    assert.equal(row.minPrice,123.45);assert.equal(row.maxPrice,123.45);assert.ok(row.sizes.includes('55 in'));assert.match(row.searchText,/Managed model/);
    product.variants[0].prices={'55 in':-1};
    await assert.rejects(db.query("update public.catalog_products set data=$1 where id='door-handles-1701'",[product]), /Prices must/);
  });
});

test('staff can create and delete products and manufacturer cannot create', async () => {
  const product=(await db.query("select data from public.catalog_products where id='door-handles-1701'")).rows[0].data;
  product.id='test-new-product';product.model='New model';
  await asUser('admin', async () => {
    await db.query('select public.create_catalog_product($1)',[product]);
    assert.equal((await db.query('select data from public.catalog_products where id=$1',[product.id])).rows[0].data.model,'New model');
    assert.equal((await db.query('delete from public.catalog_products where id=$1 returning id',[product.id])).rows.length,1);
  });
  await asUser('manufacturer', async () => {await assert.rejects(db.query('select public.create_catalog_product($1)',[product]), /Access denied/);});
});

test('storage uploads are limited to assigned product folders', async () => {
  await db.exec(`create schema storage; create table storage.objects(id text, bucket_id text, name text);
    create function storage.foldername(name text) returns text[] language sql as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated; grant insert on storage.objects to authenticated;`);
  await db.exec(await readFile(new URL('../migrations/20261002181000_managed_product_uploads.sql',import.meta.url),'utf8'));
  await asUser('manufacturer', async () => {
    await db.exec("insert into storage.objects values ('ok','catalog-media','assets/products/door-handles-1701/abc-123.png')");
    await assert.rejects(db.exec("insert into storage.objects values ('bad','catalog-media','assets/products/door-handles-1702/abc-123.png')"), /row-level security/);
  });
  await asUser('customer', async () => {
    await assert.rejects(db.exec("insert into storage.objects values ('bad','catalog-media','assets/products/door-handles-1701/abc-123.png')"), /row-level security/);
  });
});

test('people can delete only their own account, and the last super admin stays', async () => {
  await asUser('dealer', async () => {
    await db.query("insert into public.saved_products(user_id, product_id) values($1, 'door-handles-1701')", [ids.dealer]);
    await db.query('select public.delete_own_account()');
    await db.exec('reset role');
    assert.equal((await db.query('select 1 from auth.users where id = $1', [ids.dealer])).rows.length, 0);
    assert.equal((await db.query('select 1 from public.profiles where id = $1', [ids.dealer])).rows.length, 0);
    assert.equal((await db.query('select 1 from public.user_roles where user_id = $1', [ids.dealer])).rows.length, 0);
    assert.equal((await db.query('select 1 from public.saved_products where user_id = $1', [ids.dealer])).rows.length, 0);
    assert.equal((await db.query("select 1 from auth.users")).rows.length, roles.length - 1);
  });
  await asUser('super_admin', async () => {
    await assert.rejects(db.query('select public.delete_own_account()'), /at least one active super admin/);
  });
  await db.exec('begin');
  try {
    await db.exec('set local role anon');
    await assert.rejects(db.query('select public.delete_own_account()'), /permission denied/);
  } finally {await db.exec('rollback');}
});
