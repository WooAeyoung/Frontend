import { useEffect, useRef, useState } from 'react'
import { Mic, RefreshCw, Send, Sparkles, Volume2, VolumeX, X } from 'lucide-react'
import { askJarvis, type Analysis } from './api'
import type { Page } from './Home'
import type { SavedRecord } from './Records'
import './jarvis.css'

type Props = { onNavigate: (page: Page) => void; analysis: Analysis | null; records: SavedRecord[] }
type Message = { from: 'user' | 'assistant'; text: string }
type SpeechResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: SpeechResult) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void }
type RecognitionConstructor = new () => Recognition
type CommandAnswer = { answer: string; page?: Page; awaitPetSelection?: boolean; contextPet?: string }

const WELCOME = '안녕하세요. 우애영의 자비스예요. 궁금한 점을 편하게 말씀해 주세요. 영양 분석 결과와 기록을 차근차근 함께 살펴드릴게요.'
const QUICK_PROMPTS = ['오늘 분석 결과 요약해 줘', '칼슘:인 비율 알려줘', '부족한 성분만 보여줘', '지난 기록 열어줘']

function describeAnalysis(analysis: Analysis | null, record?: SavedRecord) {
  if (!analysis) return '아직 완료된 분석 결과가 없어요. 반려동물 정보와 급여 제품을 입력한 뒤 “맞춤 분석 시작하기”를 눌러 주세요.'
  const { deficient = 0, adequate = 0, caution = 0, excess = 0 } = analysis.summary
  const concerns = analysis.nutrients.filter(n => ['DEFICIENT', 'CAUTION', 'EXCESS'].includes(n.status)).map(n => `${n.name} ${n.status === 'DEFICIENT' ? '부족' : n.status === 'EXCESS' ? '과다' : '주의'}`)
  const ratio = analysis.ratios.calciumPhosphorus
  const ratioText = ratio && ratio.value !== null ? ` 칼슘:인 비율은 ${ratio.value.toFixed(2)}:1로 ${ratio.status === 'ADEQUATE' ? '적정 범위' : ratio.status === 'LOW' ? '낮은 편' : ratio.status === 'HIGH' ? '높은 편' : '확인이 필요'}이에요.` : ''
  const source = record ? `${record.name}의 가장 최근 저장 기록(${new Date(record.date).toLocaleDateString('ko-KR')})은` : '오늘 결과는'
  return `확인해 봤어요. ${source} 적정 ${adequate}개, 부족 ${deficient}개, 주의 ${caution}개, 과다 ${excess}개예요.${concerns.length ? ` 먼저 살펴볼 항목은 ${concerns.slice(0, 3).join(', ')}이에요.` : ' 현재 확인된 주의 항목은 없어요.'}${ratioText} 궁금한 성분을 말씀해 주시면 이유와 다음 확인 순서를 쉽게 설명해 드릴게요.`
}

function describeRecord(record: SavedRecord) {
  if (record.analysisSnapshot) return describeAnalysis(record.analysisSnapshot, record)
  const { deficient = 0, adequate = 0, caution = 0, excess = 0 } = record.summary
  return `${record.name}의 저장 기록(${new Date(record.date).toLocaleDateString('ko-KR')})은 적정 ${adequate}개, 부족 ${deficient}개, 주의 ${caution}개, 과다 ${excess}개예요.`
}

function calciumAnswer(analysis: Analysis | null) {
  const calcium = analysis?.nutrients.find(n => n.nutrientId === 'CALCIUM')
  if (calcium) return `최근 분석에서 칼슘은 ${calcium.status === 'DEFICIENT' ? '부족' : calcium.status === 'EXCESS' ? '과다' : calcium.status === 'CAUTION' ? '주의' : '적정'}으로 표시됐어요. 임의로 칼슘제를 더하기보다, 현재 사료·영양제와 급여량을 먼저 확인해 다시 분석해 주세요. 성장기이거나 절뚝임·통증 같은 증상이 있다면 수의사 상담이 필요해요.`
  return '칼슘 부족 여부는 사료와 영양제를 합친 하루 섭취량, 나이·체중, 칼슘:인 비율을 함께 봐야 해요. 임의로 칼슘제를 추가하지 말고, 급여 제품을 등록해 분석한 뒤 결과를 확인해 주세요. 증상이 있으면 수의사와 상담해 주세요.'
}

