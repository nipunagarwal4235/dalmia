import {Image, type ImageProps} from 'expo-image';
import {productImage, type MobileProduct} from '../catalog';

export function CatalogImage({product, ...props}: {product:MobileProduct} & Omit<ImageProps, 'source'>) {
  return <Image {...props} source={productImage(product)} cachePolicy="disk"/>;
}
