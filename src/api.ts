/// <reference types="vite/client" />
export type Product = {id:string;name:string;brand:string;type:'FEED'|'SUPPLEMENT';servingUnit:string;dataQuality:string;origin?:'MARKET'|'DEMO';barcode?:string;sourceUrl?:string;updatedAt?:number}
export type Profile = {name:string;species:'DOG'|'CAT';weightKg:number;age:{value:number;unit:'WEEK'|'MONTH'};adultSize?:string;expectedAdultWeightKg?:number;completeFeed:boolean}
export type FeedingItem = {productId:string;name:string;type:'FEED'|'SUPPLEMENT';dailyAmount:number;unit:string}
export type ManualNutrient = {nutrientId:string;amount:number;unit:string}
export type ManualItem = {name:string;type:'FEED'|'SUPPLEMENT';servingAmount:number;servingUnit:string;dailyAmount:number;nutrients:ManualNutrient[]}
export type NutrientResult = {nutrientId:string;name:string;unit:string;fromFeed:number;fromSupplements:number;total:number;minimum:number|null;caution:number|null;upper:number|null;status:string;source:string}
export type ProductContribution = {name:string;type:'FEED'|'SUPPLEMENT';source:'ACTUAL'|'ESTIMATED';nutrients:Record<string,number>}
export type Analysis = {traceId:string;standardVersion:string;standardSource?:string;lifeStage:string;referenceEnergyKcal:number;usesEstimatedFeed:boolean;summary:Record<string,number>;nutrients:NutrientResult[];contributions:ProductContribution[];ratios:Record<string,{value:number|null;status:string}>;warnings:string[]}
export type Recommendation = {message:string;usesEstimatedFeed:boolean;items:{productId:string;name:string;dailyAmount:number;unit:string;score:number;fixedNutrients:number}[];excluded:{productId:string;name:string;reason:string}[]}

const API = import.meta.env.VITE_API_URL ?? ''
const STATIC_MODE = import.meta.env.PROD && !API
async function call<T>(path:string,init?:RequestInit):Promise<T>{
  const response=await fetch(`${API}${path}`,{headers:{'Content-Type':'application/json'},...init})
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.detail?.message??body.detail?.[0]?.msg??'요청을 처리하지 못했습니다.')}
  return response.json()
}
export async function getProducts(query=''){
  if(STATIC_MODE){
    const {marketProducts,localProducts}=await import('./localEngine')
    const local = localProducts(query)
    try{const market=await marketProducts(query);const unique=new Map([...local,...market].map(product=>[product.id,product]));return {items:[...unique.values()].slice(0,20)}}
    catch(error){console.warn('시판 제품 데이터를 불러오지 못해 데모 목록을 사용합니다.',error)}
    return {items:local}
  }
  return call<{items:Product[]}>(`/api/v1/products?query=${encodeURIComponent(query)}&limit=20`)
}
export async function analyze(profile:Profile,items:FeedingItem[],manualItems:ManualItem[]=[]){
  if(STATIC_MODE){const {localAnalyze}=await import('./localEngine');return localAnalyze(profile,items,manualItems)}
  return call<Analysis>('/api/v1/analyses',{method:'POST',body:JSON.stringify({profile,items:items.map(({productId,dailyAmount,unit})=>({productId,dailyAmount,unit})),manualItems})})
}
export async function recommend(profile:Profile,items:FeedingItem[],manualItems:ManualItem[]=[]){
  if(STATIC_MODE){const {localRecommend}=await import('./localEngine');return localRecommend(profile,items,manualItems)}
  return call<Recommendation>('/api/v1/recommendations',{method:'POST',body:JSON.stringify({profile,items:items.map(({productId,dailyAmount,unit})=>({productId,dailyAmount,unit})),manualItems,maxItems:3})})
}
