import {View,StyleSheet} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {wordmark,monogram} from '../data/brand';
export function Brand(){return <View accessible accessibilityLabel="Dalmia Hardware" style={styles.brand}><SvgXml xml={monogram} width={32} height={32}/><SvgXml xml={wordmark} width={112} height={34}/></View>;}
const styles=StyleSheet.create({brand:{flexDirection:'row',alignItems:'center',gap:7}});
