'use client';
import {useState, type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '../lib/supabase/client';

export function AuthForm({recovery=false}:{recovery?:boolean}) {
  const router = useRouter();
  const [mode,setMode] = useState<'login'|'signup'|'reset'>(recovery?'reset':'login');
  const [email,setEmail] = useState(''); const [password,setPassword] = useState('');
  const [name,setName] = useState(''); const [message,setMessage] = useState(''); const [busy,setBusy] = useState(false);
  async function submit(event:FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const client = createClient();
      if (recovery) {
        const {error} = await client.auth.updateUser({password});
        if (error) throw error;
        router.replace('/account'); router.refresh();
      } else if (mode==='reset') {
        const {error} = await client.auth.resetPasswordForEmail(email.trim(), {redirectTo:`${location.origin}/auth/callback?next=/account/password`});
        if (error) throw error;
        setMessage('If an account exists, you will receive an email with a password reset link.');
      } else if (mode==='signup') {
        const {data,error} = await client.auth.signUp({email:email.trim(),password,options:{data:{display_name:name.trim()},emailRedirectTo:`${location.origin}/auth/callback`}});
        if (error) throw error;
        if (data.session) {router.replace('/account');router.refresh();}
        else setMessage('Open the confirmation link in your email, then sign in.');
      } else {
        const {error} = await client.auth.signInWithPassword({email:email.trim(),password});
        if (error) throw error;
        router.replace('/account');router.refresh();
      }
    } catch (error) {setMessage(error instanceof Error?error.message:'Sign-in is unavailable. Try again.');}
    finally {setBusy(false);}
  }
  return <section className="auth-panel"><span className="card-category">DALMIA ACCOUNT</span><h1>{recovery?'Set a new password':mode==='signup'?'Create your account':mode==='reset'?'Reset your password':'Welcome back'}</h1>
    <p>{mode==='signup'?'New accounts start as customers. An administrator assigns business access.':'Use the same account on the website and mobile app.'}</p>
    <form onSubmit={submit} className="account-form">
      {mode==='signup'&&<label>Name<input required maxLength={120} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>}
      {!recovery&&<label>Email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>}
      {(mode!=='reset'||recovery)&&<label>Password<input aria-label="Password" type="password" required minLength={mode==='signup'||recovery?12:1} autoComplete={mode==='signup'||recovery?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/>{(mode==='signup'||recovery)&&<small>Use at least 12 characters.</small>}</label>}
      {!!message&&<p role="status">{message}</p>}
      <button className="button primary" disabled={busy}>{busy?'Please wait…':recovery?'Save password':mode==='signup'?'Create account':mode==='reset'?'Send reset link':'Sign in'}</button>
    </form>
    {!recovery&&<div className="account-actions">{mode!=='login'&&<button className="text-button" onClick={()=>{setMode('login');setMessage('');}}>Sign in</button>}{mode!=='signup'&&<button className="text-button" onClick={()=>{setMode('signup');setMessage('');}}>Create account</button>}{mode!=='reset'&&<button className="text-button" onClick={()=>{setMode('reset');setMessage('');}}>Forgot password?</button>}</div>}
  </section>;
}
