import catalog from './data/catalog.json';
import {productImages} from './data/images';
import type {Product, SourceDocument} from './types';
export type MobileProduct=Omit<Product,'catalogText'>;
export type MobileCatalog={products:MobileProduct[];documents:SourceDocument[];priceNote:string};
export const products=catalog.products as MobileProduct[];
export const documents=catalog.documents;
export const priceNote=catalog.priceNote;
export const assetURL=(path:string)=>/^https?:\/\//.test(path)?path:`https://dalmia-blush.vercel.app/${path.replace(/^\/+/, '')}`;
export const sourceURL=(id:string,page:number,sourceDocuments:SourceDocument[]=documents)=>{
 const document=sourceDocuments.find(item=>item.id===id);
 return document?`https://dalmia-blush.vercel.app/documents/${encodeURIComponent(document.file)}#page=${page}`:null;
};

export const productImage=(product:MobileProduct)=>{
 const image=product.images[0];
 if(!image)return undefined;
 const original=products.find(item=>item.id===product.id)?.images[0];
 return productImages[product.id]&&original?.src===image.src?productImages[product.id]:{uri:assetURL(image.src)};
};
