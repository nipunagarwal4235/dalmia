import catalog from './data/catalog.json';
import {catalogMediaURL, catalogDocumentURL} from './lib/media.mjs';
import type {Product, SourceDocument} from './types';
export type MobileProduct=Omit<Product,'catalogText'>;
export type MobileCatalog={products:MobileProduct[];documents:SourceDocument[];priceNote:string};
export const products=catalog.products as MobileProduct[];
export const documents=catalog.documents;
export const priceNote=catalog.priceNote;
export const assetURL=(path:string)=>catalogMediaURL(path,process.env.EXPO_PUBLIC_SUPABASE_URL);
export const sourceURL=(id:string,page:number,sourceDocuments:SourceDocument[]=documents)=>{
 const document=sourceDocuments.find(item=>item.id===id);
 return document?catalogDocumentURL(document,page,process.env.EXPO_PUBLIC_SUPABASE_URL):null;
};

export const productImage=(product:MobileProduct)=>{
 const image=product.images[0];
 if(!image)return undefined;
 return {uri:assetURL(image.src)};
};
