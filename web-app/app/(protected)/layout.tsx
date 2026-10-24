import {redirect} from 'next/navigation';
import {Workspace} from '../../components/workspace';
import {getAccount} from '../../lib/supabase/access';
import {getCatalog} from '../../lib/data';
import {can} from '../../lib/access';

export default async function ProtectedLayout({children}:{children:React.ReactNode}) {
  const account = await getAccount();
  if (!account) redirect('/login');
  const catalog = can(account.access, 'catalog.read') ? await getCatalog() : null;
  return <Workspace total={catalog?.products.length ?? 0} documentCount={catalog?.documents.length ?? 0}>{children}</Workspace>;
}
