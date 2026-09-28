import catalog from './data/catalog.json';
import {productImages} from './data/images';
import {catalogMediaURL, catalogDocumentURL} from './lib/media.mjs';
import type {Product, SourceDocument} from './types';
export type MobileProduct=Omit<Product,'catalogText'>;
export type MobileCatalog={products:MobileProduct[];documents:SourceDocument[];priceNote:string};
export const products=catalog.products as MobileProduct[];
export const documents=catalog.documents;
export const priceNote=catalog.priceNote;
export const assetURL=(path:string)=>catalogMediaURL(path,process.env.EXPO_PUBLIC_SUPABASE_URL,'https://dalmia-blush.vercel.app');
export const sourceURL=(id:string,page:number,sourceDocuments:SourceDocument[]=documents)=>{
 const document=sourceDocuments.find(item=>item.id===id);
 return document?catalogDocumentURL(document,page,process.env.EXPO_PUBLIC_SUPABASE_URL,'https://dalmia-blush.vercel.app'):null;
};

export const productImage=(product:MobileProduct)=>{
 const image=product.images[0];
 if(!image)return undefined;
 return process.env.EXPO_PUBLIC_SUPABASE_URL?{uri:assetURL(image.src)}:bundledProductImage(product)||{uri:assetURL(image.src)};
};

export const bundledProductImage=(product:MobileProduct)=>{
 const image=product.images[0];
 if(!image)return undefined;
 const original=products.find(item=>item.id===product.id)?.images[0];
 return original?.src===image.src?productImages[product.id]:undefined;
};
