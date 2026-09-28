import {useMemo,useRef,useEffect,useState} from 'react';
import {Animated,PanResponder,Pressable,StyleSheet,Text,View,Platform,useWindowDimensions,AccessibilityInfo} from 'react-native';
import {CatalogImage} from './CatalogImage';
import * as Haptics from 'expo-haptics';
import {Icon} from './Icon';
import {colors as c} from '../theme';
import {productImage} from '../catalog';
import {priceAmount,calculatedPrices} from '../lib/pricing.mjs';
import {swipeAction} from '../lib/catalog.mjs';
import type {MobileProduct} from '../catalog';
export function ProductCard({product:p,height,index,count,saved,onSave,onToggle,onNext,onDetails,active,savedView}:{product:MobileProduct;height:number;index:number;count:number;saved:boolean;onSave:()=>void;onToggle:()=>void;onNext:()=>void;onDetails:()=>void;active:boolean;savedView:boolean}){
 const {width}=useWindowDimensions();const [x]=useState(()=>new Animated.Value(0));const busy=useRef(false);const reduced=useRef(false);
 const handlers=useRef({onSave,onNext});useEffect(()=>{handlers.current={onSave,onNext};},[onSave,onNext]);
 useEffect(()=>{AccessibilityInfo.isReduceMotionEnabled().then(value=>{reduced.current=value});},[]);
 useEffect(()=>{if(!active){x.setValue(0);busy.current=false;}},[active,x]);
 const perform=(action:'save'|'next')=>{
  if(busy.current)return;busy.current=true;
  if(Platform.OS!=='web')void Haptics.impactAsync(action==='save'?Haptics.ImpactFeedbackStyle.Medium:Haptics.ImpactFeedbackStyle.Light).catch(()=>{});
  Animated.timing(x,{toValue:(action==='save'?1:-1)*Math.max(width,450),duration:reduced.current?0:190,useNativeDriver:Platform.OS!=='web'}).start(({finished})=>{
   if(finished){if(action==='save')handlers.current.onSave();handlers.current.onNext();}
   x.setValue(0);busy.current=false;
  });
 };
 const performRef=useRef(perform);useEffect(()=>{performRef.current=perform;});
 // eslint-disable-next-line react-hooks/refs -- PanResponder stores callbacks; these refs are read only during gestures.
 const pan=useMemo(()=>PanResponder.create({
  onMoveShouldSetPanResponder:(_,gesture)=>!busy.current&&Math.abs(gesture.dx)>14&&Math.abs(gesture.dx)>Math.abs(gesture.dy)*1.6,
  onPanResponderGrant:()=>x.stopAnimation(),
  onPanResponderMove:(_,gesture)=>{if(!busy.current)x.setValue(gesture.dx)},
  onPanResponderRelease:(_,gesture)=>{const action=swipeAction(gesture.dx,gesture.dy,gesture.vx);if(action)performRef.current(action as 'save'|'next');else Animated.spring(x,{toValue:0,useNativeDriver:Platform.OS!=='web',friction:8}).start();},
  onPanResponderTerminate:()=>Animated.spring(x,{toValue:0,useNativeDriver:Platform.OS!=='web'}).start(),
  onPanResponderTerminationRequest:()=>!busy.current,
 }),[x]);
 const short=height<620, tiny=height<520;
 const perInch=p.variants.some(variant=>variant.unit==='Per inch');const prices=calculatedPrices(p.minPrice);
 const rotation=x.interpolate({inputRange:[-300,0,300],outputRange:['-8deg','0deg','8deg'],extrapolate:'clamp'});
 const likeOpacity=x.interpolate({inputRange:[0,35,100],outputRange:[0,.4,1],extrapolate:'clamp'});
 const nextOpacity=x.interpolate({inputRange:[-100,-35,0],outputRange:[1,.4,0],extrapolate:'clamp'});
 return <View style={[styles.page,{height}]} testID={`product-${p.id}`}>
  <Animated.View style={[styles.card,{transform:[{translateX:x},{rotate:rotation}]}]} {...pan.panHandlers}>
   <View style={styles.topline}><Text style={styles.category}>{p.category.toUpperCase()}</Text><Text style={styles.position}>{String(index+1).padStart(2,'0')} <Text style={styles.total}>/ {count}</Text></Text></View>
   <View style={[styles.imageArea,{minHeight:tiny?100:150}]}>
    {productImage(p)?<CatalogImage product={p} testID={`image-${p.id}`} style={styles.image} contentFit="contain" transition={120} recyclingKey={p.id} accessibilityLabel={`${p.category} model ${p.model}`}/>:<View style={styles.missing}><Icon name="image" color="#747474" size={38}/><Text style={styles.missingText}>No catalogue picture</Text><Text style={styles.missingSub}>Model {p.model}</Text></View>}
    <View pointerEvents="none" style={styles.photoLabel}><Text style={styles.photoLabelText}>DALMIA / ORIGINAL CATALOGUE</Text></View>
    <Pressable onPress={onDetails} style={styles.expand} accessibilityRole="button" accessibilityLabel={`View details for ${p.model}`}><Icon name="info" size={22} color={c.ink}/></Pressable>
    {saved&&<View style={styles.savedBadge}><Icon name="heart" size={12} color={c.black} filled/><Text style={styles.savedBadgeText}>SAVED</Text></View>}
    <Animated.View pointerEvents="none" style={[styles.swipeStamp,styles.likeStamp,{opacity:likeOpacity}]}><Icon name="heart" color={c.gold} size={26} filled/><Text style={styles.likeStampText}>SAVED</Text></Animated.View>
    <Animated.View pointerEvents="none" style={[styles.swipeStamp,styles.nextStamp,{opacity:nextOpacity}]}><Text style={styles.nextStampText}>NEXT</Text><Icon name="next" color="#fff" size={26}/></Animated.View>
   </View>
   <View style={[styles.info,{paddingTop:short?13:20,paddingBottom:short?10:16}]}>
    <View style={styles.modelRow}><View style={styles.modelGroup}><Text style={styles.modelLabel}>MODEL</Text><Text numberOfLines={p.model.length>20?2:1} style={[styles.model,{fontSize:p.model.length>16?21:short?32:38}]}>{p.model}</Text></View><View style={styles.priceGroup}><Text style={styles.priceLabel}>{p.minPrice==null?'Listed price':'Starting at'}</Text><Text style={styles.price}>{p.minPrice==null?'Not listed':priceAmount(p.minPrice)}</Text>{perInch&&<Text style={styles.perInch}>per inch</Text>}</View></View>
    <Text style={styles.specs} numberOfLines={1}>{p.sizes.length?p.sizes.join(' · '):'See catalogue details'}{p.variants.length?`  /  ${p.variants.length} price ${p.variants.length===1?'row':'rows'}`:''}</Text>
    {!tiny&&<View style={styles.quickPrices}><View style={styles.quickCell}><Text style={styles.quickLabel}>65% OFF{perInch?' / INCH':''}</Text><Text style={styles.quickValue}>{priceAmount(prices[0])}</Text></View><View style={styles.quickDivider}/><View style={styles.quickCell}><Text style={styles.quickLabel}>75% OFF{perInch?' / INCH':''}</Text><Text style={styles.quickValue}>{priceAmount(prices[1])}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`All prices for ${p.model}`} onPress={onDetails} style={styles.allPrices}><Text style={styles.allPricesText}>All prices</Text><Icon name="next" size={16} color={c.gold}/></Pressable></View>}
    <View style={styles.actions}><Pressable accessibilityRole="button" accessibilityLabel={`Next product after ${p.model}`} onPress={()=>perform('next')} style={[styles.action,styles.nextButton]}><Icon name="next" size={20}/><Text style={styles.nextButtonText}>Next</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={saved?`Unlike model ${p.model}`:`Like model ${p.model}`} accessibilityState={{selected:saved}} onPress={onToggle} style={[styles.heartButton,saved&&styles.heartButtonSaved]}><Icon name="heart" size={26} color={saved?c.black:c.gold} filled={saved}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Save model ${p.model} and continue`} onPress={()=>perform('save')} style={[styles.action,styles.saveButton]}><Text style={styles.saveButtonText}>Save</Text><Icon name="heart" size={18} color={c.black}/></Pressable></View>
    <Text style={styles.gestureHint}>{savedView?'Your saved collection. Tap the heart to unlike.':'Swipe right to save · Left for next · Scroll to explore'}</Text>
   </View>
  </Animated.View>
 </View>;
}
const styles=StyleSheet.create({
 page:{paddingHorizontal:14,paddingBottom:10,overflow:'hidden'},card:{flex:1,borderRadius:6,overflow:'hidden',backgroundColor:c.charcoal,borderWidth:1,borderColor:'#373737'},
 topline:{height:36,paddingHorizontal:15,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'#202020'},category:{fontSize:9,fontWeight:'700',letterSpacing:1.7,color:c.gold},position:{fontSize:11,fontWeight:'600',color:'#fff',fontVariant:['tabular-nums']},total:{color:'#8b8b8b'},
 imageArea:{flex:1,backgroundColor:'#E1E2E4',overflow:'hidden'},image:{height:'100%',width:'100%'},photoLabel:{position:'absolute',bottom:10,left:12,backgroundColor:'#FFFFFFCC',paddingHorizontal:7,paddingVertical:4,borderRadius:2},photoLabelText:{fontSize:7,letterSpacing:1.2,color:'#555',fontWeight:'600'},expand:{position:'absolute',bottom:10,right:10,width:38,height:38,backgroundColor:'#FFFFFFEB',borderRadius:20,alignItems:'center',justifyContent:'center'},savedBadge:{position:'absolute',top:12,right:12,flexDirection:'row',alignItems:'center',gap:5,backgroundColor:c.gold,paddingHorizontal:9,paddingVertical:6,borderRadius:3},savedBadgeText:{fontSize:8,letterSpacing:1,fontWeight:'800',color:c.black},
 missing:{flex:1,alignItems:'center',justifyContent:'center',gap:12},missingText:{fontSize:15,fontWeight:'600',color:'#555'},missingSub:{fontSize:11,color:'#777'},
 info:{paddingHorizontal:17,backgroundColor:'#202020'},modelRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},modelGroup:{flex:1},modelLabel:{color:'#929292',fontSize:8,letterSpacing:2,fontWeight:'600',marginBottom:3},model:{fontFamily:Platform.select({ios:'Georgia',android:'serif',default:'Georgia'}),color:'#fff',letterSpacing:-.5},priceGroup:{alignItems:'flex-end'},priceLabel:{color:c.muted,fontSize:9,marginBottom:5},price:{color:'#fff',fontSize:18,fontWeight:'600',fontVariant:['tabular-nums']},perInch:{color:c.gold,fontSize:9,marginTop:3},specs:{color:'#b7b7b7',fontSize:10,marginTop:7,marginBottom:12},
 quickPrices:{flexDirection:'row',alignItems:'center',gap:13,paddingTop:12,paddingBottom:13,borderTopWidth:1,borderTopColor:'#3b3b3b'},quickCell:{minWidth:66},quickLabel:{color:'#b3b3b3',fontSize:7,letterSpacing:.8,marginBottom:4},quickValue:{color:'#fff',fontSize:14,fontWeight:'600',fontVariant:['tabular-nums']},quickDivider:{width:1,height:26,backgroundColor:'#3b3b3b'},allPrices:{marginLeft:'auto',flexDirection:'row',alignItems:'center',gap:5,paddingVertical:10},allPricesText:{color:c.gold,fontSize:11},
 actions:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:13},action:{flex:1,flexDirection:'row',height:43,alignItems:'center',justifyContent:'center',gap:8,borderRadius:4},nextButton:{borderWidth:1,borderColor:'#4a4a4a',backgroundColor:'#292929'},nextButtonText:{color:'#eee',fontSize:12,fontWeight:'600'},saveButton:{backgroundColor:c.gold},saveButtonText:{color:c.black,fontSize:12,fontWeight:'700'},heartButton:{width:47,height:47,borderRadius:24,borderWidth:1,borderColor:c.gold,alignItems:'center',justifyContent:'center'},heartButtonSaved:{backgroundColor:c.gold},gestureHint:{textAlign:'center',color:'#9c9c9c',fontSize:8,marginTop:12,letterSpacing:.1},
 swipeStamp:{position:'absolute',top:35,paddingHorizontal:16,paddingVertical:10,borderWidth:3,borderRadius:6,flexDirection:'row',gap:10,alignItems:'center',backgroundColor:'#151515e8'},likeStamp:{left:25,borderColor:c.gold,transform:[{rotate:'-12deg'}]},likeStampText:{fontSize:30,fontWeight:'900',color:c.gold},nextStamp:{right:25,borderColor:'#fff',transform:[{rotate:'12deg'}]},nextStampText:{fontSize:30,fontWeight:'900',color:'#fff'},
});