function nutrientExplanation(analysis: Analysis | null, phrase: string) {
  if (!analysis || !/(왜|이유|설명|확인|부족|과다|주의)/.test(phrase)) return undefined
  const nutrient = analysis.nutrients.find(item => {
    const name = item.name.replace(/\s+/g, '').toLowerCase()
    if (item.nutrientId === 'PHOSPHORUS') return /(^|[^확])인(부족|과다|주의|설명|왜|이유)/.test(phrase)
    if (item.nutrientId === 'CALCIUM') return phrase.includes('칼슘')
    if (item.nutrientId === 'EPA_DHA') return /(오메가3|epa|dha)/.test(phrase)
    return name.length >= 2 && phrase.includes(name)
  })
  if (!nutrient) return undefined
  const status = nutrient.status === 'DEFICIENT' ? '부족' : nutrient.status === 'EXCESS' ? '과다' : nutrient.status === 'CAUTION' ? '주의' : '적정'
  const unit = nutrient.unit.toLowerCase()
  if (nutrient.status === 'DEFICIENT' && nutrient.minimum !== null) {
    const caveat = nutrient.unknownContribution
      ? ' 일부 제품의 성분표가 비어 있어 확인된 양만 반영됐으니, 제품 라벨 값을 보완한 뒤 다시 확인해 주세요.'
      : ' 등록한 제품과 하루 급여량을 합친 값이 기준보다 낮다는 뜻이며, 몸속 결핍을 진단한 것은 아니에요.'
    return `${nutrient.name}이 부족으로 나온 이유는 확인된 하루 섭취량 ${nutrient.total}${unit}이 적용 최소 기준 ${nutrient.minimum}${unit}보다 낮기 때문이에요.${caveat}`
  }
  return `${nutrient.name}은 이 분석에서 ${status}으로 표시됐어요. 제품 라벨의 함량과 하루 급여량을 확인한 뒤 다시 분석해 주세요.`
}

