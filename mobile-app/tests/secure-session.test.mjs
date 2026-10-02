import {test} from 'node:test';
import assert from 'node:assert/strict';
import {secureSessionStorage} from '../src/lib/secure-session.mjs';
function nativeStore(){
  const values=new Map();
  return {values,getItemAsync:async key=>values.get(key)??null,setItemAsync:async(key,value)=>{assert.ok(Buffer.byteLength(value)<=2048);values.set(key,value);},deleteItemAsync:async key=>{values.delete(key);}};
}
test('long sessions stay in secure storage and all pieces disappear on sign-out', async()=>{
  const store=nativeStore();const session=secureSessionStorage(store);const value=JSON.stringify({token:'a'.repeat(6000),name:'名字😀'.repeat(1000)});
  await session.setItem('auth-key',value);assert.equal(await session.getItem('auth-key'),value);
  await session.setItem('auth-key','new session');assert.equal(await session.getItem('auth-key'),'new session');assert.equal(store.values.size,2);
  await session.removeItem('auth-key');assert.equal(store.values.size,0);assert.equal(await session.getItem('auth-key'),null);
});
test('a failed session refresh preserves the previous secure session',async()=>{
  const store=nativeStore();const session=secureSessionStorage(store);await session.setItem('auth-key','original');
  const write=store.setItemAsync;let writes=0;
  store.setItemAsync=async(...args)=>{if(++writes===2)throw new Error('Device storage failed');return write(...args);};
  await assert.rejects(session.setItem('auth-key','b'.repeat(1000)),/Device storage failed/);
  assert.equal(await session.getItem('auth-key'),'original');assert.equal(store.values.size,2);
});
