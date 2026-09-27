import {useState} from 'react';
import {Modal,View,Text,ScrollView,Pressable,StyleSheet,Linking,Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Image} from 'expo-image';
import {Icon} from './Icon';
import {colors as c} from '../theme';
import {productImage} from '../catalog';
import type {SourceDocument} from '../types';
import {priceFields,calculatedPrices,priceAmount} from '../lib/pricing.mjs';
import {sourceURL,type MobileProduct} from '../catalog';
export function ProductDetails({product:p,documents,priceNote,saved,onClose,onToggle}:{product:MobileProduct;documents:SourceDocument[];priceNote:string;saved:boolean;onClose:()=>void;onToggle:()=>void}){
 const [variantIndex,setVariantIndex]=useState(0);const [selectedSize,setSelectedSize]=useState('');
 const variant=p.variants[variantIndex];const sizes=variant?Object.keys(variant.prices):[];const size=sizes.includes(selectedSize)?selectedSize:sizes[0];const listed=variant?.prices[size]??null;
 const openSource=async(document:string,page:number)=>{const url=sourceURL(document,page,documents);if(!url)return;try{await Linking.openURL(url);}catch{Alert.alert('Document unavailable','Connect to the internet and try again.');}};
 return <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen"><SafeAreaView style={styles.root} edges={['top','bottom']}>
  <View style={styles.header}><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close product details" style={styles.iconButton}><Icon name="back"/></Pressable><Text style={styles.headerText}>PRODUCT DETAILS</Text><Pressable onPress={onToggle} accessibilityRole="button" accessibilityLabel={saved?`Unlike model ${p.model}`:`Like model ${p.model}`} style={styles.iconButton}><Icon name="heart" color={c.gold} filled={saved}/></Pressable></View>
  <ScrollView contentContainerStyle={styles.content}>
   {productImage(p)&&<Image source={productImage(p)} style={styles.picture} contentFit="contain" accessibilityLabel={`${p.category} ${p.model}`}/>}
   <Text style={styles.category}>{p.category.toUpperCase()}</Text><Text style={styles.model}>{p.model}</Text>
   {!!p.specs.length&&<Text style={styles.description}>{p.specs.join(' · ')}</Text>}
   <Text style={styles.title}>Finish and size</Text>
   {variant?<>
    <Text style={styles.label}>FINISH / COLOR</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{p.variants.map((v,i)=><Pressable key={i} accessibilityRole="button" accessibilityState={{selected:i===variantIndex}} onPress={()=>{setVariantIndex(i);setSelectedSize('')}} style={[styles.chip,i===variantIndex&&styles.selectedChip]}><Text style={[styles.chipText,i===variantIndex&&styles.selectedChipText]}>{v.finish}{v.thickness?` · ${v.thickness}`:''}{v.weight?` · ${v.weight}`:''}</Text></Pressable>)}</ScrollView>
    <Text style={styles.label}>SIZE</Text><View style={styles.sizes}>{sizes.map(item=><Pressable key={item} accessibilityRole="button" accessibilityState={{selected:item===size}} onPress={()=>setSelectedSize(item)} style={[styles.chip,item===size&&styles.selectedChip]}><Text style={[styles.chipText,item===size&&styles.selectedChipText]}>{item}</Text></Pressable>)}</View>
    <View style={styles.listed}><View><Text style={styles.label}>LISTED PRICE</Text><Text style={styles.basis}>{variant.unit}</Text></View><Text style={styles.listedValue}>{listed==null?'Not listed':priceAmount(listed)}</Text></View>
    <Text style={styles.title}>Calculated prices</Text><View style={styles.priceGrid}>{priceFields.map((field,i)=><View key={field.key} style={styles.priceCell}><Text style={styles.priceLabel}>{field.label}</Text><Text style={styles.priceValue}>{priceAmount(calculatedPrices(listed)[i])}</Text></View>)}</View>
    <Text style={styles.note}>The discount applies first. Then 18% or 9% is added to the discounted amount. Results use two decimal places.</Text>
    {variant.unit==='Per inch'&&<Text style={styles.warning}>All amounts are per inch, not the total price of a handle.</Text>}
    {listed==null&&<Text style={styles.warning}>The source does not list a price for this size.</Text>}
    {!!variant.box&&<Text style={styles.note}>Box quantity: {variant.box} {variant.boxUnit||'pcs'}</Text>}
   </>:<Text style={styles.warning}>No price is listed for this model in the supplied documents.</Text>}
   {p.notes.map(note=><Text key={note} style={styles.warning}>{note}</Text>)}
   <Text style={styles.title}>Original documents</Text><Text style={styles.note}>PDF links need an internet connection.</Text>
   {p.sources.map(source=><Pressable key={source.document+source.page} onPress={()=>openSource(source.document,source.page)} accessibilityRole="link" style={styles.source}><View style={{flex:1}}><Text style={styles.sourceText}>{documents.find(document=>document.id===source.document)?.file}</Text><Text style={styles.sourcePage}>Page {source.page}</Text></View><Icon name="external" size={18} color={c.gold}/></Pressable>)}
   <Text style={[styles.note,{marginTop:22}]}>{priceNote}</Text>
  </ScrollView>
 </SafeAreaView></Modal>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:c.black},header:{height:58,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:c.line},iconButton:{height:44,width:44,alignItems:'center',justifyContent:'center'},headerText:{color:'#eee',fontSize:10,fontWeight:'700',letterSpacing:2},content:{padding:22,paddingBottom:40},picture:{height:265,backgroundColor:c.silver,borderRadius:5,marginBottom:24},category:{color:c.gold,fontSize:9,fontWeight:'700',letterSpacing:2},model:{color:'#fff',fontSize:36,fontWeight:'700',marginTop:8,marginBottom:8},description:{color:c.muted,fontSize:13,lineHeight:21},title:{color:'#fff',fontWeight:'600',fontSize:17,marginTop:26,marginBottom:14},label:{color:c.muted,fontSize:8,letterSpacing:1.5,fontWeight:'600',marginBottom:8},chips:{gap:8,paddingBottom:17},chip:{paddingVertical:10,paddingHorizontal:13,backgroundColor:'#282828',borderWidth:1,borderColor:'#474747',borderRadius:4},selectedChip:{backgroundColor:c.gold,borderColor:c.gold},chipText:{fontSize:12,color:'#ddd'},selectedChipText:{color:c.black,fontWeight:'600'},sizes:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:20},listed:{backgroundColor:'#262626',padding:18,borderRadius:5,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},basis:{fontSize:12,color:'#ddd'},listedValue:{color:'#fff',fontSize:25,fontWeight:'700'},priceGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},priceCell:{width:'48%',padding:15,backgroundColor:'#222',borderWidth:1,borderColor:'#383838',borderRadius:4},priceLabel:{fontSize:10,color:'#bbb',marginBottom:8},priceValue:{fontSize:19,fontWeight:'600',fontVariant:['tabular-nums'],color:c.gold},note:{fontSize:11,lineHeight:19,color:'#a2a2a2',marginTop:12},warning:{fontSize:12,lineHeight:20,color:'#e1c995',backgroundColor:'#30291d',padding:14,borderLeftWidth:2,borderLeftColor:c.gold,marginTop:14},source:{paddingVertical:15,borderBottomWidth:1,borderBottomColor:'#333',flexDirection:'row',gap:15,alignItems:'center'},sourceText:{color:'#eee',fontSize:12},sourcePage:{color:c.muted,fontSize:10,marginTop:5}});
