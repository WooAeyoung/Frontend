import { useEffect, useRef, useState } from 'react'
import { analyze, getProducts, recommend, STANDARD_OPTIONS } from './api'
import type { Analysis, FeedingItem, ManualItem, Product, Profile, Recommendation, StandardProfile } from './api'
import { loadImportedPdfCount, loadRecords, saveRecord, type SavedRecord } from './Records'
import { loadAnalysisProfiles, saveAnalysisProfile } from './analysisProfiles'
import type { AnalysisDraft } from './Home'
import PetCompanion from './PetCompanion'
import { formatNumber } from './format/number'
import { hasUnjudgedNutrients, nutrientSourceLabel } from './analysisSafety'
import { nutritionOneLine } from './nutritionInsight'
import { createWorker } from 'tesseract.js'

const STEPS: [string, string, string, string][] = [['step-1', '반려동물 정보', 'Pet profile', 'プロフィール'], ['step-2', '직접 입력', 'Add products', '製品を入力'], ['step-3', '분석 결과', 'Analysis results', '分析結果']]

function StepNav({ language }: { language: 'ko' | 'en' | 'ja' }) {
  const [active, setActive] = useState('step-1')
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (hit) setActive(hit.target.id)
    }, { rootMargin: '-120px 0px -55% 0px' })
    STEPS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return <nav className="step-nav" aria-label={language === 'en' ? 'Analysis steps' : language === 'ja' ? '分析の手順' : '분석 진행 순서'}><div>{STEPS.map(([id, ko, en, ja], i) => <button key={id} type="button" className={active === id ? 'on' : ''} aria-current={active === id ? 'step' : undefined} onClick={() => go(id)}><b>{i + 1}</b><span>{language === 'en' ? en : language === 'ja' ? ja : ko}</span></button>)}</div></nav>
}

const STATUS: Record<string, string> = { DEFICIENT: '부족', ADEQUATE: '적정', ADEQUATE_NO_UPPER_LIMIT: '적정 · 상한 없음', NO_STANDARD: '기준 없음', CAUTION: '주의', EXCESS: '과다', UNSUPPORTED: '분석 불가', UNVERIFIED_STANDARD: '기준 검증 대기', INSUFFICIENT_DATA: '정보 부족', UNIT_CONVERSION_UNSUPPORTED: '단위 환산 불가' }
const RATIO: Record<string, string> = { LOW: '낮음', HIGH: '높음', ADEQUATE: '적정', UNAVAILABLE: '계산 불가' }
const UNIT: Record<string, string> = { TABLET: '정', CAPSULE: '캡슐', G: 'g', MG: 'mg', ML: 'mL' }
const STATUS_EN: Record<string, string> = { DEFICIENT: 'Low', ADEQUATE: 'Adequate', ADEQUATE_NO_UPPER_LIMIT: 'Adequate · no upper limit', NO_STANDARD: 'No standard', CAUTION: 'Caution', EXCESS: 'High', UNSUPPORTED: 'Not analyzed', UNVERIFIED_STANDARD: 'Standard verification pending', INSUFFICIENT_DATA: 'Insufficient information', UNIT_CONVERSION_UNSUPPORTED: 'Unit conversion unavailable' }
const STATUS_JA: Record<string, string> = { DEFICIENT: '不足', ADEQUATE: '適正', ADEQUATE_NO_UPPER_LIMIT: '適正 · 上限なし', NO_STANDARD: '基準なし', CAUTION: '注意', EXCESS: '過剰', UNSUPPORTED: '分析対象外', UNVERIFIED_STANDARD: '基準の検証待ち', INSUFFICIENT_DATA: '情報不足', UNIT_CONVERSION_UNSUPPORTED: '単位換算不可' }
const statusText = (status: string, language: 'ko' | 'en' | 'ja') => language === 'en' ? STATUS_EN[status] ?? status : language === 'ja' ? STATUS_JA[status] ?? status : STATUS[status] ?? status
const localize = (language: 'ko' | 'en' | 'ja', ko: string, en: string, ja: string) => language === 'en' ? en : language === 'ja' ? ja : ko
const nutrientLabel = (id: string, fallback: string, language: 'ko' | 'en' | 'ja') => {
  if (language === 'ko') return fallback
  const labels: Record<string, [string, string]> = {
    TAURINE: ['Taurine (dry food)', 'タウリン（ドライフード）'], EPA_DHA: ['EPA+DHA', 'EPA+DHA'], CALCIUM: ['Calcium', 'カルシウム'], PHOSPHORUS: ['Phosphorus', 'リン'], COPPER: ['Copper (dry food)', '銅（ドライフード）'], IODINE: ['Iodine', 'ヨウ素'], IRON: ['Iron', '鉄'], MANGANESE: ['Manganese', 'マンガン'], SELENIUM: ['Selenium', 'セレン'], ZINC: ['Zinc', '亜鉛'], VITAMIN_A: ['Vitamin A', 'ビタミンA'], VITAMIN_D: ['Vitamin D', 'ビタミンD'], VITAMIN_E: ['Vitamin E', 'ビタミンE'], VITAMIN_B1: ['Vitamin B1', 'ビタミンB1'], VITAMIN_B6: ['Vitamin B6', 'ビタミンB6'], VITAMIN_B12: ['Vitamin B12', 'ビタミンB12'], VITAMIN_B9: ['Folate', '葉酸'], VITAMIN_B7: ['Biotin', 'ビオチン']
  }
  const label = labels[id]
  return label ? label[language === 'en' ? 0 : 1] : fallback
}
const nutrientSourceText = (nutrient: Analysis['nutrients'][number], language: 'ko' | 'en' | 'ja') => {
  if (language === 'ko') return nutrientSourceLabel(nutrient)
  if (nutrient.total == null) return language === 'en' ? 'Not calculated' : '計算不可'
  if (nutrient.unknownContribution) return language === 'en' ? 'Some data missing' : '一部情報なし'
  return nutrient.source === 'ESTIMATED' ? (language === 'en' ? 'Includes food estimate' : 'フードの推定値を含む') : (language === 'en' ? 'Product label value' : '製品ラベルの値')
}
const MANUAL_NUTRIENTS: [string, string, string][] = [
  ['TAURINE', '타우린 (건사료)', 'G'], ['EPA_DHA', 'EPA+DHA', 'G'],
  ['CALCIUM', '칼슘', 'MG'], ['PHOSPHORUS', '인', 'MG'], ['COPPER', '구리 (건사료)', 'MG'],
  ['IODINE', '요오드', 'MG'], ['IRON', '철', 'MG'], ['MANGANESE', '망간', 'MG'],
  ['SELENIUM', '셀레늄', 'UG'], ['ZINC', '아연', 'MG'], ['VITAMIN_A', '비타민 A', 'IU'],
  ['VITAMIN_D', '비타민 D', 'UG'], ['VITAMIN_E', '비타민 E', 'MG'],
  ['VITAMIN_B1', '비타민 B1', 'MG'], ['VITAMIN_B6', '비타민 B6', 'MG'],
  ['VITAMIN_B12', '비타민 B12', 'UG'], ['VITAMIN_B9', '엽산', 'UG'], ['VITAMIN_B7', '비오틴', 'UG'],
]
const FEDIAF_IDS = new Set(['CALCIUM', 'PHOSPHORUS', 'VITAMIN_D', 'VITAMIN_E', 'OMEGA3', 'ZINC'])
const nutrientOptions = (_standard: StandardProfile): [string, string, string][] =>
  MANUAL_NUTRIENTS.map(([id, label, unit]) => [id, label, ['VITAMIN_A', 'VITAMIN_D', 'VITAMIN_E'].includes(id) ? 'IU' : unit])
const VITAMIN_FORMS: Record<string, [string, string][]> = {
  VITAMIN_A: [['RETINOL', '레티놀'], ['RETINYL_ACETATE', '레티닐 아세테이트'], ['RETINYL_PROPIONATE', '레티닐 프로피오네이트'], ['RETINYL_PALMITATE', '레티닐 팔미테이트'], ['RETINOL_EQUIVALENT', '레티놀 당량']],
  VITAMIN_D: [['CHOLECALCIFEROL', '비타민 D3']],
  VITAMIN_E: [['DL_ALPHA_TOCOPHERYL_ACETATE', 'dl-α 토코페릴 아세테이트'], ['D_ALPHA_TOCOPHEROL', 'd-α 토코페롤'], ['D_ALPHA_TOCOPHERYL_ACETATE', 'd-α 토코페릴 아세테이트'], ['DL_ALPHA_TOCOPHEROL', 'dl-α 토코페롤']],
}
const fmt = formatNumber
const ADULT_SIZE_WEIGHT: Record<string, number> = { S: 7, M: 15, L: 27.5, XL: 47.5, XXL: 60 }
const adultSizeFromWeight = (weight?: number) => weight === 7 ? 'S' : weight === 15 ? 'M' : weight === 27.5 ? 'L' : weight === 47.5 ? 'XL' : weight === 60 ? 'XXL' : ''
const LABEL_ALIASES: [string, string][] = [['타우린', 'TAURINE'], ['epa+dha', 'EPA_DHA'], ['칼슘', 'CALCIUM'], ['칼숨', 'CALCIUM'], ['칼습', 'CALCIUM'], ['za', 'CALCIUM'], ['인', 'PHOSPHORUS'], ['구리', 'COPPER'], ['요오드', 'IODINE'], ['철', 'IRON'], ['망간', 'MANGANESE'], ['셀레늄', 'SELENIUM'], ['아연', 'ZINC'], ['비타민 a', 'VITAMIN_A'], ['비타민 d', 'VITAMIN_D'], ['비타민ㅁ', 'VITAMIN_D'], ['비타민 e', 'VITAMIN_E'], ['비타민 b1', 'VITAMIN_B1'], ['비타민 b6', 'VITAMIN_B6'], ['비타민 b12', 'VITAMIN_B12'], ['엽산', 'VITAMIN_B9'], ['비오틴', 'VITAMIN_B7']]
type NutrientFilter = 'all' | 'attention' | 'adequate'

