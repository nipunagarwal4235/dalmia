'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '../../../lib/supabase/client';
export default function MobileConfirmation() {
  const router=useRouter();const [message,setMessage]=useState('Confirming your account…');
  useEffect(()=>{
    const hash=new URLSearchParams(location.hash.slice(1));
    const access_token=hash.get('access_token');const refresh_token=hash.get('refresh_token');
    const recovery=hash.get('type')==='recovery';
    history.replaceState(null,'',location.pathname);
    if(!access_token||!refresh_token){setMessage('This link expired. Request a new link from the app.');return;}
    void createClient().auth.setSession({access_token,refresh_token}).then(({error})=>{
      if(error){setMessage('This link expired. Request a new link from the app.');return;}
      router.replace(recovery?'/account/password':'/account');router.refresh();
    });
  },[router]);
  return <section className="auth-panel"><h1>Confirm your account</h1><p role="status">{message}</p></section>;
}
