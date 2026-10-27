'use client';
import {useEffect,useRef,useState,type DetailedHTMLProps,type HTMLAttributes} from 'react';
type ModelViewer=HTMLElement&{availableVariants:string[]};
declare module 'react'{namespace JSX{interface IntrinsicElements{'model-viewer':DetailedHTMLProps<HTMLAttributes<ModelViewer>,ModelViewer>&Record<string,unknown>}}}
// Interactive 3D view. Finishes come from the file's KHR_materials_variants.
export function ProductModel({src,model}:{src:string;model:string}){
 const ref=useRef<ModelViewer>(null);
 const [finishes,setFinishes]=useState<string[]>([]);const [finish,setFinish]=useState<string>();
 useEffect(()=>{
  void import('@google/model-viewer');
  const viewer=ref.current!;
  const load=()=>{setFinishes(viewer.availableVariants);setFinish(f=>f??viewer.availableVariants[0])};
  viewer.addEventListener('load',load);return()=>viewer.removeEventListener('load',load);
 },[]);
 return <section className="product-model" aria-label={`3D model of ${model}`}>
  <model-viewer ref={ref} src={src} alt={`Rotatable 3D model of ${model}`} variant-name={finish} camera-controls="" auto-rotate="" auto-rotate-delay="1500" touch-action="pan-y" interaction-prompt="auto" shadow-intensity="1" shadow-softness="0.8" exposure="1.05" environment-image="neutral" camera-orbit="-30deg 72deg auto" ar="" ar-modes="webxr scene-viewer quick-look"/>
  {finishes.length>1&&<div className="finish-picker" role="radiogroup" aria-label="Finish">{finishes.map(f=><button key={f} type="button" role="radio" aria-checked={f===finish} onClick={()=>setFinish(f)}>{f}</button>)}</div>}
  <p className="picture-caption">Drag to turn the handle, pinch or scroll to zoom. On a phone, use the AR button to see it in your room.</p>
 </section>;
}
