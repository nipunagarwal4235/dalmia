-- Only a trusted operator can promote the first confirmed account.
create function public.bootstrap_super_admin(target_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(904281200);
  if exists(select 1 from public.user_roles where role = 'super_admin') then
    raise exception 'A super admin already exists. Use account management for further role changes.';
  end if;
  if not exists(select 1 from auth.users where id = target_user and email_confirmed_at is not null) then
    raise exception 'The first super admin must confirm their email address.';
  end if;
  delete from public.user_roles where user_id = target_user;
  insert into public.user_roles(user_id, role) values(target_user, 'super_admin');
  update public.profiles set active = true where id = target_user;
  insert into public.access_audit(actor_id, action, target_id, details)
    values(null, 'bootstrap_super_admin', target_user::text, '{"role":"super_admin"}'::jsonb);
end;
$$;
revoke all on function public.bootstrap_super_admin(uuid) from public, anon, authenticated;
grant execute on function public.bootstrap_super_admin(uuid) to service_role;
