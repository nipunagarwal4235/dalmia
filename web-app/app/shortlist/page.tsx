import { Suspense } from 'react';
import { Library } from '../../components/library';
import { getCatalog } from '../../lib/data';
export const metadata={title:'Your shortlist'};
export default async function Shortlist(){const catalog=await getCatalog();return <Suspense fallback={<p className="loading">Loading your shortlist…</p>}><Library catalog={catalog} view="saved"/></Suspense>;}
