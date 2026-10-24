import {redirect} from 'next/navigation';
import {getAccount} from '../../../lib/supabase/access';
import {AccountPanel} from '../../../components/account-panel';
export default async function AccountPage(){const account=await getAccount();if(!account)redirect('/login');return <AccountPanel access={account.access} email={account.user.email||''}/>;}
