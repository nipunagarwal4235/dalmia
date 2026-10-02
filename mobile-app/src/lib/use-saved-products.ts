'use client';
import {useEffect,useRef,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createSavedStore} from './saved-store.mjs';
type Storage={getItem:(key:string)=>Promise<string|null>;setItem:(key:string,value:string)=>Promise<void>};
export function useSavedProducts(client:SupabaseClient,storage:Storage,guestKey:string) {
  const [state,setState]=useState({saved:new Set<string>(),ready:false,error:'',signedIn:false});
  const store=useRef<ReturnType<typeof createSavedStore>|null>(null);
  useEffect(()=>{
    const current=createSavedStore({client,storage,guestKey,onChange:setState});store.current=current;
    let active=true;let authGeneration=0;
    const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{
      authGeneration++;setTimeout(()=>{if(active)void current.changeUser(session?.user.id||null);},0);
    });
    const initial=authGeneration;
    void client.auth.getSession().then(({data})=>{if(active&&initial===authGeneration)void current.changeUser(data.session?.user.id||null);}).catch(()=>{if(active&&initial===authGeneration)void current.changeUser(null);});
    const timer=setInterval(()=>void current.sync(),15000);
    return()=>{active=false;clearInterval(timer);subscription.unsubscribe();current.dispose();};
  },[client,storage,guestKey]);
  return {...state,setSaved:(id:string,selected:boolean)=>void store.current?.set(id,selected),toggle:(id:string)=>void store.current?.set(id,!store.current.getState().saved.has(id)),importGuest:()=>void store.current?.importGuest()};
}
