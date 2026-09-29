import { useEffect, useState } from 'react'
import { analyze, getProducts, recommend } from './api'
import type { Analysis, FeedingItem, ManualItem, Product, Profile, Recommendation } from './api'
import { saveRecord } from './Records'

const STATUS: Record<string, string> = { DEFICIENT: '부족', ADEQUATE: '적정', CAUTION: '주의', EXCESS: '과다' }
const RATIO: Record<string, string> = { LOW: '낮음', HIGH: '높음', ADEQUATE: '적정', UNAVAILABLE: '계산 불가' }
const UNIT: Record<string, string> = { TABLET: '정', CAPSULE: '캡슐', G: 'g', MG: 'mg', ML: 'mL' }
const fmt = (v: number | null) => (v === null ? '-' : v.toFixed(1))

export default function AnalysisPage({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState<'DOG' | 'CAT'>('DOG')
  const [weight, setWeight] = useState('')
  const [ageValue, setAgeValue] = useState('')
  const [ageUnit, setAgeUnit] = useState<'WEEK' | 'MONTH'>('MONTH')
  const [adultSize, setAdultSize] = useState('MEDIUM')
  const [completeFeed, setCompleteFeed] = useState(true)
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Product[]>([])
  const [items, setItems] = useState<FeedingItem[]>([])
  const [manualItems, setManualItems] = useState<ManualItem[]>([])
  const [manual, setManual] = useState({ name: '', type: 'SUPPLEMENT' as 'FEED' | 'SUPPLEMENT', amount: '1', unit: 'TABLET', daily: '1', nutrients: { CALCIUM: '', PHOSPHORUS: '', VITAMIN_D: '', VITAMIN_E: '', OMEGA3: '', ZINC: '' } as Record<string, string> })
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [rec, setRec] = useState<Recommendation | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getProducts(query).then(r => setFound(r.items)).catch(() => setFound([]))
  }, [query])

  const ageDays = ageUnit === 'WEEK' ? Number(ageValue) * 7 : Number(ageValue) * 30.4375
  const needSize = species === 'DOG' && ageDays > 0 && ageDays < 365
  const profile: Profile = {
    name: name || '우리 아이', species, weightKg: Number(weight),
    age: { value: Number(ageValue), unit: ageUnit }, completeFeed,
    ...(needSize ? { adultSize } : {}),
  }

  const add = (p: { id: string; name: string; type: 'FEED' | 'SUPPLEMENT'; servingUnit: string }, amount?: number) => {
    if (items.some(i => i.productId === p.id)) return
    setItems([...items, { productId: p.id, name: p.name, type: p.type, unit: p.servingUnit, dailyAmount: amount ?? (p.type === 'FEED' ? 100 : 1) }])
  }
  const setAmount = (id: string, v: string) => setItems(items.map(i => (i.productId === id ? { ...i, dailyAmount: Number(v) } : i)))

  async function addRecommendation(r: Recommendation['items'][number]) {
    const nextItems = [...items, { productId: r.productId, name: r.name, type: 'SUPPLEMENT' as const, unit: r.unit, dailyAmount: r.dailyAmount }]
    setItems(nextItems)
    setLoading(true); setError(''); setSaved(false)
    try {
      const [nextAnalysis, nextRecommendation] = await Promise.all([analyze(profile, nextItems), recommend(profile, nextItems)])
      setAnalysis(nextAnalysis); setRec(nextRecommendation)
    } catch (e) {
      setError(e instanceof Error ? e.message : '추가한 제품을 다시 분석하지 못했습니다.')
    } finally { setLoading(false) }
  }

  async function run() {
    setError(''); setSaved(false)
    if (!(Number(weight) > 0) || !(Number(ageValue) > 0)) { setError('체중과 나이를 입력해 주세요.'); return }
    if (items.length === 0 && manualItems.length === 0) { setError('급여 중인 제품을 하나 이상 추가해 주세요.'); return }
    setLoading(true)
    try {
      const [a, r] = await Promise.all([analyze(profile, items, manualItems), recommend(profile, items)])
      setAnalysis(a); setRec(r)
    } catch (e) {
      setAnalysis(null); setRec(null)
      setError(e instanceof Error ? e.message : '요청을 처리하지 못했습니다.')
    } finally { setLoading(false) }
  }

  function saveManual() {
    const nutrients = Object.entries(manual.nutrients).filter(([, value]) => Number(value) >= 0 && value !== '').map(([nutrientId, value]) => ({ nutrientId, amount: Number(value), unit: nutrientId === 'VITAMIN_D' ? 'UG' : 'MG' }))
    if (!manual.name.trim() || !nutrients.length || Number(manual.amount) <= 0 || Number(manual.daily) <= 0) { setError('직접 입력 제품명, 급여량, 영양성분을 하나 이상 입력해 주세요.'); return }
    setManualItems([...manualItems, { name: manual.name.trim(), type: manual.type, servingAmount: Number(manual.amount), servingUnit: manual.unit, dailyAmount: Number(manual.daily), nutrients }])
    setManual({ ...manual, name: '', nutrients: Object.fromEntries(Object.keys(manual.nutrients).map(key => [key, ''])) })
    setError('')
  }

  function save() {
    if (!analysis) return
    saveRecord({ id: analysis.traceId, date: new Date().toISOString(), name: profile.name, species, items: items.map(i => `${i.name} ${i.dailyAmount}${i.unit}`), summary: analysis.summary })
    setSaved(true); onSaved()
  }

  return (
    <div className="w page">
      <h2>영양제 성분 분석</h2><p className="lead">프로필을 입력하고 급여 중인 사료·영양제를 추가하면 하루 영양소 총량을 계산합니다.</p>

      <div className="panel"><h3>1. 반려동물 프로필</h3>
        <div className="grid2">
          <label className="f">이름<input className="in" value={name} onChange={e => setName(e.target.value)} placeholder="예: 보리" /></label>
          <label className="f">종<select className="in" value={species} onChange={e => setSpecies(e.target.value as 'DOG' | 'CAT')}><option value="DOG">강아지</option><option value="CAT">고양이</option></select></label>
          <label className="f">체중(kg)<input className="in" type="number" min="0" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} /></label>
          <label className="f">나이<input className="in" type="number" min="0" value={ageValue} onChange={e => setAgeValue(e.target.value)} /></label>
          <label className="f">나이 단위<select className="in" value={ageUnit} onChange={e => setAgeUnit(e.target.value as 'WEEK' | 'MONTH')}><option value="MONTH">개월</option><option value="WEEK">주</option></select></label>
          {needSize && <label className="f">예상 성체 체급<select className="in" value={adultSize} onChange={e => setAdultSize(e.target.value)}><option value="SMALL">소형</option><option value="MEDIUM">중형</option><option value="LARGE">대형</option></select></label>}
        </div>
        <label className="chk"><input type="checkbox" checked={completeFeed} onChange={e => setCompleteFeed(e.target.checked)} />주식으로 완전사료를 먹고 있어요</label>
      </div>

      <div className="panel"><h3>2. 급여 제품</h3>
        <input className="in" style={{ width: '100%' }} placeholder="제품 검색" value={query} onChange={e => setQuery(e.target.value)} />
        <ul className="plist">
          {found.map(p => (
            <li key={p.id}><span><span className="tag">{p.type === 'FEED' ? '사료' : '영양제'}</span>{p.name} <small>{p.brand}</small></span>
              <button className="btn ghost" onClick={() => add(p)} disabled={items.some(i => i.productId === p.id)}>추가</button></li>
          ))}
          {found.length === 0 && <li className="note">검색 결과가 없습니다.</li>}
        </ul>
        {items.length > 0 && <>
          <h3 style={{ marginTop: 18 }}>급여 목록 (하루)</h3>
          <ul className="plist">
            {items.map(i => (
              <li key={i.productId}><span><span className="tag">{i.type === 'FEED' ? '사료' : '영양제'}</span>{i.name}</span>
                <span><input className="in amt" type="number" min="0" step="any" value={i.dailyAmount} onChange={e => setAmount(i.productId, e.target.value)} /> {i.unit}{' '}
                  <button className="btn ghost" onClick={() => setItems(items.filter(x => x.productId !== i.productId))}>삭제</button></span></li>
            ))}
          </ul></>}
      </div>

      <div className="panel"><h3>직접 입력한 제품·영양소 저장</h3><p className="note">검색되지 않는 제품은 라벨의 1회 제공량과 영양성분을 직접 입력해 함께 계산할 수 있습니다.</p>
        <div className="grid2"><label className="f">제품명<input className="in" value={manual.name} onChange={e => setManual({ ...manual, name: e.target.value })} placeholder="예: 우리집 관절 영양제" /></label><label className="f">구분<select className="in" value={manual.type} onChange={e => setManual({ ...manual, type: e.target.value as 'FEED' | 'SUPPLEMENT' })}><option value="SUPPLEMENT">영양제</option><option value="FEED">사료</option></select></label><label className="f">1회 제공량<input className="in" type="number" min="0.1" value={manual.amount} onChange={e => setManual({ ...manual, amount: e.target.value })} /></label><label className="f">단위<select className="in" value={manual.unit} onChange={e => setManual({ ...manual, unit: e.target.value })}><option value="TABLET">정</option><option value="CAPSULE">캡슐</option><option value="G">g</option></select></label><label className="f">하루 급여량<input className="in" type="number" min="0.1" value={manual.daily} onChange={e => setManual({ ...manual, daily: e.target.value })} /></label></div>
        <div className="grid2" style={{ marginTop: 12 }}>{[['CALCIUM','칼슘 (mg)'],['PHOSPHORUS','인 (mg)'],['VITAMIN_D','비타민 D (µg)'],['VITAMIN_E','비타민 E (mg)'],['OMEGA3','오메가3 (mg)'],['ZINC','아연 (mg)']].map(([id, label]) => <label className="f" key={id}>{label}<input className="in" type="number" min="0" value={manual.nutrients[id]} onChange={e => setManual({ ...manual, nutrients: { ...manual.nutrients, [id]: e.target.value } })} /></label>)}</div>
        <button className="btn" style={{ marginTop: 14 }} onClick={saveManual}>직접 입력 제품 저장</button>
        {manualItems.length > 0 && <ul className="plist">{manualItems.map((item, index) => <li key={`${item.name}-${index}`}><span><span className="tag">직접 입력</span>{item.name}</span><button className="btn ghost" onClick={() => setManualItems(manualItems.filter((_, i) => i !== index))}>삭제</button></li>)}</ul>}
      </div>

      {error && <div className="err" role="alert">{error}</div>}
      <button className="btn" onClick={run} disabled={loading}>{loading ? '분석 중…' : '분석하기'}</button>

      {analysis && (
        <div className="panel" style={{ marginTop: 24 }}><h3>3. 분석 결과</h3>
          <div className="sum">
            <div><b>{analysis.summary.deficient ?? 0}</b>부족</div><div><b>{analysis.summary.adequate ?? 0}</b>적정</div>
            <div><b>{analysis.summary.caution ?? 0}</b>주의</div><div><b>{analysis.summary.excess ?? 0}</b>과다</div>
          </div>
          <div className="note">하루 기준 에너지 약 {Math.round(analysis.referenceEnergyKcal)}kcal · 기준 {analysis.standardVersion}</div>
          <div className="tw"><table>
            <thead><tr><th>영양소</th><th>사료</th><th>영양제</th><th>합계</th><th>최소</th><th>상한</th><th>상태</th></tr></thead>
            <tbody>{analysis.nutrients.map(n => (
              <tr key={n.nutrientId}><td>{n.name} ({n.unit.toLowerCase()})</td><td>{fmt(n.fromFeed)}</td><td>{fmt(n.fromSupplements)}</td><td>{fmt(n.total)}</td><td>{fmt(n.minimum)}</td><td>{fmt(n.upper)}</td>
                <td className={`st ${n.status}`}>{STATUS[n.status] ?? n.status}</td></tr>))}</tbody>
          </table></div>
          {Object.entries(analysis.ratios).map(([k, v]) => <p key={k} className="note">{k === 'calciumPhosphorus' ? '칼슘:인 비율' : k} {fmt(v.value)} ({RATIO[v.status] ?? v.status})</p>)}
          {analysis.warnings.length > 0 && <ul className="warns">{analysis.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
          <p style={{ marginTop: 14 }}><button className="btn" onClick={save} disabled={saved}>{saved ? '저장됨' : '기록으로 저장'}</button></p>
        </div>
      )}

      {rec && (
        <div className="panel"><h3>추천 영양제</h3><p className="note">{rec.message}</p>
          <ul className="plist">
            {rec.items.map(r => (
              <li key={r.productId}><span>{r.name} <small>하루 {r.dailyAmount} {UNIT[r.unit] ?? r.unit} · 부족 성분 {r.fixedNutrients}종 보완</small></span>
                <button className="btn ghost" onClick={() => addRecommendation(r)} disabled={items.some(i => i.productId === r.productId) || loading}>급여 목록에 추가</button></li>))}
            {rec.items.length === 0 && <li className="note">추가로 권장할 제품이 없습니다.</li>}
          </ul>
          {rec.excluded.length > 0 && <details><summary className="note">제외된 제품 {rec.excluded.length}개</summary><ul className="warns">{rec.excluded.map(x => <li key={x.productId}>{x.name}: {x.reason}</li>)}</ul></details>}
        </div>
      )}
      <p className="note">현재 영양 기준·제품 데이터는 기능 검증용 데모이며 수의학적 처방을 대체하지 않습니다.</p>
    </div>
  )
}
