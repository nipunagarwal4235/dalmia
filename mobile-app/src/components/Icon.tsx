import Svg,{Path,Circle,Rect,Line,Polyline} from 'react-native-svg';
export type IconName='heart'|'next'|'up'|'down'|'search'|'close'|'filter'|'grid'|'info'|'back'|'check'|'external'|'image';
export function Icon({name,size=24,color='#fff',filled=false}:{name:IconName;size?:number;color?:string;filled?:boolean}){
 return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
 {name==='heart'?<Path fill={filled?color:'none'} d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>:
 name==='search'?<><Circle cx="10.5" cy="10.5" r="7"/><Line x1="16" y1="16" x2="21" y2="21"/></>:
 name==='close'?<><Line x1="6" y1="6" x2="18" y2="18"/><Line x1="6" y1="18" x2="18" y2="6"/></>:
 name==='next'?<><Line x1="4" y1="12" x2="20" y2="12"/><Polyline points="13,5 20,12 13,19"/></>:
 name==='back'?<><Line x1="20" y1="12" x2="4" y2="12"/><Polyline points="11,5 4,12 11,19"/></>:
 name==='up'?<Polyline points="5,15 12,8 19,15"/>:
 name==='down'?<Polyline points="5,9 12,16 19,9"/>:
 name==='grid'?<><Rect x="3" y="3" width="7" height="7" rx="1"/><Rect x="14" y="3" width="7" height="7" rx="1"/><Rect x="3" y="14" width="7" height="7" rx="1"/><Rect x="14" y="14" width="7" height="7" rx="1"/></>:
 name==='filter'?<><Line x1="4" y1="6" x2="20" y2="6"/><Line x1="7" y1="12" x2="17" y2="12"/><Line x1="10" y1="18" x2="14" y2="18"/></>:
 name==='info'?<><Circle cx="12" cy="12" r="9"/><Line x1="12" y1="11" x2="12" y2="17"/><Circle cx="12" cy="7" r=".7" fill={color}/></>:
 name==='check'?<Polyline points="4,12 9,17 20,6"/>:
 name==='external'?<><Polyline points="14,3 21,3 21,10"/><Line x1="10" y1="14" x2="21" y2="3"/><Path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/></>:
 <><Rect x="3" y="3" width="18" height="18" rx="2"/><Circle cx="8" cy="8" r="1.5"/><Polyline points="3,17 9,11 14,16 17,13 21,17"/></>}
 </Svg>;
}
