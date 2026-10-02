create table public.saved_products (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null references public.catalog_products(id) on delete cascade,
  primary key (user_id, product_id)
);
alter table public.saved_products enable row level security;
revoke all on public.saved_products from public, anon, authenticated;
grant select, insert, delete on public.saved_products to authenticated;
grant all on public.saved_products to service_role;
create policy saved_read on public.saved_products for select to authenticated using (user_id = auth.uid());
create policy saved_insert on public.saved_products for insert to authenticated with check (user_id = auth.uid() and public.has_permission('profile.update'));
create policy saved_delete on public.saved_products for delete to authenticated using (user_id = auth.uid() and public.has_permission('profile.update'));

-- A single statement returns all saved IDs without the REST row limit.
create function public.get_saved_products() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(product_id order by product_id), '[]'::jsonb) from public.saved_products where user_id = auth.uid();
$$;
create function public.set_saved_product(product text, saved boolean) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.has_permission('profile.update') then raise exception 'Your account cannot change saved products' using errcode = '42501'; end if;
  if saved then
    insert into public.saved_products values (auth.uid(), product) on conflict do nothing;
  else delete from public.saved_products where user_id = auth.uid() and product_id = product;
  end if;
end;
$$;
revoke all on function public.get_saved_products(), public.set_saved_product(text, boolean) from public, anon;
grant execute on function public.get_saved_products(), public.set_saved_product(text, boolean) to authenticated;

create function public.prepare_catalog_product() returns trigger
language plpgsql set search_path = '' as $$
declare variant jsonb; price jsonb; image jsonb; prices numeric[] := '{}'; sizes text[]; item record;
begin
  if new.data->>'model' is null or length(trim(new.data->>'model')) not between 1 and 120
    or new.data->>'category' is null or length(trim(new.data->>'category')) not between 1 and 120 then
    raise exception 'Enter a model and category with at most 120 characters';
  end if;
  if jsonb_typeof(new.data->'variants') is distinct from 'array' or jsonb_typeof(new.data->'images') is distinct from 'array'
    or jsonb_typeof(new.data->'specs') is distinct from 'array' or jsonb_typeof(new.data->'notes') is distinct from 'array'
    or jsonb_typeof(new.data->'sources') is distinct from 'array' or jsonb_typeof(new.data->'sizes') is distinct from 'array' then
    raise exception 'Invalid product fields';
  end if;
  for variant in select value from jsonb_array_elements(new.data->'variants') loop
    if jsonb_typeof(variant->'prices') is distinct from 'object' or jsonb_typeof(variant->'finish') is distinct from 'string'
      or jsonb_typeof(variant->'unit') is distinct from 'string' or jsonb_typeof(variant->'source') is distinct from 'object' then
      raise exception 'Invalid finish or price fields';
    end if;
    for item in select * from jsonb_each(variant->'prices') loop
      price := item.value;
      if length(trim(item.key)) = 0 then raise exception 'Enter a size for every price'; end if;
      if price <> 'null'::jsonb then
        if jsonb_typeof(price) <> 'number' then raise exception 'Prices must be numbers or blank'; end if;
        if price::numeric < 0 or price::numeric > 1000000000 then raise exception 'Prices must be between zero and one billion'; end if;
        prices := array_append(prices, price::numeric);
      end if;
    end loop;
  end loop;
  for image in select value from jsonb_array_elements(new.data->'images') loop
    if coalesce(image->>'src', '') !~ '^assets/products/[a-zA-Z0-9_./ ()-]+\.(png|jpg|jpeg)$'
      or position('..' in image->>'src') > 0 then raise exception 'Choose an image from catalog storage'; end if;
  end loop;
  select array_agg(distinct size order by size) into sizes from (
    select jsonb_array_elements_text(new.data->'sizes') size
    union select jsonb_object_keys(value->'prices') from jsonb_array_elements(new.data->'variants')
  ) sizes_input where length(trim(size)) > 0;
  new.data := new.data || jsonb_build_object('minPrice', (select min(p) from unnest(prices) p),
    'maxPrice', (select max(p) from unnest(prices) p), 'sizes', coalesce(to_jsonb(sizes), '[]'::jsonb),
    'searchText', concat_ws(' ', new.data->>'model', new.data->>'category', new.data->>'specs', new.data->>'notes',
      new.data->>'variants', new.data->>'sizes', new.data->>'catalogText'));
  return new;
end;
$$;
create trigger prepare_catalog_product before insert or update on public.catalog_products
for each row execute function public.prepare_catalog_product();

create function public.create_catalog_product(product jsonb) returns text
language plpgsql security invoker set search_path = '' as $$
declare next_position integer;
begin
  if not public.has_permission('catalog.manage') then raise exception 'Access denied' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(904281201);
  select coalesce(max(position), -1) + 1 into next_position from public.catalog_products;
  insert into public.catalog_products(id, position, data) values (product->>'id', next_position, product);
  return product->>'id';
end;
$$;
revoke all on function public.prepare_catalog_product(), public.create_catalog_product(jsonb) from public, anon, authenticated;
grant execute on function public.create_catalog_product(jsonb) to authenticated;