function answerCommand(input: string, analysis: Analysis | null, records: SavedRecord[], awaitingPetSelection: boolean, contextPet: string): CommandAnswer | undefined {
  const phrase = input.replace(/\s+/g, '').toLowerCase()
  const petNames = Array.from(new Set(records.map(record => record.name).filter(Boolean)))
    .sort((a, b) => b.replace(/\s+/g, '').length - a.replace(/\s+/g, '').length)
  const requestedPet = petNames.find(name => phrase.includes(name.replace(/\s+/g, '').toLowerCase()))
  const historicalPet = phrase.match(/(?:과거에?|지난|이전)([a-z0-9가-힣]+?)(?:의)?(?:분석|기록)/)?.[1]
  const inspectionPet = phrase.match(/^([a-z0-9가-힣]+?)(?:의)?(?:검사|점검)(?:결과|기록)?(?:해줘|확인|설명|보여줘?)?$/)?.[1]
  const savedAnalysisPet = phrase.match(/^([a-z0-9가-힣]+?)(?:의)?분석(?:결과|기록)(?:해줘|확인|설명|요약|보여줘?)?$/)?.[1]
  const mentionedPet = historicalPet ?? inspectionPet ?? savedAnalysisPet
  const isSummaryRequest = /(오늘|최근).*(분석|결과).*(요약|설명)|(분석|결과).*(요약|설명)|(요약|설명).*(분석|결과)/.test(phrase)
  const isHistoricalAnalysisRequest = /(과거|지난|이전).*(분석|결과).*(했던|한|설명|요약|보여|찾)|(?:분석|결과).*(과거|지난|이전)/.test(phrase)
  const isInspectionRequest = Boolean(inspectionPet || savedAnalysisPet) || /^(검사|점검)(결과|기록)?(확인|설명|보여줘?)?$/.test(phrase)
  const isRecordRequest = isHistoricalAnalysisRequest || isInspectionRequest || /(건강)?기록.*(있|여기|보여|조회|열|찾)|.*(있|여기).*(건강)?기록|(?:지난|이전|반려동물).*(?:기록|결과)|기록(?:을|보여|조회)/.test(phrase)
  const isSavedResultRequest = isHistoricalAnalysisRequest || /(저장|지난|이전|과거|기록).*(요약|부족|결과|성분|분석|설명)/.test(phrase)
  const isDeficientRequest = /(부족).*(성분|영양)|(?:성분|영양).*(부족)|부족한성분/.test(phrase)
  const prefersSavedSummary = isSavedResultRequest || (isSummaryRequest && Boolean(contextPet || requestedPet || (!analysis && petNames.length === 1)))
  const needsSavedRecord = isRecordRequest || prefersSavedSummary || awaitingPetSelection

  if ((isHistoricalAnalysisRequest || isInspectionRequest) && mentionedPet && !requestedPet) {
    return { answer: `${mentionedPet}의 저장된 분석 기록을 찾지 못했어요. 기록 화면에서 저장된 이름을 확인해 주세요.`, page: 'records' }
  }

  if (needsSavedRecord && petNames.length > 1 && !requestedPet && !petNames.includes(contextPet)) {
    return { answer: `어느 아이의 기록을 볼까요? ${petNames.join(', ')} 중에서 이름을 알려주세요.`, awaitPetSelection: true }
  }

  const selectedPet = requestedPet ?? (petNames.includes(contextPet) ? contextPet : undefined) ?? ((needsSavedRecord || !analysis) && petNames.length === 1 ? petNames[0] : undefined)
  const selectedRecords = selectedPet
    ? records.filter(record => record.name === selectedPet).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    : []
  const selectedRecord = selectedRecords[0]

  if (awaitingPetSelection && selectedRecord) return { answer: `${selectedPet}의 건강 기록이 ${selectedRecords.length}건 있어요. ${describeRecord(selectedRecord)}`, page: 'records', contextPet: selectedPet }
  if (isSummaryRequest) return prefersSavedSummary && selectedRecord
    ? { answer: describeRecord(selectedRecord), page: 'records', contextPet: selectedPet }
    : { answer: describeAnalysis(analysis), page: 'analysis' }
  if (isRecordRequest) {
    if (!records.length) return { answer: '현재 브라우저에 저장된 건강 기록이 없어요.', page: 'records' }
    if (selectedRecord) return { answer: `${selectedPet}의 건강 기록이 ${selectedRecords.length}건 있어요. ${describeRecord(selectedRecord)}`, page: 'records', contextPet: selectedPet }
  }
  if (isDeficientRequest) {
    if (isSavedResultRequest && selectedRecord?.analysisSnapshot) {
      const names = selectedRecord.analysisSnapshot.nutrients.filter(nutrient => nutrient.status === 'DEFICIENT').map(nutrient => nutrient.name)
      return { answer: `${selectedPet}의 ${new Date(selectedRecord.date).toLocaleDateString('ko-KR')} 저장 기록 기준이에요. ${names.length ? `부족으로 표시된 성분은 ${names.join(', ')}이에요.` : '부족으로 표시된 성분은 없어요.'} 현재 분석 결과와는 구분해서 봐 주세요.`, page: 'records' }
    }
    if (!analysis) return { answer: '지금 완료된 분석 결과가 없어서 부족한 성분을 판단할 수 없어요. 과거 저장 기록을 보려면 “저장 기록에서 부족한 성분 보여줘”라고 말씀해 주세요. 현재 상태를 확인하려면 먼저 새 분석을 진행해 주세요.', page: 'analysis' }
    const names = analysis.nutrients.filter(nutrient => nutrient.status === 'DEFICIENT').map(nutrient => nutrient.name)
    return { answer: names.length ? `현재 완료된 분석에서 부족으로 표시된 성분은 ${names.join(', ')}이에요.` : '현재 완료된 분석에서 부족으로 표시된 성분은 없어요.', page: 'analysis' }
  }
  const explanationAnalysis = selectedRecord?.analysisSnapshot ?? analysis
  const explanation = nutrientExplanation(explanationAnalysis, phrase)
  if (explanation) {
    const source = selectedRecord ? `${selectedPet}의 ${new Date(selectedRecord.date).toLocaleDateString('ko-KR')} 저장 기록 기준이에요. ` : '현재 분석 기준이에요. '
    return { answer: source + explanation, page: selectedRecord ? 'records' : 'analysis', contextPet: selectedRecord ? selectedPet : undefined }
  }
  if (/(칼슘).*(부족|낮|어떻게|도움|확인)/.test(phrase)) return { answer: calciumAnswer(analysis), page: 'analysis' }
  if (/(추천).*(영양제|제품|찾)/.test(phrase)) return { answer: analysis ? '현재 분석 결과 아래의 “추천 영양제”에서 추천 목록을 확인할 수 있어요.' : '추천은 반려동물 정보와 현재 급여 제품을 분석한 뒤 제공해요. 먼저 분석 화면에서 정보를 입력해 주세요.', page: 'analysis' }
  if (/(분석|영양제)/.test(phrase)) return { answer: '영양제 분석 화면으로 이동할게요. 반려동물 정보와 급여 제품을 입력해 주세요.', page: 'analysis' }
  if (/(고객센터|문의|도움말)/.test(phrase)) return { answer: '고객센터로 이동할게요.', page: 'support' }
  if (/(홈|처음|메인)/.test(phrase)) return { answer: '홈 화면으로 이동할게요.', page: 'home' }
  if (/(감사|고마워|고맙)/.test(phrase)) return { answer: '별말씀을요. 궁금한 점이 생기면 언제든 편하게 말씀해 주세요.' }
  if (/(안녕|자비스)/.test(phrase)) return { answer: WELCOME }
  return undefined
}

