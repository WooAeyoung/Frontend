import type { Analysis, FeedingItem, Product, Profile, Recommendation } from './api'

type CatalogProduct = Product & { servingAmount:number; recommendedDailyAmount?:number; nutrients:Record<string,number> }
const nutrientMeta = [
  ['CALCIUM','칼슘','MG'],['PHOSPHORUS','인','MG'],['VITAMIN_D','비타민 D','UG'],
  ['VITAMIN_E','비타민 E','MG'],['OMEGA3','오메가3','MG'],['ZINC','아연','MG'],
] as const
export const catalog: CatalogProduct[] = [
  {id:'feed-balanced-dog',name:'데일리 밸런스 독',brand:'우애영 데모',type:'FEED',servingAmount:100,servingUnit:'G',dataQuality:'COMPLETE',nutrients:{CALCIUM:900,PHOSPHORUS:720,VITAMIN_D:6,VITAMIN_E:10,OMEGA3:180,ZINC:12}},
  {id:'feed-balanced-cat',name:'데일리 밸런스 캣',brand:'우애영 데모',type:'FEED',servingAmount:80,servingUnit:'G',dataQuality:'COMPLETE',nutrients:{CALCIUM:760,PHOSPHORUS:650,VITAMIN_D:5,VITAMIN_E:9,OMEGA3:220,ZINC:10}},
  {id:'feed-complete-unknown',name:'성분 미표기 완전사료',brand:'우애영 데모',type:'FEED',servingAmount:100,servingUnit:'G',dataQuality:'MINIMUM_ONLY',nutrients:{}},
  {id:'supp-calcium',name:'칼슘 플러스',brand:'우애영 데모',type:'SUPPLEMENT',servingAmount:1,servingUnit:'TABLET',recommendedDailyAmount:1,dataQuality:'COMPLETE',nutrients:{CALCIUM:180,PHOSPHORUS:60}},
  {id:'supp-omega',name:'오메가 밸런스',brand:'우애영 데모',type:'SUPPLEMENT',servingAmount:1,servingUnit:'CAPSULE',recommendedDailyAmount:1,dataQuality:'COMPLETE',nutrients:{OMEGA3:240,VITAMIN_E:2}},
  {id:'supp-multi',name:'데일리 멀티',brand:'우애영 데모',type:'SUPPLEMENT',servingAmount:1,servingUnit:'TABLET',recommendedDailyAmount:1,dataQuality:'COMPLETE',nutrients:{VITAMIN_D:4,VITAMIN_E:6,ZINC:5}},
  {id:'supp-zinc',name:'아연 케어',brand:'우애영 데모',type:'SUPPLEMENT',servingAmount:1,servingUnit:'TABLET',recommendedDailyAmount:1,dataQuality:'COMPLETE',nutrients:{ZINC:7}},
]
const byId = new Map(catalog.map(product=>[product.id,product]))
const standards:Record<Profile['species'],Record<string,{minimum:number;upper:number}>> = {
  DOG:{CALCIUM:{minimum:1000,upper:2500},PHOSPHORUS:{minimum:750,upper:2000},VITAMIN_D:{minimum:12.5,upper:80},VITAMIN_E:{minimum:12,upper:100},OMEGA3:{minimum:300,upper:1200},ZINC:{minimum:18,upper:75}},
  CAT:{CALCIUM:{minimum:1250,upper:3000},PHOSPHORUS:{minimum:1000,upper:2500},VITAMIN_D:{minimum:10,upper:75},VITAMIN_E:{minimum:10,upper:100},OMEGA3:{minimum:250,upper:1000},ZINC:{minimum:20,upper:70}},
}
type Line={minimum:number;caution:number;upper:number}
const classify=(total:number,line:Line)=>total<line.minimum?'DEFICIENT':total>line.upper?'EXCESS':total>=line.caution?'CAUTION':'ADEQUATE'

export function localProducts(query=''):Product[]{const needle=query.replaceAll(' ','').toLowerCase();return catalog.filter(p=>(p.name+p.brand).replaceAll(' ','').toLowerCase().includes(needle)).map(({servingAmount:_,recommendedDailyAmount:__,nutrients:___,...product})=>product)}

