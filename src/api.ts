/// <reference types="vite/client" />
export type Product = {id:string;name:string;brand:string;type:'FEED'|'SUPPLEMENT';servingUnit:string;dataQuality:string;origin?:'MARKET'|'DEMO';barcode?:string;sourceUrl?:string;updatedAt?:number}
export type Profile = {name:string;species:'DOG'|'CAT';weightKg:number;age:{value:number;unit:'WEEK'|'MONTH'};adultSize?:string;expectedAdultWeightKg?:number;completeFeed:boolean}
export type FeedingItem = {productId:string;name:string;type:'FEED'|'SUPPLEMENT';dailyAmount:number;unit:string}
export type ManualNutrient = {nutrientId:string;amount:number;unit:string}
export type ManualItem = {name:string;type:'FEED'|'SUPPLEMENT';servingAmount:number;servingUnit:string;dailyAmount:number;nutrients:ManualNutrient[]}
export type NutrientResult = {nutrientId:string;name:string;unit:string;fromFeed:number;fromSupplements:number;total:number;minimum:number|null;caution:number|null;upper:number|null;status:string;source:string}
export type ProductContribution = {name:string;type:'FEED'|'SUPPLEMENT';source:'ACTUAL'|'ESTIMATED';nutrients:Record<string,number>}
export type Analysis = {traceId:string;standardVersion:string;standardSource?:string;cautionPolicy?:string;lifeStage:string;referenceEnergyKcal:number|null;usesEstimatedFeed:boolean;summary:Record<string,number>;nutrients:NutrientResult[];contributions:ProductContribution[];ratios:Record<string,{value:number|null;status:string;minimum?:number;maximum?:number}>;warnings:string[]}
export type StandardProfile = 'FEDIAF_2025'|'NIAS_V3'
export const STANDARD_OPTIONS:{id:StandardProfile;label:string;available:boolean;note:string}[]=[
  {id:'FEDIAF_2025',label:'FEDIAF 2025',available:true,note:'현재 기본 분석 기준이에요. 결과에 기준 버전과 출처를 함께 표시해요'},
  {id:'NIAS_V3',label:'NIAS v3',available:false,note:'서버 연동은 준비됐지만 기준값 원문 대조 중이라 아직 선택할 수 없어요'}
]
export type Recommendation = {message:string;usesEstimatedFeed:boolean;items:{productId:string;name:string;dailyAmount:number;unit:string;score:number;fixedNutrients:number}[];excluded:{productId:string;name:string;reason:string}[]}

const API = import.meta.env.VITE_API_URL ?? ''
const STATIC_MODE = import.meta.env.PROD && !API
async function call<T>(path:string,init?:RequestInit):Promise<T>{
  let response:Response
  try{
    response=await fetch(`${API}${path}`,{headers:{'Content-Type':'application/json'},...init})
  }catch{
    throw new Error('서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  }
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
export async function analyze(profile:Profile,items:FeedingItem[],manualItems:ManualItem[]=[],standardProfile:StandardProfile='FEDIAF_2025'){
  if(STATIC_MODE){const {localAnalyze}=await import('./localEngine');return localAnalyze(profile,items,manualItems)}
  return call<Analysis>('/api/v1/analyses',{method:'POST',body:JSON.stringify({profile,standardProfile,items:items.map(({productId,dailyAmount,unit})=>({productId,dailyAmount,unit})),manualItems})})
}
export async function recommend(profile:Profile,items:FeedingItem[],manualItems:ManualItem[]=[],standardProfile:StandardProfile='FEDIAF_2025'){
  if(STATIC_MODE){const {localRecommend}=await import('./localEngine');return localRecommend(profile,items,manualItems)}
  return call<Recommendation>('/api/v1/recommendations',{method:'POST',body:JSON.stringify({profile,standardProfile,items:items.map(({productId,dailyAmount,unit})=>({productId,dailyAmount,unit})),manualItems,maxItems:3})})
}
