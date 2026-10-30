// three.js renderer for the fitting playground. Logic and coordinates come from lib/playground.mjs (millimetres);
// this file only draws them in metres and reports clicks, drags and loaded finishes back to the page.
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader,type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type Kind='handle'|'knob'|'leg'|'bracket';
export type Part={id:string;label:string;pos:[number,number,number];size:[number,number,number];mat:'front'|'body'|'soft';slot?:string;hinge?:string;travel?:number};
export type Fitting={id:string;product:string;kind:Kind;part:string;u:number;v:number;spin:number;tilt:number;finish?:string;size?:string};
export type View='front'|'angle'|'side'|'top'|'selected';
type Events={select:(id:string|null)=>void;place:(part:string,u:number,v:number)=>void;move:(id:string,u:number,v:number,done:boolean)=>void;variants:(src:string,names:string[])=>void;loading:(count:number)=>void;error:(message:string)=>void};
const MM=0.001;

const swatches:Record<string,{color:string;grain?:string;roughness:number;metalness?:number;fabric?:boolean;stone?:boolean}>={
 'White laminate':{color:'#f1efea',roughness:.45},'Natural oak':{color:'#c89c66',grain:'#a87b47',roughness:.6},'Walnut':{color:'#6b4630',grain:'#4e2f1f',roughness:.55},
 'Teak':{color:'#9a6435',grain:'#7a4a22',roughness:.55},'Graphite':{color:'#3b3d40',roughness:.5},'Sage green':{color:'#9aa78f',roughness:.55},'Navy':{color:'#27344f',roughness:.5},
 'Ivory lacquer':{color:'#efe6d2',roughness:.2},'Linen beige':{color:'#d9cbb3',roughness:.95,fabric:true},'Charcoal':{color:'#46484c',roughness:.95,fabric:true},
 'Teal velvet':{color:'#1f5f62',roughness:.8,fabric:true},'Terracotta':{color:'#b5603e',roughness:.9,fabric:true},'Marble white':{color:'#ecebe7',grain:'#b9b6ae',roughness:.25,stone:true},
 'Granite black':{color:'#222325',grain:'#4a4a4c',roughness:.3,stone:true},
 'Light oak planks':{color:'#d8bd95',grain:'#bf9f73',roughness:.7},'Grey tile':{color:'#b9babb',roughness:.5},'Dark walnut planks':{color:'#5d3f2c',grain:'#46301f',roughness:.6},'Concrete':{color:'#9c9a96',roughness:.9},
};
/** Small procedural texture: wood grain, stone veins, fabric weave or floor planks. */
function texture(name:string,floor=false){
 const s=swatches[name]??swatches['White laminate'],c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d')!;
 g.fillStyle=s.color;g.fillRect(0,0,256,256);
 let seed=name.length*97;const rand=()=>(seed=(seed*16807)%2147483647)/2147483647;
 if(s.grain&&!s.stone){g.strokeStyle=s.grain;g.globalAlpha=.35;for(let i=0;i<40;i++){g.lineWidth=.5+rand()*1.5;g.beginPath();const y=rand()*256;g.moveTo(0,y);for(let x=0;x<=256;x+=16)g.lineTo(x,y+Math.sin(x/40+i)*3*rand());g.stroke();}}
 if(s.stone){g.strokeStyle=s.grain!;g.globalAlpha=.4;for(let i=0;i<9;i++){g.lineWidth=.6+rand();g.beginPath();let x=rand()*256,y=0;g.moveTo(x,y);while(y<256){x+=(rand()-.5)*30;y+=12;g.lineTo(x,y);}g.stroke();}}
 if(s.fabric){g.globalAlpha=.08;g.fillStyle='#000';for(let i=0;i<256;i+=3){g.fillRect(i,0,1,256);g.fillRect(0,i,256,1);}}
 if(floor){g.globalAlpha=.25;g.strokeStyle='#00000055';g.lineWidth=2;for(let y=0;y<=256;y+=name.includes('tile')?128:42)g.strokeRect(-2,y,260,0);if(name.includes('tile'))for(let x=0;x<=256;x+=128)g.strokeRect(x,0,0,256);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
}
const outVector=(kind:Kind)=>kind==='knob'?new THREE.Vector3(0,1,0):new THREE.Vector3(0,-1,0);
const faceNormal=(slot?:string)=>slot==='leg'||slot==='bracket'?new THREE.Vector3(0,-1,0):new THREE.Vector3(0,0,1);

export class PlaygroundScene{
 private renderer:THREE.WebGLRenderer;private scene=new THREE.Scene();private camera:THREE.PerspectiveCamera;private controls:OrbitControls;
 private loader=new GLTFLoader();private draco:DRACOLoader;private cache=new Map<string,Promise<GLTF>>();private furniture=new THREE.Group();private room=new THREE.Group();
 private parts=new Map<string,{part:Part;pivot:THREE.Group;content:THREE.Group;mesh:THREE.Mesh}>();private fittings=new Map<string,{data:Fitting;src:string;root:THREE.Group;key:string}>();
 private materials=new Map<string,THREE.MeshStandardMaterial>();private baseMaterials=new WeakMap<THREE.Mesh,THREE.Material|THREE.Material[]>();
 private ray=new THREE.Raycaster();private pointer=new THREE.Vector2();private down:{x:number;y:number;drag?:string}|null=null;
 private selected:string|null=null;private outline=new THREE.BoxHelper(new THREE.Object3D(),0xbd9854);private placing:string[]|null=null;private hover:string|null=null;
 private hoverMaterial:THREE.Material|THREE.Material[]|null=null;private open=0;private openTarget=0;private bounds=new THREE.Box3();private observer:ResizeObserver;private pending=0;private disposed=false;
 constructor(private host:HTMLElement,private events:Events){
  // The catalog GLBs are Draco compressed; the decoder is copied from three into public/draco.
  const draco=new DRACOLoader().setDecoderPath('/draco/').setDecoderConfig({type:'wasm'});this.loader.setDRACOLoader(draco);this.draco=draco;
  this.renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;host.appendChild(this.renderer.domElement);
  const pmrem=new THREE.PMREMGenerator(this.renderer);this.scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;pmrem.dispose();
  this.scene.background=new THREE.Color('#ece9e3');
  this.camera=new THREE.PerspectiveCamera(38,1,.01,60);this.camera.position.set(2.4,1.6,3.4);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.maxPolarAngle=Math.PI*.495;this.controls.minDistance=.08;this.controls.maxDistance=12;
  const sun=new THREE.DirectionalLight('#fff6e8',1.6);sun.position.set(2.5,4,3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0004;
  Object.assign(sun.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.5,far:12});this.scene.add(sun,new THREE.HemisphereLight('#ffffff','#b8a98f',.5),this.furniture,this.room,this.outline);
  this.outline.visible=false;(this.outline.material as THREE.LineBasicMaterial).depthTest=false;this.outline.renderOrder=10;
  const el=this.renderer.domElement;el.addEventListener('pointerdown',this.onDown);el.addEventListener('pointermove',this.onMove);el.addEventListener('pointerup',this.onUp);el.addEventListener('pointerleave',this.onLeave);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
  this.renderer.setAnimationLoop(()=>this.frame());
 }
 private material(name:string,repeat=1){
  const key=name+repeat;let m=this.materials.get(key);
  if(!m){const s=swatches[name]??swatches['White laminate'];m=new THREE.MeshStandardMaterial({map:texture(name),roughness:s.roughness,metalness:s.metalness??0});m.map!.repeat.set(repeat,repeat);this.materials.set(key,m);}
  return m;
 }
 setRoom(room:{wall:boolean;floor:string}){
  this.room.clear();const span=Math.max(6,this.bounds.getSize(new THREE.Vector3()).x+4);
  const floorTex=texture(room.floor,true);floorTex.repeat.set(span/1.2,span/1.2);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(span,span),new THREE.MeshStandardMaterial({map:floorTex,roughness:swatches[room.floor]?.roughness??.7}));
  floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.userData.room=true;this.room.add(floor);
  if(room.wall){const wall=new THREE.Mesh(new THREE.PlaneGeometry(span,3.2),new THREE.MeshStandardMaterial({color:'#f4f1ec',roughness:.95}));wall.position.set(0,1.6,this.bounds.isEmpty()?-.4:this.bounds.min.z-.005);wall.receiveShadow=true;this.room.add(wall);}
 }
 setFurniture(parts:Part[],finishes:{front:string;body:string;soft:string},room:{wall:boolean;floor:string}){
  this.highlight(null);for(const {mesh} of this.parts.values())mesh.geometry.dispose();
  this.furniture.clear();this.parts.clear();
  for(const part of parts){
   const [w,h,d]=part.size.map(n=>n*MM),[x,y,z]=part.pos.map(n=>n*MM);
   const radius=Math.min(part.mat==='soft'?.04:.0025,w/2.1,h/2.1,d/2.1);
   const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,part.mat==='soft'?4:2,radius),this.material(finishes[part.mat],part.mat==='soft'?2:1));
   mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=part.id;
   // Hinged fronts pivot on their hinge edge; content holds the panel and its fittings centred on the panel.
   const pivot=new THREE.Group(),content=new THREE.Group();pivot.add(content);content.add(mesh);
   const offset=part.hinge==='left'?[-w/2,0]:part.hinge==='right'?[w/2,0]:part.hinge==='bottom'?[0,-h/2]:part.hinge==='top'?[0,h/2]:[0,0];
   pivot.position.set(x+offset[0],y+offset[1],z+d/2);content.position.set(-offset[0],-offset[1],-d/2);
   this.furniture.add(pivot);this.parts.set(part.id,{part,pivot,content,mesh});
  }
  this.bounds.setFromObject(this.furniture);this.setRoom(room);this.applyOpen();
  for(const f of this.fittings.values())this.attach(f.root,f.data);
 }
 /** Adds, updates or removes fitting instances to match the list. Reloads only when product, finish or size change. */
 setFittings(list:Fitting[],srcOf:(product:string)=>string){
  const seen=new Set<string>();
  for(const data of list){
   seen.add(data.id);const src=srcOf(data.product),key=[src,data.finish,data.size,data.kind,data.tilt].join('|'),existing=this.fittings.get(data.id);
   if(existing&&existing.key===key){existing.data=data;this.attach(existing.root,data);continue;}
   const root=existing?.root??new THREE.Group();root.userData.fitting=data.id;
   this.fittings.set(data.id,{data,src,root,key});this.attach(root,data);
   this.pending++;this.events.loading(this.pending);
   this.instance(src,data).then(model=>{
    if(this.disposed||this.fittings.get(data.id)?.key!==key)return;
    root.clear();root.add(model);if(this.selected===data.id)this.outline.setFromObject(root);
   }).catch(e=>{console.error('Fitting load failed',src,e);this.events.error('A 3D fitting could not be loaded. Check your connection and try again.');}).finally(()=>{this.pending--;this.events.loading(this.pending);});
  }
  for(const [id,f] of this.fittings)if(!seen.has(id)){f.root.removeFromParent();this.fittings.delete(id);}
  if(this.selected&&!seen.has(this.selected))this.select(null);
 }
 private load(src:string){
  let p=this.cache.get(src);
  if(!p){p=this.loader.loadAsync(src).then(gltf=>{const names=(gltf.parser.json.extensions?.KHR_materials_variants?.variants??[]).map((v:{name:string})=>v.name);this.events.variants(src,names);return gltf;});this.cache.set(src,p);p.catch(()=>this.cache.delete(src));}
  return p;
 }
 /** Builds one fitting: picks the finish, stretches to the chosen size, and moves its mounting face to the origin. */
 private async instance(src:string,f:Fitting){
  const gltf=await this.load(src),model=gltf.scene.clone(true);
  await this.applyVariant(gltf,model,f.finish);
  model.traverse(o=>{if((o as THREE.Mesh).isMesh){o.castShadow=true;o.userData.fitting=f.id;}});
  const tilt=new THREE.Group();tilt.add(model);tilt.rotation.x=THREE.MathUtils.degToRad(f.tilt||0);
  const sized=new THREE.Group();sized.add(tilt);sized.updateMatrixWorld(true);
  let box=new THREE.Box3().setFromObject(sized);const inches=parseFloat(f.size??'');
  if(inches){
   const target=inches*.0254,dim=box.getSize(new THREE.Vector3());
   if(f.kind==='leg')sized.scale.y=target/dim.y;else if(f.kind==='handle')sized.scale.x=target/Math.max(dim.x,dim.z);else if(f.kind==='bracket')sized.scale.setScalar(target/Math.max(dim.x,dim.y,dim.z));
   sized.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(sized);
  }
  const c=box.getCenter(new THREE.Vector3()),out=outVector(f.kind);
  const holder=new THREE.Group();holder.add(sized);sized.position.set(-c.x,out.y<0?-box.max.y:-box.min.y,-c.z);
  return holder;
 }
 private async applyVariant(gltf:GLTF,object:THREE.Object3D,name?:string){
  const variants:{name:string}[]=gltf.parser.json.extensions?.KHR_materials_variants?.variants??[];
  const index=Math.max(0,variants.findIndex(v=>v.name===name));if(!variants.length)return;
  const jobs:Promise<void>[]=[];
  object.traverse(o=>{
   const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;
   if(!this.baseMaterials.has(mesh))this.baseMaterials.set(mesh,mesh.material);
   const mapping=(mesh.userData.gltfExtensions?.KHR_materials_variants?.mappings as {material:number;variants:number[]}[]|undefined)?.find(m=>m.variants.includes(index));
   if(mapping)jobs.push(gltf.parser.getDependency('material',mapping.material).then((m:THREE.Material)=>{mesh.material=m;}));
   else mesh.material=this.baseMaterials.get(mesh)!;
  });
  await Promise.all(jobs);
 }
 /** Positions a fitting on its part's face: align its protruding axis with the face normal, then spin around it. */
 private attach(root:THREE.Group,f:Fitting){
  const entry=this.parts.get(f.part);if(!entry){root.removeFromParent();return;}
  const [w,h,d]=entry.part.size.map(n=>n*MM),normal=faceNormal(entry.part.slot);
  if(normal.z>0)root.position.set((f.u-.5)*w,(f.v-.5)*h,d/2+.0005);else root.position.set((f.u-.5)*w,-h/2-.0005,(f.v-.5)*d);
  const align=new THREE.Quaternion().setFromUnitVectors(outVector(f.kind),normal),spin=new THREE.Quaternion().setFromAxisAngle(normal,THREE.MathUtils.degToRad(f.spin||0));
  root.quaternion.copy(spin.multiply(align));
  if(root.parent!==entry.content)entry.content.add(root);
  if(this.selected===f.id)this.outline.setFromObject(root);
 }
 select(id:string|null){
  this.selected=id;const f=id?this.fittings.get(id):null;
  this.outline.visible=!!f;if(f)this.outline.setFromObject(f.root);
 }
 /** While placing, parts with these slots highlight under the pointer and accept clicks. */
 setPlacing(slots:string[]|null){this.placing=slots;this.highlight(null);this.renderer.domElement.style.cursor=slots?'crosshair':'';}
 setOpen(amount:number){this.openTarget=amount;}
 private applyOpen(){
  for(const {part,pivot,content} of this.parts.values()){
   const a=this.open;
   if(part.slot==='drawer'){content.position.z=-(part.size[2]*MM)/2+a*(part.travel??300)*MM;continue;}
   if(part.slot!=='door'&&part.slot!=='entry')continue;
   const angle=a*(part.slot==='entry'?1.2:1.75);
   pivot.rotation.set(part.hinge==='bottom'?angle*.6:part.hinge==='top'?-angle*.6:0,part.hinge==='left'?-angle:part.hinge==='right'?angle:0,0);
  }
  if(this.selected)this.select(this.selected);
 }
 view(view:View){
  const box=this.selected&&view==='selected'?new THREE.Box3().setFromObject(this.fittings.get(this.selected)!.root):this.bounds,size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
  // Fit the bounding sphere inside the narrower of the vertical and horizontal fields of view.
  const v=THREE.MathUtils.degToRad(this.camera.fov),hfov=2*Math.atan(Math.tan(v/2)*this.camera.aspect);
  const r=Math.max(size.length()/2,.03),dist=r/Math.sin(Math.min(v,hfov)/2)*(view==='selected'?1.6:1.02);
  const dir=new THREE.Vector3(...{front:[0,.12,1],angle:[.75,.45,1],side:[1,.15,.05],top:[0,1,.35],selected:[0,0,0]}[view] as [number,number,number]);
  // A close-up looks outward from the furniture's centre, then backs out until the camera is clear of the furniture.
  if(view==='selected'){const centre=this.bounds.getCenter(new THREE.Vector3());dir.subVectors(c,centre).setY(0);if(dir.lengthSq()<1e-6)dir.set(0,0,1);dir.normalize().setY(.25);}
  dir.normalize();const position=dir.clone().multiplyScalar(dist).add(c);
  if(view==='selected')for(let i=0;i<200&&this.bounds.containsPoint(position);i++)position.addScaledVector(dir,.02);
  this.camera.position.copy(position);this.controls.target.copy(c);this.controls.update();
 }
 screenshot(){this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/png');}
 private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 private frame(){
  if(Math.abs(this.open-this.openTarget)>.001){this.open+=(this.openTarget-this.open)*.15;this.applyOpen();}
  this.controls.update();this.renderer.render(this.scene,this.camera);
 }
 private aim(e:PointerEvent){
  const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
  this.ray.setFromCamera(this.pointer,this.camera);
 }
 private cast(e:PointerEvent){this.aim(e);return this.ray.intersectObjects(this.furniture.children,true);}
 /** Face coordinates of a hit on a part's mounting face, or null when the hit is on another face. */
 private faceHit(hit:THREE.Intersection,partId:string){
  const entry=this.parts.get(partId)!,local=entry.mesh.worldToLocal(hit.point.clone()),[w,h,d]=entry.part.size.map(n=>n*MM);
  const normal=hit.face?.normal,want=faceNormal(entry.part.slot);
  if(!normal||normal.dot(want)<.7)return null;
  const clamp=(n:number)=>Math.min(1,Math.max(0,n));
  return want.z>0?{u:clamp(local.x/w+.5),v:clamp(local.y/h+.5)}:{u:clamp(local.x/w+.5),v:clamp(local.z/d+.5)};
 }
 /** Tints one part gold while placing. The original shared material is restored when the pointer leaves. */
 private highlight(id:string|null){
  if(this.hover===id)return;
  const old=this.hover&&this.parts.get(this.hover);
  if(old&&this.hoverMaterial){(old.mesh.material as THREE.Material).dispose();old.mesh.material=this.hoverMaterial;}
  this.hover=id;this.hoverMaterial=null;const next=id&&this.parts.get(id);
  if(next){this.hoverMaterial=next.mesh.material;const m=(next.mesh.material as THREE.MeshStandardMaterial).clone();m.emissive=new THREE.Color('#bd9854');m.emissiveIntensity=.35;next.mesh.material=m;}
 }
 private fittingAt(hits:THREE.Intersection[]){for(const h of hits){let o:THREE.Object3D|null=h.object;while(o){if(o.userData.fitting)return o.userData.fitting as string;o=o.parent;}}return null;}
 private onDown=(e:PointerEvent)=>{
  const hits=this.cast(e),fitting=this.fittingAt(hits.slice(0,1));
  this.down={x:e.clientX,y:e.clientY,drag:!this.placing&&fitting&&fitting===this.selected?fitting:undefined};
  if(this.down.drag){this.controls.enabled=false;this.renderer.domElement.setPointerCapture(e.pointerId);}
 };
 private onMove=(e:PointerEvent)=>{
  if(this.down?.drag){
   const f=this.fittings.get(this.down.drag);if(!f)return;
   this.aim(e);const hit=this.ray.intersectObject(this.parts.get(f.data.part)!.mesh,false)[0];
   const face=hit&&this.faceHit(hit,f.data.part);
   if(face){f.data={...f.data,...face};this.attach(f.root,f.data);this.events.move(f.data.id,face.u,face.v,false);}
   return;
  }
  if(!this.placing)return;
  const hit=this.cast(e).find(h=>h.object.userData.part),part=hit&&this.parts.get(hit.object.userData.part);
  this.highlight(part&&part.part.slot&&this.placing.includes(part.part.slot)&&this.faceHit(hit,part.part.id)?part.part.id:null);
 };
 private onUp=(e:PointerEvent)=>{
  const down=this.down;this.down=null;this.controls.enabled=true;
  if(!down)return;
  if(down.drag){const f=this.fittings.get(down.drag);if(f)this.events.move(f.data.id,f.data.u,f.data.v,true);return;}
  if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;
  const hits=this.cast(e);
  if(this.placing){
   const hit=hits.find(h=>h.object.userData.part),entry=hit&&this.parts.get(hit.object.userData.part);
   const face=entry&&entry.part.slot&&this.placing.includes(entry.part.slot)?this.faceHit(hit,entry.part.id):null;
   if(entry&&face)this.events.place(entry.part.id,face.u,face.v);
   return;
  }
  const id=this.fittingAt(hits);this.select(id);this.events.select(id);
 };
 private onLeave=()=>this.highlight(null);
 dispose(){
  this.disposed=true;this.renderer.setAnimationLoop(null);this.observer.disconnect();this.controls.dispose();
  const el=this.renderer.domElement;el.removeEventListener('pointerdown',this.onDown);el.removeEventListener('pointermove',this.onMove);el.removeEventListener('pointerup',this.onUp);el.removeEventListener('pointerleave',this.onLeave);
  this.scene.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh)m.geometry?.dispose();});for(const m of this.materials.values()){m.map?.dispose();m.dispose();}
  this.draco.dispose();this.renderer.dispose();el.remove();
 }
}
