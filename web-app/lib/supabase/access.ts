import {cache} from 'react';
import {redirect} from 'next/navigation';
import {createClient} from './server';
import {can, type AccessContext} from '../access';

export const getAccount = cache(async () => {
  const client = await createClient();
  const {data:{user}, error} = await client.auth.getUser();
  if (error || !user) return null;
  const {data, error:accessError} = await client.rpc('get_access_context');
  if (accessError || !data) throw new Error('Your account permissions are unavailable. Try again.');
  return {user, access:data as AccessContext};
});
export async function requireAccount(permission?:string) {
  const account = await getAccount();
  if (!account) redirect('/login');
  if (!account.access.active || (permission && !can(account.access, permission))) redirect('/account?denied=1');
  return account;
}
