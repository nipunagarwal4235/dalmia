import { Suspense } from 'react';
import { Library } from '../../components/library';
import { catalog } from '../../lib/data';
export const metadata={title:'Source documents'};
export default function Documents(){return <Suspense fallback={<p className="loading">Loading documents…</p>}><Library catalog={catalog} view="documents"/></Suspense>;}
