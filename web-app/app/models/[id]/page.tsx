import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetails } from '../../../components/product-details';
import { getCatalog } from '../../../lib/data';
import { modelSlug } from '../../../lib/format';
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const catalog=await getCatalog();const {id}=await params;const product=catalog.products.find(p=>modelSlug(p.id)===id);return {title:product?`${product.model} · ${product.category}`:'Model not found'};}
export default async function ModelPage({params}:{params:Promise<{id:string}>}){const catalog=await getCatalog();const {id}=await params;const product=catalog.products.find(p=>modelSlug(p.id)===id);if(!product)notFound();return <ProductDetails product={product} documents={catalog.documents} priceNote={catalog.priceNote}/>;}
