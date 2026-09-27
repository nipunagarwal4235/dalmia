-- Preserve each source record, including units, missing prices and provenance.
create table public.catalog_products (
  id text primary key,
  position integer not null unique check (position >= 0),
  data jsonb not null,
  model text generated always as (data ->> 'model') stored,
  category text generated always as (data ->> 'category') stored,
  updated_at timestamptz not null default now(),
  constraint product_id_matches check (data ->> 'id' is not null and data ->> 'id' = id),
  constraint product_shape check (
    data ?& array['model', 'category', 'variants', 'images'] and
    jsonb_typeof(data -> 'model') = 'string' and
    jsonb_typeof(data -> 'category') = 'string' and
    jsonb_typeof(data -> 'variants') = 'array' and
    jsonb_typeof(data -> 'images') = 'array'
  )
);
create index catalog_products_category_idx on public.catalog_products (category);
create index catalog_products_model_idx on public.catalog_products (model);

create table public.catalog_documents (
  id text primary key,
  position integer not null unique check (position >= 0),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint document_id_matches check (data ->> 'id' is not null and data ->> 'id' = id)
);

create table public.catalog_pages (
  document_id text not null references public.catalog_documents (id),
  page integer not null check (page > 0),
  position integer not null unique check (position >= 0),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (document_id, page),
  constraint page_source_matches check (
    data ->> 'document' is not null and data ->> 'document' = document_id and
    data ->> 'page' is not null and (data ->> 'page')::integer = page
  )
);

create table public.catalog_settings (
  id boolean primary key default true check (id),
  terms text not null,
  currency text,
  price_note text not null,
  updated_at timestamptz not null default now()
);

create function public.catalog_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger catalog_products_updated before update on public.catalog_products
for each row execute function public.catalog_touch_updated_at();
create trigger catalog_documents_updated before update on public.catalog_documents
for each row execute function public.catalog_touch_updated_at();
create trigger catalog_pages_updated before update on public.catalog_pages
for each row execute function public.catalog_touch_updated_at();
create trigger catalog_settings_updated before update on public.catalog_settings
for each row execute function public.catalog_touch_updated_at();

alter table public.catalog_products enable row level security;
alter table public.catalog_documents enable row level security;
alter table public.catalog_pages enable row level security;
alter table public.catalog_settings enable row level security;

revoke all on public.catalog_products, public.catalog_documents, public.catalog_pages, public.catalog_settings from public, anon, authenticated;
grant select on public.catalog_products, public.catalog_documents, public.catalog_pages, public.catalog_settings to anon, authenticated;
grant all on public.catalog_products, public.catalog_documents, public.catalog_pages, public.catalog_settings to service_role;

create policy catalog_products_read on public.catalog_products for select to anon, authenticated using (true);
create policy catalog_documents_read on public.catalog_documents for select to anon, authenticated using (true);
create policy catalog_pages_read on public.catalog_pages for select to anon, authenticated using (true);
create policy catalog_settings_read on public.catalog_settings for select to anon, authenticated using (true);

-- One consistent snapshot avoids pagination limits and partial catalog updates.
-- Mobile excludes OCR pages and product OCR text to reduce download size.
create function public.get_catalog(include_pages boolean default true)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'products', coalesce((select jsonb_agg(
      case when include_pages then data else data - 'catalogText' end order by position
    ) from public.catalog_products), '[]'::jsonb),
    'documents', coalesce((select jsonb_agg(data order by position) from public.catalog_documents), '[]'::jsonb),
    'pages', case when include_pages then
      coalesce((select jsonb_agg(data order by position) from public.catalog_pages), '[]'::jsonb)
      else '[]'::jsonb end,
    'terms', terms,
    'currency', currency,
    'priceNote', price_note
  ) from public.catalog_settings where id = true;
$$;

revoke all on function public.get_catalog(boolean) from public;
grant execute on function public.get_catalog(boolean) to anon, authenticated, service_role;
revoke all on function public.catalog_touch_updated_at() from public, anon, authenticated;
