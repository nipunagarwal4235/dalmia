import { Suspense } from 'react';
import { Library } from '../components/library';
import { catalog } from '../lib/data';
export default function Home(){return <Suspense fallback={<p className="loading">Loading the product library…</p>}><Library catalog={catalog} view="products"/></Suspense>;}
