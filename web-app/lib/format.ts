import type { SourceDocument } from './types';
export const number = (value:number) => new Intl.NumberFormat('en-IN').format(value);
export const asset = (path:string) => '/'+path.replace(/^\/+/, '');
export function documentURL(documents:SourceDocument[], id:string, page?:number) {
  const document=documents.find(d=>d.id===id);
  if(!document)throw new Error(`Unknown document: ${id}`);
  return '/documents/'+encodeURIComponent(document.file)+(page?'#page='+page:'');
}

export const modelSlug=(id:string)=>id.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const modelPath=(id:string)=>'/models/'+modelSlug(id);
