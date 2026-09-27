import source from '../data/catalog.json';
import {cache} from 'react';
import {fetchCatalog} from './catalog-api.mjs';
import type { Catalog } from './types';
export const getCatalog = cache(async (): Promise<Catalog> => {
  const catalog = await fetchCatalog({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return (catalog ?? source) as Catalog;
});
