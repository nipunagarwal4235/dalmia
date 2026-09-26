import { Suspense } from 'react';
import { Library } from '../../components/library';
import { catalog } from '../../lib/data';
export const metadata={title:'Your shortlist'};
export default function Shortlist(){return <Suspense fallback={<p className="loading">Loading your shortlist…</p>}><Library catalog={catalog} view="saved"/></Suspense>;}
