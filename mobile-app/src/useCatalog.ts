import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bundled from './data/catalog.json';
import {fetchCatalog, isCatalog} from './lib/catalog-api.mjs';
import type {MobileCatalog} from './catalog';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const cacheKey = `dalmia-catalog-v1:${url || 'bundled'}`;

export function useCatalog() {
  const [catalog, setCatalog] = useState<MobileCatalog>(bundled as MobileCatalog);
  useEffect(() => {
    if (!url && !key) return;
    let active = true;
    let refreshing = false;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const fresh = await fetchCatalog({url, key, includePages: false}) as MobileCatalog | null;
        if (fresh && active) {
          setCatalog(fresh);
          await AsyncStorage.setItem(cacheKey, JSON.stringify(fresh));
        }
      } catch {
        // Keep the last usable catalog when the device is offline.
      } finally {
        refreshing = false;
      }
    };
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(cacheKey);
        const cached: unknown = raw ? JSON.parse(raw) : null;
        if (active && isCatalog(cached)) setCatalog(cached as MobileCatalog);
      } catch {
        // The bundled catalog remains available if local storage fails.
      }
      if (active) await refresh();
    })();
    const timer = setInterval(() => {if (active) void refresh();}, 60000);
    return () => {active = false; clearInterval(timer);};
  }, []);
  return catalog;
}
