import {requireAccount} from '../../../lib/supabase/access';
import {createClient} from '../../../lib/supabase/server';
import {AccessManager} from '../../../components/access-manager';
export default async function AdminPage() {
  const {access}=await requireAccount('users.manage'); const client=await createClient();
  const results=await Promise.all([
    client.rpc('list_accounts'), client.from('user_roles').select('*'),
    client.from('permissions').select('*'), client.from('role_permissions').select('*'),
    client.from('catalog_products').select('id,model,category').order('position'),
    client.from('product_manufacturers').select('*'),
    client.from('access_audit').select('*').order('created_at',{ascending:false}).limit(30),
  ]);
  if(results.some(result=>result.error))throw new Error('Account management is unavailable. Try again.');
  return <AccessManager access={access} profiles={results[0].data!} memberships={results[1].data!} permissions={results[2].data!} grants={results[3].data!} products={results[4].data!} assignments={results[5].data!} audit={results[6].data!}/>;
}
