import {useState} from 'react';
import {Image, type ImageProps} from 'expo-image';
import {productImage, bundledProductImage, type MobileProduct} from '../catalog';

export function CatalogImage({product, ...props}: {product:MobileProduct} & Omit<ImageProps, 'source'>) {
  const source = productImage(product);
  const uri = typeof source === 'object' ? source.uri : '';
  const [failedURI, setFailedURI] = useState<string>();
  const fallback = bundledProductImage(product);
  return <Image {...props} source={uri && failedURI === uri && fallback ? fallback : source}
    cachePolicy="disk" onError={event => {if (uri) setFailedURI(uri); props.onError?.(event);}}/>;
}
