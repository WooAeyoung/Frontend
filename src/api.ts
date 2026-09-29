/// <reference types="vite/client" />
export type Product = {id:string;name:string;brand:string;type:'FEED'|'SUPPLEMENT';servingUnit:string;dataQuality:string}
export type Profile = {name:string;species:'DOG'|'CAT';weightKg:number;age:{value:number;unit:'WEEK'|'MONTH'};adultSize?:string;completeFeed:boolean}
export type FeedingItem = {productId:string;name:string;type:'FEED'|'SUPPLEMENT';dailyAmount:number;unit:string}
export type NutrientResult = {nutrientId:string;name:string;unit:string;fromFeed:number;fromSupplements:number;total:number;minimum:number|null;caution:number|null;upper:number|null;status:string;source:string}
export type Analysis = {traceId:string;standardVersion:string;lifeStage:string;referenceEnergyKcal:number;usesEstimatedFeed:boolean;summary:Record<string,number>;nutrients:NutrientResult[];ratios:Record<string,{value:number|null;status:string}>;warnings:string[]}
export type Recommendation = {message:string;usesEstimatedFeed:boolean;items:{productId:string;name:string;dailyAmount:number;unit:string;score:number;fixedNutrients:number}[];excluded:{productId:string;name:string;reason:string}[]}

const API = import.meta.env.VITE_API_URL ?? ''
async function call<T>(path:string, init?:RequestInit):Promise<T>{
  const response = await fetch(`${API}${path}`, {headers:{'Content-Type':'application/json'},...init})
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.detail?.message ?? body.detail?.[0]?.msg ?? '요청을 처리하지 못했습니다.')}
  return response.json()
}
export const getProducts = (query='') => call<{items:Product[]}>(`/api/v1/products?query=${encodeURIComponent(query)}&limit=20`)
export const analyze = (profile:Profile, items:FeedingItem[]) => call<Analysis>('/api/v1/analyses',{method:'POST',body:JSON.stringify({profile,items:items.map(({productId,dailyAmount,unit})=>({productId,dailyAmount,unit})),manualItems:[]})})
export const recommend = (profile:Profile, items:FeedingItem[]) => call<Recommendation>('/api/v1/recommendations',{method:'POST',body:JSON.stringify({profile,items:items.map(({productId,dailyAmount,unit})=>({productId,dailyAmount,unit})),manualItems:[],maxItems:3})})