export default function JarvisAssistant({ onNavigate, analysis, records }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [messages, setMessages] = useState<Message[]>([{ from: 'assistant', text: WELCOME }])
  const [loading, setLoading] = useState(false)
  const [speak, setSpeak] = useState(false)
  const [failedInput, setFailedInput] = useState('')
  const [awaitingPetSelection, setAwaitingPetSelection] = useState(false)
  const [contextPet, setContextPet] = useState('')
  const recognition = useRef<Recognition | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => recognition.current?.stop(), [])
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ block: 'nearest' }) }, [messages, open])

  const submit = async (value = input) => {
    const text = value.trim()
    if (!text) return
    setMessages(previous => [...previous, { from: 'user', text }])
    setInput('')
    const localResponse = answerCommand(text, analysis, records, awaitingPetSelection, contextPet)
    if (localResponse) {
      setFailedInput('')
      setAwaitingPetSelection(Boolean(localResponse.awaitPetSelection))
      if (localResponse.contextPet) setContextPet(localResponse.contextPet)
      setMessages(previous => [...previous, { from: 'assistant', text: localResponse.answer }])
      if (speak && 'speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(localResponse.answer))
      if (localResponse.page) onNavigate(localResponse.page)
      return
    }
    setLoading(true)
    try {
      const history = messages.map(message => ({ role: message.from, content: message.text }))
      const response = await askJarvis(text, analysis, history)
      setFailedInput(['AI_RATE_LIMIT', 'AI_TIMEOUT_OR_NETWORK', 'AI_PROVIDER_ERROR', 'AI_EMPTY_RESPONSE', 'AI_UNAVAILABLE'].includes(response.intent) ? text : '')
      setMessages(previous => [...previous, { from: 'assistant', text: response.answer }])
      if (speak && 'speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(response.answer))
      if (response.page) onNavigate(response.page)
    } catch (error) {
      setFailedInput(text)
      const message = error instanceof Error && error.message.includes('늦어지고')
        ? '서버가 깨어나는 중이거나 응답이 지연되고 있어요.'
        : error instanceof Error ? error.message : '자비스 응답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.'
      setMessages(previous => [...previous, { from: 'assistant', text: `${message} 입력하신 내용은 보존했어요.` }])
    } finally { setLoading(false) }
  }

  const listen = () => {
    if (listening) { recognition.current?.stop(); return }
    const speechWindow = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!Constructor) { setMessages(previous => [...previous, { from: 'assistant', text: '이 브라우저에서는 음성 인식을 지원하지 않아요. 텍스트로 입력해 주세요.' }]); return }
    const next = new Constructor()
    next.lang = 'ko-KR'; next.continuous = false; next.interimResults = false
    next.onresult = event => { void submit(event.results[0][0].transcript) }
    next.onerror = () => setMessages(previous => [...previous, { from: 'assistant', text: '음성을 인식하지 못했어요. 마이크 권한을 확인하고 다시 시도해 주세요.' }])
    next.onend = () => setListening(false)
    recognition.current = next
    try { next.start(); setListening(true) } catch { setListening(false) }
  }

  return <aside className="jarvis-root" aria-label="우애영 AI 도우미">
    {open && <section className="jarvis-panel" aria-label="자비스 대화창">
      <header className="jarvis-top"><div className="jarvis-identity"><span className="jarvis-monogram">J</span><div><b>JARVIS</b><small><i /> 자동 응답 · 케어 도우미</small></div></div><div className="jarvis-tools"><button type="button" onClick={() => setSpeak(value => !value)} aria-pressed={speak} title="음성 답변" aria-label={speak ? '음성 답변 끄기' : '음성 답변 켜기'}>{speak ? <Volume2 size={16} /> : <VolumeX size={16} />}</button><button type="button" onClick={() => setOpen(false)} aria-label="자비스 닫기"><X size={17} /></button></div></header>
      <div className="jarvis-context" aria-label="현재 대화 정보"><span>{analysis ? '최근 분석 있음' : '분석 결과 없음'}</span><span>{records.length ? `저장 기록 ${records.length}건` : '저장 기록 없음'}</span><span>{analysis ? '18개 성분 연동' : '기본 안내'}</span></div>
      <div className="jarvis-messages" role="log" aria-live="polite"><span className="jarvis-day">오늘</span>{messages.map((message, index) => <p key={index} className={`jarvis-msg ${message.from}`}>{message.text}</p>)}{messages.length === 1 && <div className="jarvis-quick"><small>이렇게 물어보세요</small><div>{QUICK_PROMPTS.map(prompt => <button type="button" key={prompt} onClick={() => void submit(prompt)}>{prompt}</button>)}</div></div>}<div ref={endRef} /></div>
      {failedInput && !loading && <div className="jarvis-retry-bar" role="status"><span>방금 질문을 그대로 다시 확인할 수 있어요.</span><button type="button" className="jarvis-retry" onClick={() => void submit(failedInput)}><RefreshCw size={14} /> 다시 시도</button></div>}
      <form className="jarvis-form" onSubmit={event => { event.preventDefault(); void submit() }}><button type="button" onClick={listen} aria-label={listening ? '음성 인식 중지' : '음성 인식 시작'} aria-pressed={listening} className={listening ? 'listening' : ''}><Mic size={19} /></button><input value={input} maxLength={500} onChange={event => setInput(event.target.value)} placeholder={loading ? '답변 생성 중…' : '자비스에게 물어보기'} aria-label="자비스 명령 입력" disabled={loading} /><button type="submit" aria-label="메시지 보내기" disabled={!input.trim() || loading}>{loading ? '…' : <Send size={18} />}</button></form>
      <small className="jarvis-note">건강 상태의 진단이나 처방을 대신하지 않습니다.</small>
    </section>}
    <button type="button" className="jarvis-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}><Sparkles size={19} /><span>JARVIS</span></button>
  </aside>
}
