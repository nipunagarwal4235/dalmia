'use client';
import {useState, type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {createClient} from '../lib/supabase/client';

export function AuthForm({recovery=false, mode='login', next='/', expired=false}:{recovery?:boolean;mode?:'login'|'signup'|'reset';next?:string;expired?:boolean}) {
  const router = useRouter();
  const [email,setEmail] = useState(''); const [password,setPassword] = useState('');
  const [name,setName] = useState(''); const [message,setMessage] = useState(expired?'This link expired or is invalid. Request a new reset link or sign in.':''); const [busy,setBusy] = useState(false);
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
        if (data.session) {router.replace(next);router.refresh();}
        else setMessage('Open the confirmation link in your email, then sign in.');
      } else {
        const {error} = await client.auth.signInWithPassword({email:email.trim(),password});
        if (error) throw error;
        router.replace(next);router.refresh();
      }
    } catch (error) {setMessage(error instanceof Error?error.message:'Sign-in is unavailable. Try again.');}
    finally {setBusy(false);}
  }
  return <section className="auth-panel"><span className="card-category">DALMIA ACCOUNT</span><h1>{recovery?'Set a new password':mode==='signup'?'Create your account':mode==='reset'?'Reset your password':'Welcome back'}</h1>
    <p>{recovery?'Choose a new password for your account.':mode==='signup'?'New accounts start as customers. An administrator assigns business access.':mode==='reset'?'Enter your email to receive a password reset link.':'Sign in to access products, prices, and source documents.'}</p>
    <form onSubmit={submit} className="account-form">
      {mode==='signup'&&<label>Name<input required maxLength={120} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>}
      {!recovery&&<label>Email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>}
      {(mode!=='reset'||recovery)&&<label>Password<input aria-label="Password" type="password" required minLength={mode==='signup'||recovery?12:1} autoComplete={mode==='signup'||recovery?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/>{(mode==='signup'||recovery)&&<small>Use at least 12 characters.</small>}</label>}
      {!!message&&<p role="status">{message}</p>}
      <button className="button primary" disabled={busy}>{busy?'Please wait…':recovery?'Save password':mode==='signup'?'Create account':mode==='reset'?'Send reset link':'Sign in'}</button>
    </form>
    {!recovery&&<div className="account-actions">{mode!=='login'&&<Link className="text-button" href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>}{mode!=='signup'&&<Link className="text-button" href={`/signup?next=${encodeURIComponent(next)}`}>Create account</Link>}{mode!=='reset'&&<Link className="text-button" href="/forgot-password">Forgot password?</Link>}</div>}
  </section>;
}
