-- Public catalog files use the same read access as the public catalog records.
-- No client write policies are granted. Uploads use the authenticated CLI.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-media',
  'catalog-media',
  true,
  20971520,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
