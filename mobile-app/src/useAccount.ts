import {useEffect,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {supabase} from './lib/supabase';
import type {AccessContext} from './access';

export function useAccount() {
  const [session,setSession]=useState<Session|null>(null);const [access,setAccess]=useState<AccessContext|null>(null);
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;let generation=0;
    const load=async(next:Session|null)=>{
      const current=++generation;
      if(!active)return;setSession(next);setAccess(null);setLoading(true);setError('');
      try{
        if(next){const {data,error}=await supabase.rpc('get_access_context');if(error)throw error;if(!data)throw new Error('Your account permissions are unavailable.');if(active&&current===generation)setAccess(data as AccessContext);}
      }catch(error){if(active&&current===generation)setError(error instanceof Error?error.message:'Your account is unavailable.');}
      finally{if(active&&current===generation)setLoading(false);}
    };
    void supabase.auth.getSession().then(({data,error})=>{if(error)throw error;return load(data.session);}).catch(()=>{if(active){setLoading(false);setError('Your saved session is unavailable. Sign in again.');}});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setTimeout(()=>{if(active)void load(next);},0);});
    const timer=setInterval(()=>{void supabase.auth.getSession().then(({data})=>{if(active)void load(data.session);});},60000);
    return()=>{active=false;generation++;subscription.unsubscribe();clearInterval(timer);};
  },[]);
  return {session,access,loading,error};
}
