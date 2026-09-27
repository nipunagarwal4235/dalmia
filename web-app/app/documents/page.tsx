import { Suspense } from 'react';
import { Library } from '../../components/library';
import { getCatalog } from '../../lib/data';
export const metadata={title:'Source documents'};
export default async function Documents(){const catalog=await getCatalog();return <Suspense fallback={<p className="loading">Loading documents…</p>}><Library catalog={catalog} view="documents"/></Suspense>;}