function normalizeLabelOcrText(value: string) {
  return value
    .normalize('NFKC')
    .replace(/\\\s*\r?\n/g, '')
    .replace(/\b(?:pg|рg)\b/gi, 'ug')
    .replace(/μg|µg|㎍/gi, 'ug')
    .replace(/마그네슈(?!\S)/g, '마그네슘')
}

function NutrientBar({ nutrient, language }: { nutrient: Analysis['nutrients'][number]; language: 'ko' | 'en' | 'ja' }) {
  const ceiling = Math.max(nutrient.upper ?? 0, nutrient.caution ?? 0, nutrient.minimum ?? 0, nutrient.total ?? 0, 1)
  const percent = (value: number | null) => value === null ? null : Math.min(100, Math.max(0, value / ceiling * 100))
  const total = percent(nutrient.total) ?? 0
  const feed = percent(nutrient.fromFeed) ?? 0
  const supplements = percent(nutrient.fromSupplements) ?? 0
  const minimum = percent(nutrient.minimum)
  const caution = percent(nutrient.caution)
  const upper = percent(nutrient.upper)
  const source = nutrientSourceLabel(nutrient)
  const partial = Boolean(nutrient.unknownContribution)
  return <div className={`nutrient-bar-row ${nutrient.source === 'ESTIMATED' ? 'estimated' : ''}`}>
    <div className="nutrient-bar-head"><b>{nutrientLabel(nutrient.nutrientId, nutrient.name, language)}{nutrient.source === 'ESTIMATED' && <em className="estimate-badge">{language === 'en' ? 'Estimated' : language === 'ja' ? '推定' : '추정'}</em>}</b><span>{language === 'ko' ? source : nutrientSourceText(nutrient, language)} · {statusText(nutrient.status, language)}</span></div>
    <div className="nutrient-track" role="img" aria-label={`${nutrient.name}: ${fmt(nutrient.total)} ${nutrient.unit}, ${source}, ${statusText(nutrient.status, language)}`}>
      <span className={`nutrient-fill ${nutrient.status}`} style={{ width: `${total}%` }} />
      <span className="nutrient-segment feed" style={{ width: `${feed}%` }} title={`사료 ${fmt(nutrient.fromFeed)}`} />
      <span className="nutrient-segment supplement" style={{ left: `${feed}%`, width: `${supplements}%` }} title={`영양제 ${fmt(nutrient.fromSupplements)}`} />
      {minimum !== null && <i className="nutrient-marker minimum" style={{ left: `${minimum}%` }} title={`하한 ${fmt(nutrient.minimum)}`} />}
      {caution !== null && <i className="nutrient-marker caution" style={{ left: `${caution}%` }} title={`주의 ${fmt(nutrient.caution)}`} />}
      {upper !== null && <i className="nutrient-marker upper" style={{ left: `${upper}%` }} title={`상한 ${fmt(nutrient.upper)}`} />}
    </div>
    <div className="nutrient-bar-scale"><span>{language === 'en' ? 'Food' : language === 'ja' ? 'フード' : '사료'} {fmt(nutrient.fromFeed)} · {language === 'en' ? 'Supplements' : language === 'ja' ? 'サプリ' : '영양제'} {fmt(nutrient.fromSupplements)} · {partial ? (language === 'en' ? 'Confirmed amount only' : language === 'ja' ? '確認済みの量のみ' : '확인된 양만') : (language === 'en' ? 'Total' : language === 'ja' ? '合計' : '합계')} {fmt(nutrient.total)} {nutrient.unit.toLowerCase()}</span><span>{language === 'en' ? 'Minimum' : language === 'ja' ? '下限' : '하한'} {fmt(nutrient.minimum)} · {language === 'en' ? 'Caution' : language === 'ja' ? '注意' : '주의'} {fmt(nutrient.caution)} · {language === 'en' ? 'Upper limit' : language === 'ja' ? '上限' : '상한'} {fmt(nutrient.upper)}</span></div>
  </div>
}

