import 'react-native-url-polyfill/auto';
import {AppState, Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {createClient, processLock} from '@supabase/supabase-js';
import {secureSessionStorage} from './secure-session.mjs';

export const supabase=createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!,process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
  auth:{...(Platform.OS!=='web'?{storage:secureSessionStorage(SecureStore)}:{}),autoRefreshToken:true,persistSession:true,detectSessionInUrl:false,lock:processLock},
});
if(Platform.OS!=='web')AppState.addEventListener('change',state=>{
  if(state==='active')supabase.auth.startAutoRefresh();else supabase.auth.stopAutoRefresh();
});
