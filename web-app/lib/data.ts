import source from '../data/catalog.json';
import models from './models.json';
import {cache} from 'react';
import {fetchCatalog} from './catalog-api.mjs';
import type { Catalog } from './types';
import {requireAccount} from './supabase/access';
export const getCatalog = cache(async (): Promise<Catalog> => {
  await requireAccount('catalog.read');
  const catalog = await fetchCatalog({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  const result = (catalog ?? source) as Catalog;
  // Link each product to its GLB in public/models by slug, so 3D views need no database field.
  const files = new Set(models);
  return {...result, products: result.products.map(p => {
    const slug = p.id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return files.has(slug) ? {...p, model3d: `models/${slug}.glb`} : p;
  })};
});