export default function AnalysisPage({ onSaved, onAnalysis, initialProfileId, initialDraft, loadSeq = 0, active = true, language = 'ko' }: { onSaved: () => void; onAnalysis: (analysis: Analysis | null) => void; initialProfileId?: string; initialDraft?: AnalysisDraft; loadSeq?: number; active?: boolean; language?: 'ko' | 'en' | 'ja' }) {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState<'DOG' | 'CAT'>('DOG')
  const [weight, setWeight] = useState('')
  const [ageValue, setAgeValue] = useState('')
  const [ageUnit, setAgeUnit] = useState<'WEEK' | 'MONTH'>('MONTH')
  const [adultSize, setAdultSize] = useState('')
  const [expectedAdultWeight, setExpectedAdultWeight] = useState('')
  const [completeFeed, setCompleteFeed] = useState(true)
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [items, setItems] = useState<FeedingItem[]>([])
  const [manualItems, setManualItems] = useState<ManualItem[]>([])
  const [labelText, setLabelText] = useState('')
  const [labelNotice, setLabelNotice] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach(track => track.stop())
    cameraStreamRef.current = null
  }, [])
  const [ingredientRows, setIngredientRows] = useState<string[]>([''])
  const [dailyFrequency, setDailyFrequency] = useState('1')
  const emptyNutrients = () => Object.fromEntries(MANUAL_NUTRIENTS.map(([id]) => [id, ''])) as Record<string, string>
  const [manual, setManual] = useState({ name: '', type: 'SUPPLEMENT' as 'FEED' | 'SUPPLEMENT', amount: '1', unit: 'TABLET', daily: '1', nutrients: emptyNutrients(), units: {} as Record<string, string>, forms: {} as Record<string, string> })
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [nutrientFilter, setNutrientFilter] = useState<NutrientFilter>('all')
  const [rec, setRec] = useState<Recommendation | null>(null)
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  const [recommendationError, setRecommendationError] = useState('')
  const [error, setError] = useState('')
  const [standardProfile] = useState<StandardProfile>('NIAS_V3')
  const setStandardProfile = (_value: StandardProfile) => undefined
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profiles, setProfiles] = useState(loadAnalysisProfiles)
  const [analysisRecords, setAnalysisRecords] = useState<SavedRecord[]>(loadRecords)
  const [importedPdfCount, setImportedPdfCount] = useState(0)
  const [openAnalysisProfileId, setOpenAnalysisProfileId] = useState<string | null>(null)
  const [profileId, setProfileId] = useState('')
  useEffect(() => { setImportedPdfCount(loadImportedPdfCount(profileId || undefined)) }, [profileId])
  const [profileSaved, setProfileSaved] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const recommendationRequest = useRef(0)

  useEffect(() => {
    let active = true
    setProductsLoading(true)
    getProducts(query).then(r => {
      if (!active) return
      setFound(r.items.filter(product => product.id.includes('-cat') ? species === 'CAT' : product.id.includes('-dog') ? species === 'DOG' : true))
    }).catch(e => { if (active) { setFound([]); setError(e instanceof Error ? e.message : '제품 목록을 불러오지 못했습니다.') } }).finally(() => { if (active) setProductsLoading(false) })
    return () => { active = false }
  }, [query, species])

  const ageDays = ageUnit === 'WEEK' ? Number(ageValue) * 7 : Number(ageValue) * 30.4375
  const needSize = species === 'DOG' && ageDays > 0 && ageDays < 365
  const profile: Profile = {
    name: name || '우리 아이', species, weightKg: Number(weight),
    age: { value: Number(ageValue), unit: ageUnit }, completeFeed,
    ...(needSize ? { adultSize, expectedAdultWeightKg: Number(expectedAdultWeight) } : {}),
  }
  const profileReady = Boolean(name.trim() && Number.isFinite(Number(weight)) && Number(weight) > 0 && Number(weight) <= 100 && Number.isFinite(Number(ageValue)) && Number(ageValue) > 0 && (!needSize || (adultSize && Number.isFinite(Number(expectedAdultWeight)) && Number(expectedAdultWeight) >= Number(weight) && Number(expectedAdultWeight) <= 100)))
  const enteredNutrients = Object.values(manual.nutrients).filter(value => value.trim() !== '')
  const manualReady = Boolean(manual.name.trim() && Number.isFinite(Number(manual.amount)) && Number(manual.amount) > 0 && Number.isFinite(Number(manual.daily)) && Number(manual.daily) > 0 && enteredNutrients.length > 0 && enteredNutrients.every(value => Number.isFinite(Number(value)) && Number(value) >= 0))
  const allowedIds = new Set(nutrientOptions(standardProfile).map(([id]) => id))
  const incompatibleItems = manualItems.filter(item => item.nutrients.some(n => !allowedIds.has(n.nutrientId) || (['VITAMIN_D', 'VITAMIN_E'].includes(n.nutrientId) && (standardProfile === 'NIAS_V3') !== (n.unit === 'IU'))))
  const analysisReady = incompatibleItems.length === 0 && profileReady && (items.length > 0 || manualItems.length > 0) && items.every(item => item.dailyAmount > 0)
  const missingRequirements = [
    incompatibleItems.length ? localize(language, '선택한 기준과 맞지 않는 직접 입력 제품을 삭제하고 다시 입력', 'Remove and re-enter manually added products that do not match the selected standard', '選択した基準に合わない手入力製品を削除して再入力') : '',
    !name.trim() ? localize(language, '이름', 'name', '名前') : '',
    !(Number(weight) > 0) ? localize(language, '체중', 'weight', '体重') : '',
    !(Number(ageValue) > 0) ? localize(language, '나이', 'age', '年齢') : '',
    needSize && (!adultSize || !(Number(expectedAdultWeight) >= Number(weight))) ? localize(language, '예상 성체 체급', 'expected adult size', '成犬時の体格') : '',
    items.length === 0 && manualItems.length === 0 ? localize(language, '급여 제품', 'food or supplement', '食べている製品') : '',
    items.some(item => item.dailyAmount <= 0) ? localize(language, '올바른 급여량', 'valid daily amount', '正しい給与量') : '',
  ].filter(Boolean)
  const calciumPhosphorus = analysis?.ratios.calciumPhosphorus
  const hasUnjudged = analysis ? hasUnjudgedNutrients(analysis.nutrients) : false
  const ratioNeedsAttention = Boolean(calciumPhosphorus && ['LOW', 'HIGH'].includes(calciumPhosphorus.status))
  const compatibleProducts = found.filter(product => {
    if (product.id.includes('-cat')) return species === 'CAT'
    if (product.id.includes('-dog')) return species === 'DOG'
    return true
  })

  function loadProfile(id: string) {
    setProfileId(id)
    const fresh = loadAnalysisProfiles()
    setProfiles(fresh)
    const selected = fresh.find(item => item.id === id)
    if (!selected) return
    setName(selected.name); setSpecies(selected.species); setWeight(String(selected.weightKg))
    setAgeValue(String(selected.age.value)); setAgeUnit(selected.age.unit)
    const savedAdultSize = selected.adultSize || adultSizeFromWeight(selected.expectedAdultWeightKg)
    setAdultSize(savedAdultSize)
    setExpectedAdultWeight(selected.expectedAdultWeightKg ? String(selected.expectedAdultWeightKg) : savedAdultSize ? String(ADULT_SIZE_WEIGHT[savedAdultSize]) : '')
    setCompleteFeed(selected.completeFeed)
    setProfileSaved(false); setError('')
  }
  function saveCurrentProfile() {
    if (!name.trim() || !(Number(weight) > 0) || !(Number(ageValue) > 0)) { setError('프로필을 저장하려면 이름, 체중, 나이를 입력해 주세요.'); return }
    if (needSize && (!adultSize || !(Number(expectedAdultWeight) >= Number(weight)))) { setError('성장기 강아지는 현재 체중에 맞는 예상 성체 체급을 선택해 주세요.'); return }
    const savedProfile = saveAnalysisProfile(profile, profileId || undefined)
    const next = profileId ? profiles.map(item => item.id === savedProfile.id ? savedProfile : item) : [savedProfile, ...profiles]
    setProfiles(next); setProfileId(savedProfile.id); setProfileSaved(true); setError(''); onSaved()
  }
  useEffect(() => { if (active) setProfiles(loadAnalysisProfiles()) }, [active])
  useEffect(() => { const refresh = () => setAnalysisRecords(loadRecords()); const refreshFiles = () => setImportedPdfCount(loadImportedPdfCount(profileId || undefined)); window.addEventListener('wooaeyoung:records-changed', refresh); window.addEventListener('wooaeyoung:files-changed', refreshFiles); return () => { window.removeEventListener('wooaeyoung:records-changed', refresh); window.removeEventListener('wooaeyoung:files-changed', refreshFiles) } }, [profileId])
  useEffect(() => {
    if (initialProfileId) loadProfile(initialProfileId)
  }, [initialProfileId, loadSeq])
  useEffect(() => {
    if (!initialDraft || initialProfileId) return
    setName(initialDraft.name)
    setAgeValue(String(initialDraft.ageYears * 12))
    setAgeUnit('MONTH')
  }, [initialDraft, initialProfileId])

  const add = (p: { id: string; name: string; type: 'FEED' | 'SUPPLEMENT'; servingUnit: string }, amount?: number) => {
    if (items.some(i => i.productId === p.id)) return
    setItems([...items, { productId: p.id, name: p.name, type: p.type, unit: p.servingUnit, dailyAmount: amount ?? (p.type === 'FEED' ? 100 : 1) }])
  }
  const setAmount = (id: string, v: string) => setItems(items.map(i => (i.productId === id ? { ...i, dailyAmount: Number(v) } : i)))
  const adjustAmount = (id: string, delta: number) => setItems(items.map(i => i.productId === id ? { ...i, dailyAmount: Math.max(0.1, Math.round((i.dailyAmount + delta) * 10) / 10) } : i))

  async function loadRecommendation(nextItems: FeedingItem[]) {
    const requestId = ++recommendationRequest.current
    setRecommendationLoading(true); setRecommendationError(''); setRec(null)
    try {
      const nextRecommendation = await recommend(profile, nextItems, manualItems, standardProfile)
      if (requestId === recommendationRequest.current) setRec(nextRecommendation)
    } catch (e) {
      if (requestId === recommendationRequest.current) setRecommendationError(e instanceof Error ? e.message : '추천 영양제를 불러오지 못했습니다.')
    } finally {
      if (requestId === recommendationRequest.current) setRecommendationLoading(false)
    }
  }

  async function addRecommendation(r: Recommendation['items'][number]) {
    const nextItems = [...items, { productId: r.productId, name: r.name, type: 'SUPPLEMENT' as const, unit: r.unit, dailyAmount: r.dailyAmount }]
    setItems(nextItems); recommendationRequest.current += 1
    setRecommendationLoading(false); setRecommendationError(''); setRec(null)
    setLoading(true); setError(''); setSaved(false)
    try {
      const nextAnalysis = await analyze(profile, nextItems, manualItems, standardProfile)
      setNutrientFilter(nextAnalysis.nutrients.some(nutrient => !adequateStatuses.has(nutrient.status)) ? 'attention' : 'all')
      setAnalysis(nextAnalysis); onAnalysis(nextAnalysis)
      window.requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
      void loadRecommendation(nextItems)
    } catch (e) {
      setError(e instanceof Error ? e.message : '추가한 제품을 다시 분석하지 못했습니다.')
    } finally { setLoading(false) }
  }

  async function run() {
    setError(''); setSaved(false)
    if (incompatibleItems.length) { setError('선택한 기준과 맞지 않는 직접 입력 제품을 삭제하고 다시 입력해 주세요.'); return }
    if (!(Number(weight) > 0) || !(Number(ageValue) > 0)) { setError('체중과 나이를 입력해 주세요.'); return }
    if (items.length === 0 && manualItems.length === 0) { setError('급여 중인 제품을 하나 이상 추가해 주세요.'); return }
    recommendationRequest.current += 1
    setRecommendationLoading(false); setRecommendationError(''); setRec(null); setLoading(true)
    try {
      const a = await analyze(profile, items, manualItems, standardProfile)
      setNutrientFilter(a.nutrients.some(nutrient => !adequateStatuses.has(nutrient.status)) ? 'attention' : 'all')
      setAnalysis(a); onAnalysis(a)
      window.requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
      void loadRecommendation(items)
    } catch (e) {
      setAnalysis(null); onAnalysis(null); setRec(null)
      setError(e instanceof Error ? e.message : '요청을 처리하지 못했습니다.')
    } finally { setLoading(false) }
  }

  function saveManual() {
    if (!manualReady) { setError('제품명, 제공량, 하루 급여량과 0 이상의 올바른 성분 함량을 입력해 주세요.'); return }
    const nutrients = Object.entries(manual.nutrients).filter(([, value]) => value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0).map(([nutrientId, value]) => ({ nutrientId, amount: Number(value), unit: manual.units[nutrientId] || nutrientOptions(standardProfile).find(([id]) => id === nutrientId)?.[2] || 'MG', ...(standardProfile === 'NIAS_V3' && manual.forms[nutrientId] ? { form: manual.forms[nutrientId] } : {}) }))
    if (!manual.name.trim() || !nutrients.length || Number(manual.amount) <= 0 || Number(manual.daily) <= 0) { setError('직접 입력 제품명, 급여량, 영양성분을 하나 이상 입력해 주세요.'); return }
    setManualItems([...manualItems, { name: manual.name.trim(), type: manual.type, servingAmount: Number(manual.amount), servingUnit: manual.unit, dailyAmount: Number(manual.daily), nutrients }])
    setManual({ ...manual, name: '', nutrients: emptyNutrients(), units: {}, forms: {} })
    setIngredientRows([''])
    setDailyFrequency('1')
    setError('')
  }

  function extractLabelDraft() {
    const next: Record<string, string> = emptyNutrients()
    const nextUnits: Record<string, string> = {}
    let count = 0
    const normalizedText = normalizeLabelOcrText(labelText).toLowerCase()
    const lines = normalizedText.split(/[\r\n,]/).map(line => line.trim()).filter(Boolean)
    const unsupported = new Set<string>()
    if (lines.some(line => /마그네슘/.test(line))) unsupported.add('마그네슘')
    if (lines.some(line => /비타민\s*(?:k|《|〈)/i.test(line))) unsupported.add('비타민 K')
    for (const line of lines) {
      const match = line.replace(/^[•·*-]\s*/, '').match(/(.+?)\s*[:：]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(mg|g|ug|μg|mcg|iu)\b/i)
      if (!match) continue
      const candidate = match[1].replace(/[()]/g, '').trim()
      const key = LABEL_ALIASES.find(([label]) => candidate === label || candidate.startsWith(`${label} `) || candidate.startsWith(`${label}·`))?.[1]
      if (!key) continue
      let amount = Number(match[2].replace(',', '.'))
      let unit = (match[3] || nutrientOptions(standardProfile).find(([id]) => id === key)?.[2] || 'MG').toUpperCase().replace('ΜG', 'UG').replace('MCG', 'UG').replace('Μ', 'U')
      if (key === 'VITAMIN_D' && unit === 'UG') { amount *= 40; unit = 'IU' }
      next[key] = String(amount)
      nextUnits[key] = unit
      count++
    }
    const productLine = lines.find(line => /제품명|product|name/.test(line))
    const productName = productLine?.split(/[:：]/)[1]?.trim()
    setManual(current => ({ ...current, ...(productName ? { name: productName } : {}), nutrients: next, units: nextUnits }))
    setIngredientRows(Object.keys(next).filter(key => next[key]).concat(['']))
    const unsupportedNotice = unsupported.size ? ` 현재 분석 범위 밖 성분(${[...unsupported].join(', ')})은 초안에서 제외했어요.` : ''
    setLabelNotice(count ? `${count}개 성분 후보를 추출했어요.${unsupportedNotice} 값을 확인한 뒤 제품 저장 및 추가를 눌러 주세요.` : `성분 값을 찾지 못했어요.${unsupportedNotice} 성분명과 수치를 줄바꿈해 입력해 주세요.`)
  }

  async function extractLabelImage(file: File) {
    setOcrLoading(true); setLabelNotice('사진에서 라벨 글자를 읽는 중이에요…')
    try {
      const worker = await createWorker('kor+eng')
      const result = await worker.recognize(file)
      await worker.terminate()
      setLabelText(result.data.text)
      setLabelNotice('라벨 텍스트를 추출했어요. 초안 추출을 눌러 성분 후보를 확인하세요.')
    } catch { setLabelNotice('사진을 읽지 못했어요. 글자가 선명한 사진을 다시 선택하거나 텍스트를 붙여 넣어 주세요.') }
    finally { setOcrLoading(false) }
  }
  async function openCamera() { try { if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported'); setLabelNotice('카메라 권한을 확인하는 중이에요…'); const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); cameraStreamRef.current = stream; setLabelNotice(''); setCameraOpen(true); requestAnimationFrame(() => { if (cameraVideoRef.current) { cameraVideoRef.current.srcObject = stream; void cameraVideoRef.current.play() } }) } catch { setCameraOpen(false); setLabelNotice('PC 카메라를 열 수 없어요. 주소창의 카메라 권한을 허용한 뒤 다시 눌러 주세요. 계속 안 되면 사진 선택을 이용해 주세요.') } }
  function closeCamera() { cameraStreamRef.current?.getTracks().forEach(track => track.stop()); cameraStreamRef.current = null; setCameraOpen(false) }
  function captureCameraFrame() { const video = cameraVideoRef.current; if (!video) return; const canvas = document.createElement('canvas'); const MAX_DIM = 2048; const scale = Math.max(1, MAX_DIM / Math.max(video.videoWidth, video.videoHeight)); canvas.width = Math.floor(video.videoWidth * scale); canvas.height = Math.floor(video.videoHeight * scale); const ctx = canvas.getContext('2d'); if (!ctx) return; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(video, 0, 0, canvas.width, canvas.height); canvas.toBlob(blob => { if (blob) void extractLabelImage(new File([blob], 'label-camera.jpg', { type: 'image/jpeg' })); closeCamera() }, 'image/jpeg', .92) }

  function save() {
    if (!analysis) return
    saveRecord({ id: analysis.traceId, profileId: profileId || undefined, date: new Date().toISOString(), name: profile.name, species, items: [...items.map(i => `${i.name} ${i.dailyAmount}${i.unit}`), ...manualItems.map(item => `${item.name} ${item.dailyAmount}${item.servingUnit} (직접 입력)`)], summary: analysis.summary, oneLineInsight: nutritionOneLine(analysis), standardVersion: analysis.standardVersion, standardSource: analysis.standardSource, analysisSnapshot: analysis, profileSnapshot: profile })
    setSaved(true); setAnalysisRecords(loadRecords()); onSaved()
  }

  const adequateStatuses = new Set(['ADEQUATE', 'ADEQUATE_NO_UPPER_LIMIT'])
  const filteredNutrients = analysis?.nutrients.filter(nutrient => nutrientFilter === 'all'
    || (nutrientFilter === 'adequate' ? adequateStatuses.has(nutrient.status) : !adequateStatuses.has(nutrient.status))) ?? []
  const attentionCount = analysis?.nutrients.filter(nutrient => !adequateStatuses.has(nutrient.status)).length ?? 0
  const adequateCount = (analysis?.nutrients.length ?? 0) - attentionCount
  const priorityNutrients = analysis?.nutrients
    .filter(nutrient => !adequateStatuses.has(nutrient.status))
    .sort((a, b) => {
      const priority: Record<string, number> = { EXCESS: 0, DEFICIENT: 1, CAUTION: 2, UNIT_CONVERSION_UNSUPPORTED: 3, INSUFFICIENT_DATA: 4, UNVERIFIED_STANDARD: 5, UNSUPPORTED: 6, NO_STANDARD: 7 }
      return (priority[a.status] ?? 99) - (priority[b.status] ?? 99)
    })
    .slice(0, 3) ?? []
  const t = (ko: string, en: string, ja: string) => localize(language, ko, en, ja)
  const animalName = species === 'DOG' ? t('강아지', 'Dog', '犬') : t('고양이', 'Cat', '猫')
  const oneLineSummary = analysis ? analysis.summary.excess
    ? t(`개선 방향: 과다 판정 ${analysis.summary.excess}개 성분의 급여량을 먼저 줄이거나 제외한 뒤 다시 확인해 주세요.`, `Next step: Reduce or remove products contributing to ${analysis.summary.excess} high nutrient result(s), then analyze again.`, `改善案：過剰と判定された${analysis.summary.excess}項目について、製品を減らすか外して再分析してください。`)
    : ratioNeedsAttention
      ? t('개선 방향: 칼슘·인 비율을 조정할 수 있도록 해당 성분이 포함된 제품의 급여량을 확인해 주세요.', 'Next step: Review serving sizes of products containing calcium and phosphorus to adjust their ratio.', '改善案：カルシウムとリンの比率を調整できるよう、対象成分を含む製品の量を確認してください。')
      : analysis.summary.caution
        ? t(`개선 방향: 주의 성분 ${analysis.summary.caution}개는 다음 급여 전 라벨과 급여량을 한 번 더 확인해 주세요.`, `Next step: Recheck the labels and serving sizes for ${analysis.summary.caution} nutrient(s) at the next feeding.`, `改善案：注意成分${analysis.summary.caution}項目について、次の給餌前にラベルと量を再確認してください。`)
        : analysis.summary.deficient
          ? t(`개선 방향: 부족 성분 ${analysis.summary.deficient}개를 중심으로 사료·영양제 구성과 급여량을 검토해 주세요.`, `Next step: Review the food, supplements, and serving sizes for ${analysis.summary.deficient} low nutrient(s).`, `改善案：不足成分${analysis.summary.deficient}項目を中心に、フード・サプリの構成と量を確認してください。`)
          : t('잘된 점: 확인된 영양성분이 기준 범위에 있어요. 정보가 부족한 성분은 라벨 정보를 보완해 주세요.', 'What’s going well: Confirmed nutrients are within range. Add label details for any nutrients with missing information.', '良い点：確認できた栄養成分は基準範囲内です。情報不足の成分はラベル情報を補ってください。') : ''

  return (
    <div className="w page analysis-page">
      <section className="analysis-hero">
        <span className="analysis-kicker">DAILY NUTRITION CHECK</span>
        <h1>{t('사료 · 영양제 분석', 'Food & supplement analysis', 'フード・サプリ分析')}</h1>
        <p>{t('반려동물 정보와 먹는 제품을 입력하면 하루 영양 섭취량을 한눈에 비교해 드려요.', 'Enter your pet’s profile and the products they eat to compare their daily nutrient intake.', 'ペットのプロフィールと食べている製品を入力すると、一日の栄養摂取量を比較できます。')}</p>
        {initialDraft?.symptoms.length ? <div className="concern-handoff"><b>{t('선택한 관심 건강', 'Selected health concerns', '選択した健康上の関心')}</b><span>{initialDraft.symptoms.join(' · ')}</span><small>{t('아래에서 체중과 급여 제품을 추가하면 맞춤 분석을 시작할 수 있어요.', 'Add your pet’s weight and food below to start a personalized analysis.', '下で体重と食べている製品を追加すると、個別分析を始められます。')}</small></div> : null}
        <PetCompanion language={language} />
      </section>

      <StepNav language={language} />

      <div className="analysis-grid">

      <div id="step-1" className="panel input-panel profile-panel"><div className="panel-title"><span>STEP 1</span><div><h3>{t('반려동물 정보', 'Pet profile', 'ペットプロフィール')}</h3><p>{t('한 번 저장하면 다음 분석에서 다시 사용할 수 있어요.', 'Save once and reuse it in your next analysis.', '一度保存すると、次回の分析でも使えます。')}</p></div>{(analysis || analysisRecords.length + importedPdfCount > 0) && <div className="achievement-badge profile-achievement" role="status" title={t('분석 기록 또는 PDF 리포트를 저장한 날 받은 배지', 'Awarded when you save an analysis or PDF report', '分析記録またはPDFレポートを保存した日に獲得できるバッジ')}><b>★</b><span><strong>{t('참 잘했어요 · 기록 ', 'Great job · Records ', 'よくできました · 記録 ')}{analysisRecords.length + importedPdfCount}{t('회', '', '件')}</strong><small>{new Date(analysisRecords[0]?.date || Date.now()).toLocaleDateString(language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'ko-KR')} {t('획득', 'earned', '獲得')}</small></span></div>}</div>
        <div className="profile-actions"><label className="f">{t('저장된 프로필 불러오기', 'Load a saved profile', '保存したプロフィールを読み込む')}<select className="in" value={profileId} onChange={e => loadProfile(e.target.value)}><option value="">{t('새 프로필 작성', 'Create a new profile', '新しいプロフィールを作成')}</option>{profiles.map(item => <option key={item.id} value={item.id}>{item.name} · {item.species === 'DOG' ? t('강아지', 'Dog', '犬') : t('고양이', 'Cat', '猫')} · {item.weightKg}kg</option>)}</select></label>{profileReady ? <button className="btn ghost reveal-action" onClick={saveCurrentProfile}>{profileSaved ? t('프로필 저장됨', 'Profile saved', 'プロフィールを保存しました') : profileId ? t('프로필 수정 저장', 'Save profile changes', 'プロフィールの変更を保存') : t('프로필 저장', 'Save profile', 'プロフィールを保存')}</button> : <span className="action-hint">{t('필수 칸을 입력하면 저장 버튼이 나타나요.', 'Complete the required fields to reveal the save button.', '必須項目を入力すると保存ボタンが表示されます。')}</span>}</div>
        <div className="grid2">
          <label className="f">{t('이름', 'Name', '名前')}<input className="in" value={name} onChange={e => setName(e.target.value)} placeholder={t('예: 보리', 'e.g. Bori', '例：ボリ')} /></label>
          <fieldset className="f species-field"><legend>{t('종', 'Species', '種類')}</legend><div className="species-segment" role="radiogroup" aria-label={t('반려동물 종', 'Pet species', 'ペットの種類')}><label><input type="radio" name="analysis-species" value="DOG" checked={species === 'DOG'} onChange={() => setSpecies('DOG')} /><span>🐶 {t('강아지', 'Dog', '犬')}</span></label><label><input type="radio" name="analysis-species" value="CAT" checked={species === 'CAT'} onChange={() => setSpecies('CAT')} /><span>🐱 {t('고양이', 'Cat', '猫')}</span></label></div></fieldset>
          <label className="f">{t('체중(kg)', 'Weight (kg)', '体重 (kg)')}<input className="in" type="number" min="0" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} /></label>
          <label className="f">{t('나이', 'Age', '年齢')}<input className="in" type="number" min="0" value={ageValue} onChange={e => setAgeValue(e.target.value)} /></label>
          <label className="f">{t('나이 단위', 'Age unit', '年齢の単位')}<select className="in" value={ageUnit} onChange={e => setAgeUnit(e.target.value as 'WEEK' | 'MONTH')}><option value="MONTH">{t('개월', 'months', 'か月')}</option><option value="WEEK">{t('주', 'weeks', '週')}</option></select></label>
          {needSize && <label className="f size-choice">{t('예상 성체 체급', 'Expected adult size', '成犬時の体格')}<select className="in" value={adultSize} onChange={e => { const size = e.target.value; setAdultSize(size); setExpectedAdultWeight(size ? String(ADULT_SIZE_WEIGHT[size]) : '') }}><option value="">{t('체급을 선택해 주세요', 'Select a size', '体格を選択してください')}</option><option value="S">S · {t('7kg 이하', 'up to 7 kg', '7kg以下')}</option><option value="M">M · 7–15kg</option><option value="L">L · 15–27.5kg</option><option value="XL">XL · 27.5–47.5kg</option><option value="XXL">XXL · {t('47.5kg 초과', 'over 47.5 kg', '47.5kg超')}</option></select><small className="note">{t('12개월 미만 강아지는 다 자랐을 때의 체급으로 필요 열량을 계산합니다.', 'For puppies under 12 months, energy needs are estimated using expected adult size.', '12か月未満の子犬は、成犬時の体格をもとに必要エネルギー量を計算します。')}</small><small className="size-examples">{t('예시 체급: 소형견 S · 중형견 M · 대형견 L–XL · 초대형견 XXL', 'Examples: small dogs S · medium M · large L–XL · giant breeds XXL', '目安：小型犬 S・中型犬 M・大型犬 L–XL・超大型犬 XXL')}</small></label>}
        </div>
        <label className="chk"><input type="checkbox" checked={completeFeed} onChange={e => setCompleteFeed(e.target.checked)} />{t('주식으로 완전사료를 먹고 있어요', 'My pet eats a complete food as their main diet', '主食として総合栄養食を食べています')}</label>
      </div>
      <div className="panel standard-select"><b>{t('영양 기준 · FEDIAF + NIAS v3', 'Nutrition standards · FEDIAF + NIAS v3', '栄養基準 · FEDIAF + NIAS v3')}</b><p className="manual-support-note">{t('FEDIAF와 NIAS v3 기준을 통합해 성장기 기준을 포함한 총 18개 성분을 분석합니다.', 'FEDIAF and NIAS v3 standards are combined to analyze 18 nutrients, including growth-stage requirements.', 'FEDIAFとNIAS v3の基準を統合し、成長期の基準を含む18項目の栄養素を分析します。')}</p><div role="radiogroup" aria-label={t('영양 기준 선택', 'Select nutrition standard', '栄養基準を選択')}>{STANDARD_OPTIONS.map(option => <label key={option.id}><input type="radio" name="standardProfile" value={option.id} checked={standardProfile === option.id} disabled={!option.available || loading} onChange={() => { setStandardProfile(option.id); setIngredientRows(['']); setManual({ ...manual, nutrients: emptyNutrients(), units: {}, forms: {} }); setAnalysis(null); setRec(null); setError('') }} /> {option.label} <small>{language === 'ko' ? option.note : option.id === 'FEDIAF_2025' ? t('현재 기본 분석 기준이에요. 결과에 기준 버전과 출처를 함께 표시해요', 'Default analysis standard. The report includes its version and source.', '標準の分析基準です。結果に基準のバージョンと出典を表示します。') : t('성장기 기준을 포함한 통합 18개 성분을 분석해요', 'Analyzes 18 nutrients, including growth-stage requirements.', '成長期の基準を含む18項目の栄養素を分析します。')}</small></label>)}</div></div>
      <div id="step-2" className={`panel manual-panel ${profileId ? '' : 'profile-required'}`} aria-disabled={!profileId}><div className="panel-title compact"><span>STEP 2</span><div><h3>{t('제품 직접 입력', 'Enter a product manually', '製品を手入力')}</h3><p>{profileId ? t('제품 라벨의 1회 제공량과 영양성분을 입력해 함께 계산할 수 있어요.', 'Enter the serving size and nutrients from the product label to include it in the analysis.', '製品ラベルの1回量と栄養成分を入力して分析に加えられます。') : t('반려동물 정보를 먼저 저장하면 제품 입력이 열립니다.', 'Save your pet’s profile first to unlock product entry.', '先にペットプロフィールを保存すると、製品を入力できます。')}</p></div></div>
        {!profileId && <div className="profile-required-notice">{t('STEP 1에서 반려동물 정보를 입력하고 ‘프로필 저장’을 눌러 주세요.', 'Enter your pet’s profile in Step 1 and select “Save profile.”', 'STEP 1でペット情報を入力し、「プロフィールを保存」を押してください。')}</div>}
        <div className="label-draft panel"><div className="manual-card__head"><b>{t('라벨 OCR 초안', 'Label scan draft', 'ラベル読み取りの下書き')}</b><span className="note">{t('사진·텍스트에서 후보값만 추출하며 확인 후 반영됩니다.', 'Candidate values are extracted from photos or text and added only after you review them.', '写真やテキストから候補値を抽出します。確認後に反映してください。')}</span></div><div className="label-capture-actions"><label className="btn ghost" htmlFor="label-ocr-file">{ocrLoading ? t('사진 읽는 중…', 'Reading image…', '画像を読み取り中…') : t('📷 사진 파일 선택', '📷 Choose a photo', '📷 写真を選択')}</label><button className="btn ghost" type="button" onClick={openCamera} disabled={ocrLoading}>📷 {t('PC 카메라 촬영', 'Take a photo', 'カメラで撮影')}</button></div><input id="label-ocr-file" type="file" accept="image/*" capture="environment" hidden onChange={e => { const file = e.target.files?.[0]; if (file) void extractLabelImage(file); e.currentTarget.value = '' }} /><textarea className="in label-draft-text" value={labelText} onChange={e => setLabelText(e.target.value)} placeholder={t('또는 라벨 텍스트를 붙여넣으세요:\n제품명: 칼슘 플러스\n칼슘 120 mg\n비타민 D 4 IU', 'Or paste label text here:\nProduct: Calcium Plus\nCalcium 120 mg\nVitamin D 4 IU', 'またはラベルのテキストを貼り付けてください:\n製品名：カルシウムプラス\nカルシウム 120 mg\nビタミンD 4 IU')} rows={5} /><button className="btn ghost" type="button" onClick={extractLabelDraft} disabled={!labelText.trim() || ocrLoading}>{t('초안 추출', 'Extract draft', '下書きを抽出')}</button>{labelNotice && <p className="care-notice">{labelNotice}</p>}</div>
        {manualItems.map((item, index) => <article className="manual-card saved-manual-card" key={`${item.name}-${index}`}><div className="manual-card__head"><b>{item.type === 'FEED' ? t('사료', 'Food', 'フード') : t('영양제', 'Supplement', 'サプリ')} {index + 1} · {item.name}</b><button className="btn ghost" onClick={() => setManualItems(manualItems.filter((_, i) => i !== index))}>{t('삭제', 'Remove', '削除')}</button></div><p>{t('1회', 'Per serving', '1回')} {item.servingAmount}{item.servingUnit} · {t('하루', 'Daily', '1日')} {item.dailyAmount}{item.servingUnit}</p><p>{item.nutrients.map(n => `${nutrientLabel(n.nutrientId, MANUAL_NUTRIENTS.find(([id]) => id === n.nutrientId)?.[1] || n.nutrientId, language)} ${n.amount} ${n.unit}`).join(' · ')}</p></article>)}
        <div className="manual-card"><div className="manual-card__head"><b>{manual.type === 'FEED' ? t('사료', 'Food', 'フード') : t('영양제', 'Supplement', 'サプリ')} {manualItems.length + 1}</b></div>
          <div className="grid2 manual-product-fields"><label className="f product-name-field">{t('제품명', 'Product name', '製品名')}<input className="in" value={manual.name} onChange={e => setManual({ ...manual, name: e.target.value })} placeholder={t('예: 우리집 관절 영양제', 'e.g. Joint supplement', '例：関節サプリメント')} /></label><label className="f">{t('구분', 'Type', '種類')}<select className="in" value={manual.type} onChange={e => setManual({ ...manual, type: e.target.value as 'FEED' | 'SUPPLEMENT' })}><option value="SUPPLEMENT">{t('영양제', 'Supplement', 'サプリ')}</option><option value="FEED">{t('사료', 'Food', 'フード')}</option></select></label><label className="f">{t('1회 제공량', 'Serving size', '1回量')}<input className="in" type="number" min="0.1" value={manual.amount} onChange={e => setManual({ ...manual, amount: e.target.value, daily: String(Number(e.target.value) * Number(dailyFrequency)) })} /></label><label className="f">{t('단위', 'Unit', '単位')}<select className="in" value={manual.unit} onChange={e => setManual({ ...manual, unit: e.target.value })}><option value="TABLET">{t('정', 'tablets', '錠')}</option><option value="CAPSULE">{t('캡슐', 'capsules', 'カプセル')}</option><option value="G">g</option></select></label><label className="f">{t('하루 횟수', 'Times per day', '1日の回数')}<input className="in" type="number" min="0.1" step="any" value={dailyFrequency} onChange={e => { setDailyFrequency(e.target.value); setManual({ ...manual, daily: String(Number(manual.amount) * Number(e.target.value)) }) }} /><small className="note">{t('하루 총 급여량:', 'Total per day:', '1日の合計量：')} {Number(manual.daily) || 0} {manual.unit === 'TABLET' ? t('정', 'tablets', '錠') : manual.unit === 'CAPSULE' ? t('캡슐', 'capsules', 'カプセル') : 'g'}</small></label></div>
          <p className="manual-support-note">{standardProfile === 'NIAS_V3' ? t('18개 성분을 입력할 수 있습니다. NIAS 기준과 열량 매개변수는 원문 검증 대기 상태로, 검증 전에는 부족·과다 판정을 제공하지 않습니다.', 'You can enter 18 nutrients. NIAS parameters and energy values are awaiting source verification, so low/high judgments are unavailable until verified.', '18項目の栄養素を入力できます。NIAS基準と熱量パラメーターは原文の検証待ちのため、確認が完了するまで不足・過剰の判定は行いません。') : t('FEDIAF 기준은 6개 성분을 지원합니다. 18개 성분 입력은 위에서 NIAS v3를 선택해 주세요.', 'FEDIAF supports 6 nutrients. Select NIAS v3 above to enter all 18 nutrients.', 'FEDIAF基準では6項目に対応しています。18項目を入力するには、上でNIAS v3を選択してください。')}</p><div className="ingredient-list"><b>{t('성분 (1회 제공량 기준)', 'Nutrients (per serving)', '成分（1回量あたり）')}</b>{ingredientRows.map((id, index) => { const unit = nutrientOptions(standardProfile).find(([key]) => key === id)?.[2] || 'MG'; return <div className="ingredient-row" key={index}><label className="f ingredient-name">{t('성분', 'Nutrient', '成分')}<select className="in" value={id} onChange={e => { const next = e.target.value; if (next && ingredientRows.includes(next)) return; const nutrients = { ...manual.nutrients }; if (id) nutrients[id] = ''; setManual({ ...manual, nutrients }); setIngredientRows(ingredientRows.map((row, i) => i === index ? next : row)) }}><option value="">{t('성분 선택', 'Select a nutrient', '成分を選択')}</option>{nutrientOptions(standardProfile).map(([key, label]) => <option key={key} value={key} disabled={key !== id && ingredientRows.includes(key)}>{nutrientLabel(key, label, language)}</option>)}</select></label><label className="f">{t('1회 함량', 'Amount per serving', '1回の含有量')}<input className="in" type="number" min="0" disabled={!id} value={id ? manual.nutrients[id] : ''} onChange={e => setManual({ ...manual, nutrients: { ...manual.nutrients, [id]: e.target.value } })} /></label><label className="f">{t('단위', 'Unit', '単位')}<select className="in" disabled={!id} value={manual.units[id] || unit} onChange={e => setManual({ ...manual, units: { ...manual.units, [id]: e.target.value } })}>{(unit === 'IU' ? ['IU'] : [unit, ...['G', 'MG', 'UG'].filter(value => value !== unit)]).map(value => <option key={value} value={value}>{value}</option>)}</select></label><button className="btn ghost" aria-label={t('성분 삭제', 'Remove nutrient', '成分を削除')} onClick={() => { const nutrients = { ...manual.nutrients }; if (id) nutrients[id] = ''; setManual({ ...manual, nutrients }); setIngredientRows(ingredientRows.filter((_, i) => i !== index)) }}>{t('삭제', 'Remove', '削除')}</button>{false && standardProfile === 'NIAS_V3' && VITAMIN_FORMS[id] && (manual.units[id] || unit) !== 'IU' && <label className="f">{t('원료 형태', 'Nutrient form', '原料の形態')}<select className="in" value={manual.forms[id] || ''} onChange={e => setManual({ ...manual, forms: { ...manual.forms, [id]: e.target.value } })}><option value="">{t('모름 (정보 부족으로 표시)', 'Unknown (shown as insufficient information)', '不明（情報不足として表示）')}</option>{VITAMIN_FORMS[id].map(([value, formText]) => <option key={value} value={value}>{formText}</option>)}</select></label>}</div> })}</div>
          <button className="btn ingredient-add" onClick={() => setIngredientRows([...ingredientRows, ''])}>＋ {t('성분 추가', 'Add nutrient', '成分を追加')}</button>
          {manualReady ? <button className="btn reveal-action" style={{ marginTop: 14 }} onClick={saveManual}>{t('제품 저장 및 추가', 'Save and add product', '製品を保存して追加')}</button> : <p className="action-hint inline">{t('제품명과 영양성분을 입력하면 저장 버튼이 나타나요.', 'Enter the product name and nutrient values to reveal the save button.', '製品名と栄養成分を入力すると保存ボタンが表示されます。')}</p>}
        </div>
      </div>

      <section id="step-3" className="step-section">
      {error && <div className="err" role="alert">{error}{analysisReady && <button className="btn ghost" onClick={run} disabled={loading}>{t('다시 시도', 'Try again', '再試行')}</button>}</div>}
      <div className={`analysis-action ${analysisReady ? 'ready' : ''}`}><div className="analysis-readiness"><b>{analysisReady ? t('분석 준비 완료', 'Ready to analyze', '分析の準備ができました') : t('아직 필요한 정보가 있어요', 'Some required information is missing', 'まだ必要な情報があります')}</b><span>{analysisReady ? t(`선택 제품 ${items.length}개와 직접 입력 제품 ${manualItems.length}개의 하루 총량을 함께 계산합니다.`, `Daily intake from ${items.length} selected and ${manualItems.length} manually entered products will be combined.`, `選択した${items.length}製品と手入力した${manualItems.length}製品の一日量を合算します。`) : `${missingRequirements.join(' · ')}${missingRequirements.length ? t('을(를) 입력해 주세요.', ' is required.', 'を入力してください。') : ''}`}</span></div><button className="btn reveal-action" onClick={run} disabled={!analysisReady || loading}>{loading ? t('분석 중…', 'Analyzing…', '分析中…') : t('맞춤 분석 시작하기', 'Start personalized analysis', '個別分析を始める')}</button></div>

      {analysis && (
        <div className="panel result-panel" ref={resultRef} style={{ marginTop: 24 }}><div className="result-title"><span>STEP 3 · RESULT</span><h3>{t('오늘의 영양 분석', 'Today’s nutrition analysis', '今日の栄養分析')}</h3><p>{t('확인된 섭취량과 적용 가능한 기준을 보여 드려요.', 'See confirmed intake alongside the standards that apply.', '確認できた摂取量と適用される基準を表示します。')}</p></div>
          <div className={`verdict ${analysis.summary.excess || ratioNeedsAttention ? 'danger' : analysis.summary.caution || hasUnjudged ? 'warning' : analysis.summary.deficient ? 'check' : 'safe'}`} role="status">
            <section className="ai-one-line" aria-label={t('AI 영양 한줄 요약', 'AI nutrition summary', 'AI栄養サマリー')}><span>{t('AI 영양 한줄 요약', 'AI nutrition summary', 'AI栄養サマリー')}</span><p>{oneLineSummary}</p></section>
            <span>{analysis.summary.excess ? t('과다 성분이 있어요', 'Some nutrients are above the upper limit', '上限を超えた成分があります') : ratioNeedsAttention ? t('칼슘:인 비율을 확인해 주세요', 'Check the calcium-to-phosphorus ratio', 'カルシウムとリンの比率を確認してください') : analysis.summary.caution ? t('주의가 필요한 성분이 있어요', 'Some nutrients need attention', '注意が必要な成分があります') : analysis.summary.deficient ? t('부족한 성분을 확인해 주세요', 'Check for nutrients below the minimum', '不足している成分を確認してください') : hasUnjudged ? t('판정하지 못한 성분이 있어요', 'Some nutrients could not be assessed', '判定できない成分があります') : t('현재 조합은 기준 범위 안이에요', 'This combination is within applicable ranges', '現在の組み合わせは適用範囲内です')}</span>
            <b>{analysis.summary.excess ? t(`${analysis.summary.excess}개 성분이 상한을 넘었어요. 급여 제품을 줄이거나 제외해 다시 분석해 보세요.`, `${analysis.summary.excess} nutrient(s) exceed the upper limit. Reduce or remove products and analyze again.`, `${analysis.summary.excess}項目が上限を超えています。製品を減らすか外して再分析してください。`) : ratioNeedsAttention ? t(`현재 칼슘:인 비율이 적용 범위보다 ${calciumPhosphorus?.status === 'LOW' ? '낮아요' : '높아요'}. 칼슘과 인 급여량을 조정해 주세요.`, `The calcium-to-phosphorus ratio is ${calciumPhosphorus?.status === 'LOW' ? 'below' : 'above'} the applicable range. Review calcium and phosphorus intake.`, `カルシウムとリンの比率が適用範囲より${calciumPhosphorus?.status === 'LOW' ? '低く' : '高く'}なっています。摂取量を確認してください。`) : analysis.summary.caution ? t(`${analysis.summary.caution}개 성분이 서비스 주의선에 도달했어요.`, `${analysis.summary.caution} nutrient(s) reached the service caution threshold.`, `${analysis.summary.caution}項目が注意ラインに達しています。`) : analysis.summary.deficient ? t(`${analysis.summary.deficient}개 성분이 최소 권장량보다 낮아요.`, `${analysis.summary.deficient} nutrient(s) are below the minimum recommended amount.`, `${analysis.summary.deficient}項目が推奨最小量を下回っています。`) : hasUnjudged ? t('정보 부족 또는 기준 검증 대기 항목이 있어 전체 조합의 안전성을 판단할 수 없습니다.', 'Some values are missing or standards are awaiting verification, so the full combination cannot be assessed for safety.', '情報不足または基準の検証待ちがあるため、組み合わせ全体の安全性を判定できません。') : t('적용 가능한 공식 기준에서 주의·과다가 확인되지 않았어요.', 'No caution or excess was identified under the applicable standards.', '適用基準では注意・過剰は確認されませんでした。')}</b>
          </div>
          {analysis.usesEstimatedFeed && <div className="estimate-alert">{t('일부 사료 성분은 제품 상세값이 없어 최소 권장량으로 추정했어요. 성분표 실제값과 구분해 확인해 주세요.', 'Some food nutrients lack product-specific values and were estimated using minimum recommendations. Check these separately from label values.', '一部のフード成分は製品の詳細値がないため、推奨最小量で推定しています。ラベルの実測値と区別して確認してください。')}</div>}
          <div className="sum">
            <div><b>{analysis.summary.deficient ?? 0}</b>{t('부족', 'Low', '不足')}</div><div><b>{analysis.summary.adequate ?? 0}</b>{t('적정', 'Adequate', '適正')}</div>
            <div><b>{analysis.summary.caution ?? 0}</b>{t('주의', 'Caution', '注意')}</div><div><b>{analysis.summary.excess ?? 0}</b>{t('과다', 'High', '過剰')}</div>
            <div><b>{analysis.summary.noStandard ?? 0}</b>{t('기준 없음', 'No standard', '基準なし')}</div><div><b>{analysis.nutrients.filter(n => n.total == null || n.unknownContribution || ['UNSUPPORTED', 'UNVERIFIED_STANDARD', 'INSUFFICIENT_DATA', 'UNIT_CONVERSION_UNSUPPORTED'].includes(n.status)).length}</b>{t('판정·정보 확인 필요', 'Needs review', '判定・情報の確認が必要')}</div>
          </div>
          {priorityNutrients.length > 0 && <section className="result-priority" aria-labelledby="result-priority-title"><div><span>TODAY'S REVIEW</span><h4 id="result-priority-title">{t('오늘 먼저 확인할 항목', 'Review these first', 'まず確認する項目')}</h4><p>{t('과다·부족·주의 순으로 중요한 결과를 먼저 보여 드려요.', 'Key results are listed in order: high, low, then caution.', '過剰・不足・注意の順に重要な結果を表示します。')}</p></div><ol>{priorityNutrients.map(nutrient => <li key={nutrient.nutrientId}><b>{nutrientLabel(nutrient.nutrientId, nutrient.name, language)}</b><span className={`st ${nutrient.status}`}>{statusText(nutrient.status, language)}</span><small>{nutrient.unknownContribution ? t('전체 섭취량이 아닌 확인된 양만 반영됐어요.', 'Confirmed amount only; this is not total intake.', '総摂取量ではなく確認できた量のみを反映しています。') : t(`하루 총량 ${fmt(nutrient.total)} ${nutrient.unit.toLowerCase()}`, `Daily total: ${fmt(nutrient.total)} ${nutrient.unit.toLowerCase()}`, `1日の合計：${fmt(nutrient.total)} ${nutrient.unit.toLowerCase()}`)}</small></li>)}</ol></section>}
          <div className="note">{t('분석 프로필:', 'Profile:', '分析プロフィール：')} {profile.name || t('우리 아이', 'My pet', 'うちの子')} · {animalName} · {weight}kg · {ageValue}{ageUnit === 'MONTH' ? t('개월', ' months', 'か月') : t('주', ' weeks', '週')}</div>
          <div className="note">{t('하루 기준 에너지', 'Daily reference energy', '1日の基準エネルギー')} {analysis.referenceEnergyKcal == null ? t('검증 대기', 'verification pending', '検証待ち') : `~${Math.round(analysis.referenceEnergyKcal)} kcal`} · {t('선택 기준', 'Selected standard', '選択基準')} {standardProfile} · {t('결과 기준 버전', 'Standard version', '基準バージョン')} {analysis.standardVersion}</div>
          {analysis.standardSource && <div className="note">{t('기준 출처:', 'Standard source:', '基準の出典：')} {analysis.standardSource}</div>}
          {analysis.cautionPolicy && <div className="note">{t('주의선 정책:', 'Caution threshold policy:', '注意ラインの方針：')} {analysis.cautionPolicy}</div>}
          <p className="note">{t('일부 정보가 없는 성분은 확인된 양만 표시합니다. 이 수치는 전체 섭취량이 아니며 0으로 표시되어도 실제 섭취량이 0이라는 뜻이 아닙니다.', 'For nutrients with missing data, only confirmed amounts are shown. This is not total intake, and a displayed zero does not mean actual intake is zero.', '情報が不足している成分は確認できた量のみを表示します。これは総摂取量ではなく、0と表示されても実際の摂取量が0とは限りません。')}</p>
          <aside className="analysis-scope" aria-label={t('분석 범위 안내', 'Analysis scope', '分析範囲')}><b>{t('분석 범위 안내', 'Analysis scope', '分析範囲')}</b><span>{t('기준 버전', 'Standard version', '基準バージョン')} {analysis.standardVersion} · {t('결과', 'Results', '結果')} {analysis.nutrients.length}{t('종 성분', ' nutrients', '項目')}</span><span>{analysis.usesEstimatedFeed ? t('일부 사료 성분은 최소 권장량을 사용한 추정값입니다.', 'Some food nutrients are estimated using minimum recommended amounts.', '一部のフード成分は推奨最小量を使った推定値です。') : t('입력·선택한 제품의 제공량과 하루 급여량을 기준으로 계산했습니다.', 'Calculated from serving sizes and daily amounts for the products you entered or selected.', '入力・選択した製品の1回量と一日の給与量をもとに計算しています。')}</span><span>{t('이 결과는 건강 상태의 진단·처방 또는 확정 급여 권고가 아닙니다.', 'This result is not a diagnosis, prescription, or definitive feeding recommendation.', 'この結果は健康状態の診断・処方や確定的な給餌の推奨ではありません。')}</span></aside>
          <div className="nutrient-filter" role="group" aria-label={t('영양성분 결과 필터', 'Filter nutrient results', '栄養結果を絞り込む')}>
            <button type="button" className={nutrientFilter === 'all' ? 'active' : ''} aria-pressed={nutrientFilter === 'all'} onClick={() => setNutrientFilter('all')}>{t('전체', 'All', 'すべて')} {analysis.nutrients.length}</button>
            <button type="button" className={nutrientFilter === 'attention' ? 'active' : ''} aria-pressed={nutrientFilter === 'attention'} onClick={() => setNutrientFilter('attention')}>{t('확인 필요', 'Needs review', '要確認')} {attentionCount}</button>
            <button type="button" className={nutrientFilter === 'adequate' ? 'active' : ''} aria-pressed={nutrientFilter === 'adequate'} onClick={() => setNutrientFilter('adequate')}>{t('적정', 'Adequate', '適正')} {adequateCount}</button>
          </div>
          {filteredNutrients.length ? <div className="nutrient-bars">{filteredNutrients.map(n => <NutrientBar key={n.nutrientId} nutrient={n} language={language} />)}</div> : <p className="nutrient-filter-empty">{t('해당하는 성분이 없어요.', 'No matching nutrients.', '該当する成分はありません。')}</p>}
          <div className="tw"><table>
            <thead><tr><th>{t('영양소', 'Nutrient', '栄養素')}</th><th>{t('데이터', 'Data', 'データ')}</th><th>{t('사료', 'Food', 'フード')}</th><th>{t('영양제', 'Supplements', 'サプリ')}</th><th>{t('합계 / 확인된 양', 'Total / confirmed amount', '合計 / 確認済み量')}</th><th>{t('최소', 'Minimum', '下限')}</th><th>{t('상한', 'Upper limit', '上限')}</th><th>{t('상태', 'Status', '状態')}</th></tr></thead>
            <tbody>{filteredNutrients.map(n => (
              <tr key={n.nutrientId}><td data-label={t('영양소', 'Nutrient', '栄養素')}>{nutrientLabel(n.nutrientId, n.name, language)} ({n.unit.toLowerCase()})</td><td data-label={t('데이터', 'Data', 'データ')}>{nutrientSourceText(n, language)}</td><td data-label={t('사료', 'Food', 'フード')}>{fmt(n.fromFeed)}</td><td data-label={t('영양제', 'Supplements', 'サプリ')}>{fmt(n.fromSupplements)}</td><td data-label={t('합계', 'Total', '合計')}>{fmt(n.total)}{n.unknownContribution ? ` (${t('확인된 양만', 'confirmed only', '確認済み量のみ')})` : ''}</td><td data-label={t('최소', 'Minimum', '下限')}>{fmt(n.minimum)}</td><td data-label={t('상한', 'Upper limit', '上限')}>{fmt(n.upper)}</td>
                <td data-label={t('상태', 'Status', '状態')} className={`st ${n.status}`}>{statusText(n.status, language)}</td></tr>))}</tbody>
          </table></div>
          <details className="contribution-details"><summary>{t('제품별 성분 기여량 보기', 'View nutrient contributions by product', '製品ごとの栄養成分量を見る')}</summary><ul className="plist">{analysis.contributions.map((item, index) => <li key={`${item.name}-${index}`}><span><span className="tag">{item.type === 'FEED' ? t('사료', 'Food', 'フード') : t('영양제', 'Supplement', 'サプリ')}</span>{item.name} <small>{item.source === 'ESTIMATED' ? t('최소 권장량 추정', 'Minimum recommendation estimate', '推奨最小量による推定') : t('성분표 실제값', 'Product label value', '製品ラベルの値')}</small></span><small>{Object.entries(item.nutrients).map(([id, value]) => `${nutrientLabel(id, id, language)}: ${fmt(value)}`).join(' · ') || t('확인된 성분 없음', 'No confirmed nutrients', '確認済み成分なし')}</small></li>)}</ul></details>
          {Object.entries(analysis.ratios).map(([k, v]) => <p key={k} className="ratio-note"><b>{k === 'calciumPhosphorus' ? '칼슘:인 비율' : k} {fmt(v.value)} : 1</b><span>현재 분석 적용 범위 {v.minimum ?? 1} : 1 ~ {v.maximum ?? (analysis.lifeStage === 'GROWTH_EARLY' ? 1.6 : analysis.lifeStage === 'GROWTH_LATE' && Number(expectedAdultWeight) > 15 && ageDays < 182.625 ? 1.6 : analysis.lifeStage === 'GROWTH_LATE' ? 1.8 : 2)} : 1 · {RATIO[v.status] ?? v.status}</span></p>)}
          {analysis.warnings.length > 0 && <ul className="warns">{analysis.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
          <p style={{ marginTop: 14 }}><button className="btn" onClick={save} disabled={saved}>{saved ? '리포트 저장됨' : '리포트로 기록 저장'}</button></p>
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
      {analysis && recommendationLoading && <div className="panel" role="status"><h3>추천 영양제 계산 중</h3><p className="note">분석 결과를 먼저 표시했어요. 추천 목록은 준비되는 대로 나타납니다.</p></div>}
      {analysis && recommendationError && <div className="panel"><h3>추천 영양제를 불러오지 못했어요</h3><p className="note">분석 결과는 정상적으로 사용할 수 있습니다.</p><button className="btn ghost" onClick={() => void loadRecommendation(items)}>추천만 다시 불러오기</button></div>}
      {!analysis && <div className="panel result-placeholder"><div className="result-title"><span>STEP 3 · RESULT</span><h3>{t('분석 결과', 'Analysis results', '分析結果')}</h3><p>{t('위에서 정보를 입력하고 분석을 시작하면 이곳에 결과가 나타나요.', 'Enter your pet’s information above and start an analysis to see the results here.', '上でペット情報を入力して分析を始めると、ここに結果が表示されます。')}</p></div></div>}
      </section>

      </div>
      {cameraOpen && <div className="camera-capture" role="dialog" aria-modal="true" aria-labelledby="camera-title"><section className="camera-dialog"><header><div><span>LABEL SCAN</span><h3 id="camera-title">{t('PC 카메라 촬영', 'Take a photo', 'カメラで撮影')}</h3><p>{t('제품 라벨이 가이드 안에 선명하게 보이도록 맞춰 주세요.', 'Position the label clearly within the guide.', '製品ラベル全体がガイド内にはっきり写るようにしてください。')}</p></div><button type="button" onClick={closeCamera} aria-label={t('카메라 닫기', 'Close camera', 'カメラを閉じる')}>×</button></header><div className="camera-preview"><video ref={cameraVideoRef} playsInline muted /><span className="camera-guide" aria-hidden="true" /><small>{t('라벨 전체가 프레임 안에 들어오게 촬영하세요', 'Fit the full label in the frame.', 'ラベル全体がフレームに入るように撮影してください。')}</small></div><footer><button className="btn ghost" type="button" onClick={closeCamera}>{t('취소', 'Cancel', 'キャンセル')}</button><button className="btn camera-shutter" type="button" onClick={captureCameraFrame}><span aria-hidden="true" />{t('사진 촬영', 'Capture photo', '写真を撮影')}</button></footer></section></div>}
      <p className="note">{t('현재 영양 기준·제품 데이터는 기능 검증용 데모이며 수의학적 처방을 대체하지 않습니다.', 'Nutrition standards and product data are currently for feature testing. This service does not replace veterinary advice.', '現在の栄養基準・製品データは機能検証用のデモであり、獣医師による診断や処方に代わるものではありません。')}</p>
    </div>
  )
}
