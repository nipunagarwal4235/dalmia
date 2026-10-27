import type {Metadata} from 'next';
import {ProductModel} from '../../components/product-model';
export const metadata:Metadata={title:'3D model',robots:{index:false}};
// Public, chrome-free viewer that the iOS and Android apps open in a web view.
export default async function View3D({searchParams}:{searchParams:Promise<{m?:string}>}){
 const {m=''}=await searchParams;
 if(!/^[a-z0-9-]+$/.test(m))return <main className="view3d"><p>Model not found.</p></main>;
 return <main className="view3d"><ProductModel src={`/models/${m}.glb`} model={m.split('-').pop()!}/></main>;
}
