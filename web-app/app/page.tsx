import { Suspense } from 'react';
import { Library } from '../components/library';
import { getCatalog } from '../lib/data';
export default async function Home(){const catalog=await getCatalog();return <Suspense fallback={<p className="loading">Loading the product library…</p>}><Library catalog={catalog} view="products"/></Suspense>;}
