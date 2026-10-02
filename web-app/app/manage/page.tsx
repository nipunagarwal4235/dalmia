import {redirect} from 'next/navigation';
import {requireAccount} from '../../lib/supabase/access';
import {can} from '../../lib/access';
import {createClient} from '../../lib/supabase/server';
import {ProductEditor} from '../../components/product-editor';
import type {Product} from '../../lib/types';
export default async function ManagePage() {
  const {access}=await requireAccount();const client=await createClient();
  if(!can(access,'catalog.manage')&&!can(access,'catalog.assigned.manage'))redirect('/account?denied=1');
  let query=client.from('catalog_products').select('id,data,updated_at').order('position');
  if(!can(access,'catalog.manage')) {
    const {data,error}=await client.from('product_manufacturers').select('product_id').eq('user_id',access.id);
    if(error)throw new Error('Product assignments are unavailable.');
    query=query.in('id',data.map(row=>row.product_id));
  }
  const {data,error}=await query;if(error)throw new Error('Products are unavailable.');
  return <ProductEditor canManage={can(access,'catalog.manage')} products={data as {id:string;data:Product;updated_at:string}[]}/>;
}