type OffProduct={code?:string;product_name?:string;product_name_en?:string;brands?:string;categories_tags_en?:string[];nutriments?:Record<string,unknown>;last_modified_t?:number}
type OffResponse={products?:OffProduct[]}
const sourceBase='https://world.openpetfoodfacts.org'
function readNutrient(raw:Record<string,unknown>,key:string,target:'MG'|'UG'){
  const value=Number(raw[`${key}_100g`]);if(!Number.isFinite(value))return undefined
  const unit=String(raw[`${key}_unit`]??'g').toLowerCase()
  const mg=unit==='kg'?value*1_000_000:unit==='g'?value*1000:unit==='mg'?value:unit==='µg'||unit==='ug'?value/1000:NaN
  return Number.isFinite(mg)?(target==='UG'?mg*1000:mg):undefined
}
function convertMarket(product:OffProduct):CatalogProduct|null{
  const code=product.code?.trim(),name=(product.product_name||product.product_name_en)?.trim();if(!code||!name)return null
  // 일반 검색 결과에는 사람용 식품이나 반려동물 간식도 섞일 수 있으므로,
  // Open Pet Food Facts의 반려동물 식품 카테고리 태그가 확인된 제품만 사용한다.
  const categories=(product.categories_tags_en??[]).map(tag=>tag.toLowerCase())
  const isPetFood=categories.some(tag=>tag.includes('dog-food')||tag.includes('cat-food')||tag.includes('pet-food')||tag.includes('animal-food'))
  if(!isPetFood)return null
  const raw=product.nutriments??{},mapped:Record<string,number>={}
  const pairs:[string,string,'MG'|'UG'][]=[['CALCIUM','calcium','MG'],['PHOSPHORUS','phosphorus','MG'],['VITAMIN_D','vitamin-d','UG'],['VITAMIN_E','vitamin-e','MG'],['OMEGA3','omega-3-fat','MG'],['ZINC','zinc','MG']]
  for(const [id,key,unit] of pairs){const value=readNutrient(raw,key,unit);if(value!==undefined)mapped[id]=value}
  return{id:`off-${code}`,barcode:code,name,brand:`실제 시판 · ${product.brands?.trim()||'브랜드 미표기'}`,type:'FEED',servingAmount:100,servingUnit:'G',dataQuality:Object.keys(mapped).length?'PARTIAL':'MINIMUM_ONLY',nutrients:mapped,origin:'MARKET',sourceUrl:`${sourceBase}/product/${code}`,updatedAt:product.last_modified_t}
}
async function fetchOff(url:string){const response=await fetch(url,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`Open Pet Food Facts ${response.status}`);return response.json() as Promise<OffResponse>}
export async function marketProducts(query=''):Promise<Product[]>{
  const fields='code,product_name,product_name_en,brands,categories_tags_en,nutriments,last_modified_t'
  let responses:OffResponse[]
  if(query.trim()){
    const params=new URLSearchParams({search_terms:query.trim(),search_simple:'1',action:'process',json:'1',page_size:'20',fields})
    responses=[await fetchOff(`${sourceBase}/cgi/search.pl?${params}`)]
  }else{
    const make=(category:string)=>`${sourceBase}/api/v2/search?categories_tags_en=${category}&page_size=12&sort_by=popularity_key&fields=${fields}`
    responses=await Promise.all([fetchOff(make('dog-food')),fetchOff(make('cat-food'))])
  }
  const unique=new Map<string,CatalogProduct>()
  for(const raw of responses.flatMap(response=>response.products??[])){const product=convertMarket(raw);if(product)unique.set(product.id,product)}
  for(const product of unique.values())byId.set(product.id,product)
  return [...unique.values()].map(({servingAmount:_,recommendedDailyAmount:__,nutrients:___,...product})=>product).slice(0,20)
}

