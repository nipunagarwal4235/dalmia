import type { Metadata } from 'next';
import { Playground } from '../../../components/playground';
import { getCatalog } from '../../../lib/data';
export const metadata: Metadata = { title: 'Fitting playground' };
export default async function PlaygroundPage({searchParams}:{searchParams:Promise<{add?:string;design?:string}>}){
  const [catalog,{add,design}]=await Promise.all([getCatalog(),searchParams]);
  return <><h1 className="sr-only">Fitting playground</h1><Playground products={catalog.products.filter(p=>p.model3d)} priceNote={catalog.priceNote} add={add} shared={typeof design==='string'?design.slice(0,20000):undefined}/></>;
}
