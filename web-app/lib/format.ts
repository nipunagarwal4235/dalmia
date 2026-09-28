import type { SourceDocument } from './types';
import {catalogMediaURL, catalogDocumentURL} from './media.mjs';
export const number = (value:number) => new Intl.NumberFormat('en-IN').format(value);
export const asset = (path:string) => catalogMediaURL(path, process.env.NEXT_PUBLIC_SUPABASE_URL);
export function documentURL(documents:SourceDocument[], id:string, page?:number) {
  const document=documents.find(d=>d.id===id);
  if(!document)throw new Error(`Unknown document: ${id}`);
  return catalogDocumentURL(document, page, process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export const modelSlug=(id:string)=>id.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const modelPath=(id:string)=>'/models/'+modelSlug(id);
