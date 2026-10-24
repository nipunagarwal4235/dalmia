'use client';
import {useState, type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {createClient} from '../lib/supabase/client';
import {can, roleLabel, type AccessContext} from '../lib/access';

export function AccountPanel({access,email}:{access:AccessContext;email:string}) {
  const [name,setName] = useState(access.displayName); const [company,setCompany] = useState(access.company);
  const [message,setMessage] = useState(''); const [busy,setBusy] = useState(false); const router=useRouter();
  async function save(event:FormEvent) {
    event.preventDefault();setBusy(true);
    try {
      const {error,data} = await createClient().from('profiles').update({display_name:name.trim(),company:company.trim()}).eq('id',access.id).select('id');
      if (error) throw error;
      setMessage(data.length?'Profile saved.':'Your account cannot edit this profile.');router.refresh();
    } catch(error){setMessage(error instanceof Error?error.message:'Profile save failed.');} finally{setBusy(false);}
  }
  async function signOut() {
    const {error} = await createClient().auth.signOut();
    if(error){setMessage(error.message);return;}
    router.replace('/login');router.refresh();
  }
  async function deleteAccount() {
    if(!confirm('Delete your account? Your profile and saved products are removed permanently.'))return;
    setBusy(true);
    const client=createClient();const {error} = await client.rpc('delete_own_account');
    if(error){setMessage(error.message);setBusy(false);return;}
    await client.auth.signOut({scope:'local'});
    router.replace('/login');router.refresh();
  }
  return <section className="auth-panel"><span className="card-category">YOUR ACCOUNT</span><h1>{access.displayName||'Your account'}</h1><p>{email}</p><p>{access.roles.map(roleLabel).join(' · ')}</p>
    {!access.active&&<p role="alert">Your account is disabled. Contact your administrator.</p>}
    <form className="account-form" onSubmit={save}><label>Name<input value={name} onChange={e=>setName(e.target.value)} maxLength={120}/></label><label>Company<input value={company} onChange={e=>setCompany(e.target.value)} maxLength={160}/></label>
    {!!message&&<p role="status">{message}</p>}<button className="button" disabled={busy||!can(access,'profile.update')}>Save profile</button></form>
    <div className="account-actions">{can(access,'users.manage')&&<Link className="button" href="/admin">Manage access</Link>}{(can(access,'catalog.manage')||can(access,'catalog.assigned.manage'))&&<Link className="button" href="/manage">Manage products</Link>}<Link className="button" href="/account/password">Change password</Link><button className="button" onClick={signOut}>Sign out</button><button className="button" disabled={busy} onClick={deleteAccount}>Delete account</button></div>
  </section>;
}
