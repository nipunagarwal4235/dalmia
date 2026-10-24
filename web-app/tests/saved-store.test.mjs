import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSavedStore} from '../lib/saved-store.mjs';
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
function setup(){
 const files=new Map(),remote=new Map();let user='a',offline=false;
 const client={auth:{getSession:async()=>({data:{session:{user:{id:user}}}})},rpc:async(name,args)=>{
  if(offline)return {error:new Error('offline')};
  const ids=remote.get(user)||new Set();remote.set(user,ids);
  if(name==='set_saved_product'){args.saved?ids.add(args.product):ids.delete(args.product);return {error:null};}
  return {data:[...ids],error:null};
 }};
 const storage={getItem:async key=>files.get(key)||null,setItem:async(key,value)=>{files.set(key,value);}};
 const make=()=>createSavedStore({client,storage,guestKey:'guest',onChange:()=>{}});
 return {make,files,remote,setUser:value=>{user=value;},offline:value=>{offline=value;}};
}
test('offline changes survive restart and sync removals without restoring remote saves',async()=>{
 const h=setup();h.remote.set('a',new Set(['old']));let store=h.make();await store.changeUser('a');await tick();
 h.offline(true);await store.set('old',false);await store.set('new',true);await tick();store.dispose();
 store=h.make();await store.changeUser('a');await tick();assert.deepEqual([...store.getState().saved],['new']);
 h.offline(false);await store.sync();assert.deepEqual([...h.remote.get('a')],['new']);store.dispose();
});
test('switching accounts and signing out never exposes another account collection',async()=>{
 const h=setup();h.files.set('guest',JSON.stringify(['guest-product']));h.remote.set('a',new Set(['a-only']));h.remote.set('b',new Set(['b-only']));
 const store=h.make();await store.changeUser('a');await tick();assert.deepEqual([...store.getState().saved],['a-only']);
 h.setUser('b');await store.changeUser('b');await tick();assert.deepEqual([...store.getState().saved],['b-only']);
 await store.changeUser(null);assert.deepEqual([...store.getState().saved],['guest-product']);store.dispose();
});
test('device imports are explicit and preserve the existing cloud collection',async()=>{
 const h=setup();h.files.set('guest',JSON.stringify(['device-only']));h.remote.set('a',new Set(['cloud-only']));const store=h.make();
 await store.changeUser('a');await tick();await store.importGuest();await tick();await store.sync();assert.deepEqual([...h.remote.get('a')].sort(),['cloud-only','device-only']);store.dispose();
});
test('an in-flight load cannot replace another account collection',async()=>{
 let release;const wait=new Promise(resolve=>{release=resolve;});let user='a';
 const client={auth:{getSession:async()=>({data:{session:{user:{id:user}}}})},rpc:async()=>{const owner=user;if(owner==='a')await wait;return {data:[owner],error:null};}};
 const store=createSavedStore({client,storage:{getItem:async()=>null,setItem:async()=>{}},guestKey:'guest',onChange:()=>{}});
 await store.changeUser('a');await tick();user='b';await store.changeUser('b');await tick();release();await tick();assert.deepEqual([...store.getState().saved],['b']);store.dispose();
});
