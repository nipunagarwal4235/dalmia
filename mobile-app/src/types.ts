export interface Source { document: string; page: number; kind?: string }
export interface ProductImage { src: string; detail: string; document: string; page: number; shared: boolean; width: number; height: number; extraction?: {method:string;sourcePage:number;referenceSize:number[];polygon:number[][]} }
export interface Variant { finish: string; thickness?: string | null; prices: Record<string, number | null>; unit: string; source: Source; box?: number; boxUnit?: string; weight?: string }
export interface Product { id:string; model:string; category:string; variants:Variant[]; sources:Source[]; images:ProductImage[]; notes:string[]; catalogText:string; specs:string[]; sizes:string[]; minPrice:number|null; maxPrice:number|null; searchText:string }
export interface SourceDocument { id:string;file:string;title:string;kind:string;pages:number;bytes:number;sha256:string }
export interface SourcePage { document:string;page:number;text:string;image:string;machineRead:boolean }
export interface Catalog { products:Product[];documents:SourceDocument[];pages:SourcePage[];terms:string;currency:null;priceNote:string }
export interface Filters {view:'products'|'documents'|'saved';query:string;category:string;size:string;finish:string;status:string;sort:string;layout:string}
