create type public.app_role as enum ('super_admin', 'admin', 'manufacturer', 'retailer', 'wholesaler', 'dealer', 'customer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 120),
  company text not null default '' check (length(company) <= 160),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  primary key (user_id, role)
);
create table public.permissions (
  name text primary key,
  description text not null
);
insert into public.permissions values
  ('catalog.read', 'Browse products, prices, and source documents'),
  ('catalog.manage', 'Create, edit, and remove catalog records'),
  ('catalog.assigned.manage', 'Edit products assigned to this manufacturer'),
  ('users.manage', 'Manage business accounts and product assignments'),
  ('roles.manage', 'Manage staff roles and role permissions'),
  ('profile.update', 'Edit your own name and company'),
  ('audit.read', 'Read the access change history');
create table public.role_permissions (
  role public.app_role not null,
  permission text not null references public.permissions(name),
  primary key (role, permission),
  constraint staff_permissions_only check (
    (permission not in ('users.manage', 'catalog.manage', 'audit.read') or role in ('super_admin', 'admin')) and
    (permission <> 'roles.manage' or role = 'super_admin') and
    (permission <> 'catalog.assigned.manage' or role in ('super_admin', 'admin', 'manufacturer'))
  )
);
insert into public.role_permissions select role, permission
from unnest(enum_range(null::public.app_role)) role cross join unnest(array['catalog.read', 'profile.update']) permission;
insert into public.role_permissions values
  ('super_admin', 'catalog.manage'), ('super_admin', 'users.manage'), ('super_admin', 'roles.manage'), ('super_admin', 'audit.read'),
  ('admin', 'catalog.manage'), ('admin', 'users.manage'), ('admin', 'audit.read'),
  ('manufacturer', 'catalog.assigned.manage');
create table public.product_manufacturers (
  product_id text not null references public.catalog_products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (product_id, user_id)
);
create index product_manufacturers_user_idx on public.product_manufacturers(user_id);
create table public.access_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_id text not null,
  details jsonb not null,
  created_at timestamptz not null default now()
);

create function public.has_permission(wanted text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    join public.role_permissions rp on rp.role = ur.role
    where p.id = auth.uid() and p.active and rp.permission = wanted
  );
$$;
create function public.can_edit_product(product_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_permission('catalog.manage') or
    (public.has_permission('catalog.assigned.manage') and exists (
      select 1 from public.product_manufacturers pm where pm.product_id = $1 and pm.user_id = auth.uid()
    ));
$$;

create function public.create_account_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name) values (new.id, left(coalesce(new.raw_user_meta_data->>'display_name', ''), 120));
  insert into public.user_roles(user_id, role) values (new.id, 'customer');
  return new;
end;
$$;
create trigger create_account_profile after insert on auth.users
for each row execute function public.create_account_profile();
insert into public.profiles(id, display_name)
select id, left(coalesce(raw_user_meta_data->>'display_name', ''), 120) from auth.users;
insert into public.user_roles(user_id, role) select id, 'customer' from public.profiles;
create trigger profiles_updated before update on public.profiles
for each row execute function public.catalog_touch_updated_at();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.product_manufacturers enable row level security;
alter table public.access_audit enable row level security;
revoke all on public.profiles, public.user_roles, public.permissions, public.role_permissions, public.product_manufacturers, public.access_audit from public, anon, authenticated;
grant select on public.profiles, public.user_roles, public.permissions, public.role_permissions, public.product_manufacturers, public.access_audit to authenticated;
grant update(display_name, company) on public.profiles to authenticated;
grant all on public.profiles, public.user_roles, public.permissions, public.role_permissions, public.product_manufacturers, public.access_audit to service_role;
create policy profile_read on public.profiles for select to authenticated using (id = auth.uid() or public.has_permission('users.manage'));
create policy profile_update on public.profiles for update to authenticated using (id = auth.uid() and public.has_permission('profile.update')) with check (id = auth.uid() and public.has_permission('profile.update'));
create policy user_roles_read on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_permission('users.manage'));
create policy permissions_read on public.permissions for select to authenticated using (true);
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);
create policy assignments_read on public.product_manufacturers for select to authenticated using (user_id = auth.uid() or public.has_permission('users.manage'));
create policy audit_read on public.access_audit for select to authenticated using (public.has_permission('audit.read'));

create function public.get_access_context() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'displayName', p.display_name, 'company', p.company, 'active', p.active,
    'roles', coalesce((select jsonb_agg(role order by role) from public.user_roles where user_id = p.id), '[]'::jsonb),
    'permissions', case when p.active then coalesce((select jsonb_agg(distinct rp.permission)
      from public.role_permissions rp join public.user_roles ur on ur.role = rp.role where ur.user_id = p.id), '[]'::jsonb) else '[]'::jsonb end
  ) from public.profiles p where p.id = auth.uid();
$$;

