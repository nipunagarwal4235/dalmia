-- App Store and Google Play require apps with sign-up to let people delete their account.
-- Deleting the auth user cascades to the profile, roles, assignments, and saved products.
create function public.delete_own_account() returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in to delete your account' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(904281200);
  if exists(select 1 from public.user_roles where user_id = me and role = 'super_admin') and not exists (
    select 1 from public.profiles p join public.user_roles ur on ur.user_id = p.id
    where p.active and ur.role = 'super_admin' and p.id <> me
  ) then raise exception 'Keep at least one active super admin'; end if;
  insert into public.access_audit(actor_id, action, target_id, details) values (me, 'account_deleted', me::text, '{}');
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_own_account() from public, anon, authenticated;
grant execute on function public.delete_own_account() to authenticated;