export function localAnalyze(profile:Profile,items:FeedingItem[]):Analysis{
  const ageDays=profile.age.unit==='WEEK'?profile.age.value*7:profile.age.value*30.4375
  if(ageDays<56)throw new Error('8주 미만 개체는 현재 지원하지 않습니다.')
  if(profile.species==='DOG'&&ageDays<365&&!profile.adultSize)throw new Error('12개월 미만 개는 예상 성체 체급이 필요합니다.')
  const kcal=(profile.species==='DOG'?95:100)*profile.weightKg**(profile.species==='DOG'?.75:.67)
  const lines=Object.fromEntries(Object.entries(standards[profile.species]).map(([id,x])=>[id,{minimum:kcal/1000*x.minimum,upper:kcal/1000*x.upper,caution:kcal/1000*x.upper*(profile.species==='DOG'?.75:.5)}])) as Record<string,Line>
  const totals=Object.fromEntries(nutrientMeta.map(([id])=>[id,{fromFeed:0,fromSupplements:0,source:'ACTUAL'}])) as Record<string,{fromFeed:number;fromSupplements:number;source:string}>
  const warnings:string[]=[];let estimated=false
  for(const item of items){const product=byId.get(item.productId);if(!product)throw new Error(`제품을 찾을 수 없습니다: ${item.productId}`);const bucket=product.type==='FEED'?'fromFeed':'fromSupplements';if(product.type==='FEED'&&!Object.keys(product.nutrients).length){if(profile.completeFeed){estimated=true;for(const id of Object.keys(lines)){totals[id][bucket]+=lines[id].minimum;totals[id].source='ESTIMATED'}warnings.push('사료 상세 성분이 없어 최소 권장량으로 추정했습니다.')}else warnings.push('사료 성분을 알 수 없어 사료 기여량을 0으로 계산했습니다.')}else{const ratio=item.dailyAmount/product.servingAmount;for(const [id,value] of Object.entries(product.nutrients))totals[id][bucket]+=value*ratio}}
  const summary={deficient:0,adequate:0,caution:0,excess:0}
  const results=nutrientMeta.map(([id,name,unit])=>{const total=totals[id].fromFeed+totals[id].fromSupplements,status=classify(total,lines[id]);summary[status==='DEFICIENT'?'deficient':status==='CAUTION'?'caution':status==='EXCESS'?'excess':'adequate']++;return{nutrientId:id,name,unit,fromFeed:totals[id].fromFeed,fromSupplements:totals[id].fromSupplements,total,...lines[id],status,source:totals[id].source}})
  const ratios:Analysis['ratios']={};if(profile.species==='DOG'){const value=results[1].total?results[0].total/results[1].total:null;ratios.calciumPhosphorus={value,status:value===null?'UNAVAILABLE':value<1?'LOW':value>2?'HIGH':'ADEQUATE'}}
  return{traceId:crypto.randomUUID(),standardVersion:'DEMO-2026.1',lifeStage:ageDays<365?(profile.species==='DOG'?'PUPPY':'KITTEN'):'ADULT',referenceEnergyKcal:kcal,usesEstimatedFeed:estimated,summary,nutrients:results,ratios,warnings}
}

export function localRecommend(profile:Profile,items:FeedingItem[]):Recommendation{
  const base=localAnalyze(profile,items),current=Object.fromEntries(base.nutrients.map(n=>[n.nutrientId,n.total])),original=Object.fromEntries(base.nutrients.map(n=>[n.nutrientId,n.status])),lines=Object.fromEntries(base.nutrients.map(n=>[n.nutrientId,{minimum:n.minimum!,caution:n.caution!,upper:n.upper!}]))
  const selected:Recommendation['items']=[],excluded:Recommendation['excluded']=[]
  for(const product of catalog.filter(p=>p.type==='SUPPLEMENT')){const projected={...current};for(const [id,value] of Object.entries(product.nutrients))projected[id]+=value;const statuses=Object.fromEntries(Object.entries(projected).map(([id,value])=>[id,classify(value,lines[id])]));const harmful=Object.keys(statuses).filter(id=>['CAUTION','EXCESS'].includes(statuses[id])&&!['CAUTION','EXCESS'].includes(original[id]));if(harmful.length){excluded.push({productId:product.id,name:product.name,reason:`주의·과다 예상: ${harmful.map(id=>nutrientMeta.find(n=>n[0]===id)?.[1]).join(', ')}`});continue}const fixed=Object.keys(original).filter(id=>original[id]==='DEFICIENT'&&statuses[id]!=='DEFICIENT').length;selected.push({productId:product.id,name:product.name,dailyAmount:1,unit:product.servingUnit,score:fixed*10+1,fixedNutrients:fixed})}
  selected.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'ko'))

  return {
    message: base.summary.deficient ? '부족 성분과 안전 여유를 함께 고려했습니다.' : '현재 급여 구성이 기준 범위 안에 있어 추가 제품이 필요하지 않습니다.',
    usesEstimatedFeed: base.usesEstimatedFeed,
    items: selected.filter(s => s.fixedNutrients > 0).slice(0, 3),
    excluded
  }
}