create function public.list_accounts() returns table(id uuid, display_name text, company text, active boolean, email text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_permission('users.manage') then raise exception 'Access denied' using errcode = '42501'; end if;
  return query select p.id, p.display_name, p.company, p.active, u.email::text, p.created_at
    from public.profiles p join auth.users u on u.id = p.id order by p.created_at;
end;
$$;

create function public.set_user_access(target_user uuid, new_roles public.app_role[], is_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare old_roles public.app_role[]; old_active boolean; is_super boolean;
begin
  perform pg_advisory_xact_lock(904281200);
  if not public.has_permission('users.manage') then raise exception 'Access denied' using errcode = '42501'; end if;
  is_super := public.has_permission('roles.manage');
  if target_user = auth.uid() then raise exception 'You cannot change your own access'; end if;
  if is_active is null or coalesce(array_length(new_roles, 1), 0) = 0 or array_position(new_roles, null) is not null then raise exception 'Choose at least one role'; end if;
  select active into old_active from public.profiles where id = target_user for update;
  if not found then raise exception 'Account not found'; end if;
  select array_agg(role) into old_roles from public.user_roles where user_id = target_user;
  if not is_super and (old_roles && array['super_admin', 'admin']::public.app_role[] or new_roles && array['super_admin', 'admin']::public.app_role[]) then
    raise exception 'Only a super admin can manage staff access' using errcode = '42501';
  end if;
  if old_active and 'super_admin' = any(old_roles) and (not is_active or not 'super_admin' = any(new_roles)) and not exists (
    select 1 from public.profiles p join public.user_roles ur on ur.user_id = p.id
    where p.active and ur.role = 'super_admin' and p.id <> target_user
  ) then raise exception 'Keep at least one active super admin'; end if;
  delete from public.user_roles where user_id = target_user;
  insert into public.user_roles(user_id, role) select target_user, r from (select distinct unnest(new_roles) r) roles;
  update public.profiles set active = is_active where id = target_user;
  insert into public.access_audit(actor_id, action, target_id, details) values
    (auth.uid(), 'user_access', target_user::text, jsonb_build_object('oldRoles', old_roles, 'newRoles', new_roles, 'active', is_active));
end;
$$;

create function public.assign_manufacturer(target_product text, manufacturer uuid, assigned boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_permission('users.manage') then raise exception 'Access denied' using errcode = '42501'; end if;
  if assigned then
    if not exists(select 1 from public.user_roles ur join public.profiles p on p.id = ur.user_id
      where ur.user_id = manufacturer and ur.role = 'manufacturer' and p.active) then raise exception 'Choose an active manufacturer'; end if;
    insert into public.product_manufacturers values(target_product, manufacturer) on conflict do nothing;
  else delete from public.product_manufacturers where product_id = target_product and user_id = manufacturer;
  end if;
  insert into public.access_audit(actor_id, action, target_id, details) values
    (auth.uid(), 'manufacturer_assignment', target_product, jsonb_build_object('manufacturer', manufacturer, 'assigned', assigned));
end;
$$;

create function public.set_role_permissions(target_role public.app_role, new_permissions text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_permission('roles.manage') then raise exception 'Access denied' using errcode = '42501'; end if;
  if target_role = 'super_admin' then raise exception 'Super admin permissions are fixed'; end if;
  delete from public.role_permissions where role = target_role;
  insert into public.role_permissions(role, permission) select target_role, p from (select distinct unnest(new_permissions) p) permissions;
  insert into public.access_audit(actor_id, action, target_id, details) values
    (auth.uid(), 'role_permissions', target_role::text, jsonb_build_object('permissions', new_permissions));
end;
$$;

grant insert, delete on public.catalog_products, public.catalog_documents, public.catalog_pages, public.catalog_settings to authenticated;
grant update(data) on public.catalog_products, public.catalog_documents, public.catalog_pages to authenticated;
grant update(terms, currency, price_note) on public.catalog_settings to authenticated;
create policy products_insert on public.catalog_products for insert to authenticated with check (public.has_permission('catalog.manage'));
create policy products_update on public.catalog_products for update to authenticated using (public.can_edit_product(id)) with check (public.can_edit_product(id));
create policy products_delete on public.catalog_products for delete to authenticated using (public.has_permission('catalog.manage'));
create policy documents_write on public.catalog_documents for all to authenticated using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));
create policy pages_write on public.catalog_pages for all to authenticated using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));
create policy settings_write on public.catalog_settings for all to authenticated using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));

revoke all on function public.create_account_profile(), public.has_permission(text), public.can_edit_product(text), public.get_access_context(), public.set_user_access(uuid, public.app_role[], boolean), public.assign_manufacturer(text, uuid, boolean), public.set_role_permissions(public.app_role, text[]) from public, anon, authenticated;
grant execute on function public.has_permission(text), public.can_edit_product(text), public.get_access_context(), public.set_user_access(uuid, public.app_role[], boolean), public.assign_manufacturer(text, uuid, boolean), public.set_role_permissions(public.app_role, text[]) to authenticated;
revoke all on function public.list_accounts() from public, anon, authenticated;
grant execute on function public.list_accounts() to authenticated;
