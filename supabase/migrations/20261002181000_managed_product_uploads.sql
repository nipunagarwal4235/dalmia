-- Uploads use new filenames. Existing source files cannot be overwritten or deleted.
create policy managed_product_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'catalog-media' and
  name ~ '^assets/products/[a-z0-9-]+/[a-f0-9-]+\.(png|jpg|jpeg)$' and
  public.can_edit_product((storage.foldername(name))[3])
);
