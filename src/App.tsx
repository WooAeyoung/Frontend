import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Heart, Info, PawPrint, Plus, Search, ShieldCheck, Trash2, TriangleAlert } from 'lucide-react'
import { Analysis, FeedingItem, getProducts, Product, Profile, Recommendation, analyze, recommend } from './api'

const initialProfile: Profile = {name:'',species:'DOG',weightKg:5,age:{value:24,unit:'MONTH'},completeFeed:true}
const labels:Record<string,string> = {DEFICIENT:'부족',ADEQUATE:'적정',ADEQUATE_NO_UPPER_LIMIT:'적정 · 상한 없음',CAUTION:'주의',EXCESS:'과다'}
const units:Record<string,string> = {G:'g',TABLET:'정',CAPSULE:'캡슐'}

export function App(){
  const [step,setStep]=useState(1)
  const [profile,setProfile]=useState<Profile>(()=>{try{return JSON.parse(localStorage.getItem('wooaeyoung-profile')||'null')||initialProfile}catch{return initialProfile}})
  const [products,setProducts]=useState<Product[]>([])
  const [query,setQuery]=useState('')
  const [items,setItems]=useState<FeedingItem[]>([])
  const [result,setResult]=useState<Analysis|null>(null)
  const [recs,setRecs]=useState<Recommendation|null>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  useEffect(()=>{getProducts(query).then(x=>setProducts(x.items)).catch(e=>setError(e.message))},[query])
  const profileValid = profile.name.trim() && profile.weightKg>0 && profile.age.value>0 && !(profile.species==='DOG' && profile.age.unit==='MONTH' && profile.age.value<12 && !profile.adultSize)
  const visibleProducts = useMemo(()=>products.filter(p=>!items.some(i=>i.productId===p.id)),[products,items])

  function updateProfile<K extends keyof Profile>(key:K,value:Profile[K]){setProfile({...profile,[key]:value});setResult(null);setRecs(null)}
  function addProduct(p:Product){setItems([...items,{productId:p.id,name:p.name,type:p.type,dailyAmount:p.type==='FEED'?80:1,unit:p.servingUnit}]);setQuery('');setResult(null);setRecs(null)}
  function saveProfile(){localStorage.setItem('wooaeyoung-profile',JSON.stringify(profile));setStep(2)}
  async function run(){setBusy(true);setError('');try{const data=await analyze(profile,items);setResult(data);setStep(3);setRecs(null)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  async function loadRecs(){setBusy(true);setError('');try{setRecs(await recommend(profile,items))}catch(e){setError((e as Error).message)}finally{setBusy(false)}}

  return <div className="app">
    <header><a className="brand" href="#"><span><PawPrint size={21}/></span>우애영</a><div className="header-note">사료와 영양제를 함께 계산해요</div></header>
    <main>
      <div className="steps" aria-label="진행 단계">{['반려동물','급여 제품','분석 결과'].map((name,i)=><div key={name} className={`step ${step===i+1?'active':''} ${step>i+1?'done':''}`}><span>{step>i+1?<Check size={14}/>:i+1}</span>{name}</div>)}</div>
      {error&&<div className="alert error" role="alert"><TriangleAlert size={18}/>{error}<button onClick={()=>setError('')}>닫기</button></div>}
      {step===1&&<ProfileStep profile={profile} update={updateProfile} valid={!!profileValid} next={saveProfile}/>} 
      {step===2&&<ProductsStep query={query} setQuery={setQuery} products={visibleProducts} items={items} add={addProduct} updateItems={setItems} back={()=>setStep(1)} run={run} busy={busy}/>} 
      {step===3&&result&&<ResultStep result={result} recs={recs} back={()=>setStep(2)} loadRecs={loadRecs} busy={busy}/>} 
    </main>
    <footer>본 서비스는 영양 정보 확인을 돕는 데모이며 수의학적 진단이나 처방을 대신하지 않습니다.</footer>
  </div>
}

function ProfileStep({profile,update,valid,next}:{profile:Profile;update:<K extends keyof Profile>(key:K,value:Profile[K])=>void;valid:boolean;next:()=>void}){
  const puppy=profile.species==='DOG'&&profile.age.unit==='MONTH'&&profile.age.value<12
  return <section className="panel intro-grid"><div className="intro"><div className="eyebrow"><Heart size={15}/> 첫 번째 단계</div><h1>우리 아이에게 맞는<br/>기준부터 계산해요.</h1><p>품종이나 질환 정보는 받지 않아요. 종, 체중, 나이만으로 영양 기준을 계산합니다.</p><div className="privacy"><ShieldCheck/>입력 정보는 이 브라우저에만 저장됩니다.</div></div><div className="form-card"><h2>반려동물 정보</h2><label>이름<input value={profile.name} maxLength={30} placeholder="예: 몽이" onChange={e=>update('name',e.target.value)}/></label><fieldset><legend>종</legend><div className="segments"><button className={profile.species==='DOG'?'selected':''} onClick={()=>update('species','DOG')}>강아지</button><button className={profile.species==='CAT'?'selected':''} onClick={()=>update('species','CAT')}>고양이</button></div></fieldset><div className="two"><label>체중 (kg)<input type="number" min="0.1" max="100" step="0.1" value={profile.weightKg} onChange={e=>update('weightKg',Number(e.target.value))}/></label><label>나이<div className="input-group"><input type="number" min="1" value={profile.age.value} onChange={e=>update('age',{...profile.age,value:Number(e.target.value)})}/><select value={profile.age.unit} onChange={e=>update('age',{...profile.age,unit:e.target.value as 'WEEK'|'MONTH'})}><option value="MONTH">개월</option><option value="WEEK">주</option></select></div></label></div>{puppy&&<label>예상 성체 체급<select value={profile.adultSize??''} onChange={e=>update('adultSize',e.target.value)}><option value="">선택해주세요</option>{['S','M','L','XL','XXL'].map(x=><option key={x}>{x}</option>)}</select><small>12개월 미만 강아지는 성장 기준 계산에 필요해요.</small></label>}<label className="check"><input type="checkbox" checked={profile.completeFeed} onChange={e=>update('completeFeed',e.target.checked)}/><span><b>완전사료를 급여 중이에요</b><small>성분표가 없는 사료는 최소 권장량으로 추정합니다.</small></span></label><button className="primary full" disabled={!valid} onClick={next}>급여 제품 입력으로 <ChevronRight size={18}/></button></div></section>
}

function ProductsStep({query,setQuery,products,items,add,updateItems,back,run,busy}:{query:string;setQuery:(x:string)=>void;products:Product[];items:FeedingItem[];add:(p:Product)=>void;updateItems:(x:FeedingItem[])=>void;back:()=>void;run:()=>void;busy:boolean}){
  return <section><div className="section-head"><button className="back" onClick={back}><ArrowLeft/>반려동물 정보</button><h1>하루에 먹는 제품을 알려주세요.</h1><p>사료와 영양제를 모두 더해 하루 총 섭취량을 계산합니다.</p></div><div className="product-layout"><div className="search-card"><h2>제품 찾기</h2><div className="search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="제품명이나 브랜드 검색"/></div><div className="results">{products.map(p=><button key={p.id} className="product-result" onClick={()=>add(p)}><span className={`type ${p.type.toLowerCase()}`}>{p.type==='FEED'?'사료':'영양제'}</span><span><b>{p.name}</b><small>{p.brand} · {p.dataQuality==='MINIMUM_ONLY'?'성분 추정':'성분표 있음'}</small></span><Plus/></button>)}{products.length===0&&<div className="empty">검색 결과가 없습니다.<small>수동 성분 입력은 다음 버전에서 제공됩니다.</small></div>}</div></div><div className="feeding-list"><div className="list-title"><h2>현재 급여 목록</h2><span>{items.length}개</span></div>{items.length===0?<div className="empty large"><PawPrint/><b>등록된 제품이 없어요</b><small>왼쪽에서 제품을 선택해주세요.</small></div>:items.map((item,index)=><div className="feeding-item" key={item.productId}><div><span className={`type ${item.type.toLowerCase()}`}>{item.type==='FEED'?'사료':'영양제'}</span><h3>{item.name}</h3></div><label>하루 급여량<div className="amount"><input type="number" min="0.1" step="0.1" value={item.dailyAmount} onChange={e=>{const next=[...items];next[index]={...item,dailyAmount:Number(e.target.value)};updateItems(next)}}/><span>{units[item.unit]??item.unit}</span></div></label><button className="icon" aria-label={`${item.name} 삭제`} onClick={()=>updateItems(items.filter((_,i)=>i!==index))}><Trash2/></button></div>)}<div className="action-bar"><div><b>분석 준비</b><small>{items.length?`${items.length}개 제품의 영양성분을 계산합니다.`:'제품을 하나 이상 추가해주세요.'}</small></div><button className="primary" disabled={!items.length||items.some(x=>x.dailyAmount<=0)||busy} onClick={run}>{busy?'계산 중…':'영양 분석하기'} <ChevronRight/></button></div></div></div></section>
}

function ResultStep({result,recs,back,loadRecs,busy}:{result:Analysis;recs:Recommendation|null;back:()=>void;loadRecs:()=>void;busy:boolean}){
  const order=['excess','caution','deficient','adequate']
  return <section><div className="section-head result-head"><button className="back" onClick={back}><ArrowLeft/>급여 제품 수정</button><div><span className="eyebrow">기준 {result.standardVersion}</span><h1>오늘의 영양 분석</h1><p>기준 열량 {result.referenceEnergyKcal.toFixed(0)} kcal · {result.lifeStage}</p></div></div>{result.warnings.map(x=><div className="alert warning" key={x}><Info/>{x}</div>)}<div className="summary">{order.map(k=><div className={`summary-card ${k}`} key={k}><span>{({deficient:'부족',adequate:'적정',caution:'주의',excess:'과다'} as Record<string,string>)[k]}</span><b>{result.summary[k]}</b></div>)}</div><div className="nutrients">{[...result.nutrients].sort((a,b)=>['EXCESS','CAUTION','DEFICIENT'].indexOf(a.status)-['EXCESS','CAUTION','DEFICIENT'].indexOf(b.status)).map(n=><Nutrient key={n.nutrientId} n={n}/>)}</div>{result.ratios.calciumPhosphorus&&<div className="ratio"><div><span>칼슘 : 인 비율</span><b>{result.ratios.calciumPhosphorus.value?.toFixed(2)??'계산 불가'} : 1</b></div><span className={`badge ${result.ratios.calciumPhosphorus.status.toLowerCase()}`}>{result.ratios.calciumPhosphorus.status==='ADEQUATE'?'적정':'확인 필요'}</span></div>}<div className="recommend-box"><div><span className="eyebrow"><ShieldCheck/> 조합 안전성 검사</span><h2>지금 조합에 맞는 영양제 후보</h2><p>후보를 가상으로 추가해 주의·과다 여부를 다시 계산합니다.</p></div><button className="primary" disabled={busy} onClick={loadRecs}>{busy?'검사 중…':recs?'다시 계산':'추천 확인하기'}</button></div>{recs&&<div className="recommendations"><p>{recs.message}</p><div className="rec-grid">{recs.items.map((x,i)=><article key={x.productId}><span className="rank">{i+1}</span><h3>{x.name}</h3><p>하루 {x.dailyAmount}{units[x.unit]??x.unit}</p><small>부족 보완 {x.fixedNutrients}개 · 점수 {x.score}</small></article>)}{!recs.items.length&&<div className="empty large">안전 조건을 만족하는 후보가 없습니다.</div>}</div>{recs.excluded.length>0&&<details><summary>제외된 후보 {recs.excluded.length}개</summary>{recs.excluded.map(x=><p key={x.productId}><b>{x.name}</b> — {x.reason}</p>)}</details>}</div>}</section>
}

function Nutrient({n}:{n:Analysis['nutrients'][number]}){
  const cap=n.upper??(Math.max(n.total,n.minimum??0)*1.2||1)
  const feed=Math.min(100,n.fromFeed/cap*100), supp=Math.min(100-feed,n.fromSupplements/cap*100)
  const marker=(v:number|null)=>v==null?null:Math.min(100,v/cap*100)
  return <article className="nutrient"><div className="nutrient-head"><div><h3>{n.name}</h3>{n.source==='ESTIMATED'&&<span className="estimate">추정</span>}</div><span className={`badge ${n.status.toLowerCase()}`}>{labels[n.status]??n.status}</span></div><div className="total"><b>{n.total.toFixed(2)}</b> {n.unit.toLowerCase()}<small>사료 {n.fromFeed.toFixed(1)} + 영양제 {n.fromSupplements.toFixed(1)}</small></div><div className="bar" aria-label={`${n.name} 총 ${n.total.toFixed(2)} ${n.unit}`}><span className="feed" style={{width:`${feed}%`}}/><span className="supp" style={{width:`${supp}%`}}/>{n.minimum!==null&&<i className="marker min" style={{left:`${marker(n.minimum)}%`}}/>}{n.caution!==null&&<i className="marker caution" style={{left:`${marker(n.caution)}%`}}/>}{n.upper!==null&&<i className="marker upper" style={{left:`${marker(n.upper)}%`}}/>}</div><div className="scale"><span>최소 {n.minimum?.toFixed(1)??'없음'}</span><span>주의 {n.caution?.toFixed(1)??'없음'}</span><span>상한 {n.upper?.toFixed(1)??'없음'}</span></div></article>
}

