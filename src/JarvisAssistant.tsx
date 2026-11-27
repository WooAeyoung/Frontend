import { useEffect, useRef, useState } from 'react'
import { Mic, RefreshCw, Send, Sparkles, Volume2, VolumeX, X } from 'lucide-react'
import { askJarvis, type Analysis } from './api'
import type { Page } from './Home'
import type { SavedRecord } from './Records'
import './jarvis.css'

type Props = { onNavigate: (page: Page) => void; analysis: Analysis | null; records: SavedRecord[]; language?: 'ko' | 'en' | 'ja' }
type Message = { from: 'user' | 'assistant'; text: string }
type SpeechResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: SpeechResult) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void }
type RecognitionConstructor = new () => Recognition
type CommandAnswer = { answer: string; page?: Page; awaitPetSelection?: boolean; contextPet?: string }

const WELCOME = '안녕하세요. 우애영의 자비스예요. 궁금한 점을 편하게 말씀해 주세요. 영양 분석 결과와 기록을 차근차근 함께 살펴드릴게요.'
const QUICK_PROMPTS = ['오늘 분석 결과 요약해 줘', '칼슘:인 비율 알려줘', '부족한 성분만 보여줘', '지난 기록 열어줘']
const COPY = {
  ko: { welcome: WELCOME, status: '자동 응답 · 케어 도우미', hasAnalysis: '최근 분석 있음', noAnalysis: '분석 결과 없음', records: (count: number) => `저장 기록 ${count}건`, noRecords: '저장 기록 없음', linked: '18개 성분 연동', basic: '기본 안내', today: '오늘', ask: '이렇게 물어보세요', retryHint: '방금 질문을 그대로 다시 확인할 수 있어요.', retry: '다시 시도', listen: '음성 인식 시작', stopListening: '음성 인식 중지', loading: '답변 생성 중…', placeholder: '자비스에게 물어보기', send: '메시지 보내기', note: '건강 상태의 진단이나 처방을 대신하지 않습니다.', panel: '자비스 대화창', assistant: '우애영 AI 도우미', voiceOn: '음성 답변 켜기', voiceOff: '음성 답변 끄기', close: '자비스 닫기', voiceUnsupported: '이 브라우저에서는 음성 인식을 지원하지 않아요. 텍스트로 입력해 주세요.', voiceFailed: '음성을 인식하지 못했어요. 마이크 권한을 확인하고 다시 시도해 주세요.', quick: QUICK_PROMPTS },
  en: { welcome: 'Hello, I’m JARVIS from Wooaeyoung. Ask me anything. I can help you review nutrition analyses and saved records.', status: 'Auto-reply · Care assistant', hasAnalysis: 'Recent analysis available', noAnalysis: 'No analysis yet', records: (count: number) => `${count} saved record${count === 1 ? '' : 's'}`, noRecords: 'No saved records', linked: '18 nutrients connected', basic: 'General guidance', today: 'Today', ask: 'Try asking', retryHint: 'I can check your last question again.', retry: 'Try again', listen: 'Start voice input', stopListening: 'Stop voice input', loading: 'Preparing an answer…', placeholder: 'Ask JARVIS', send: 'Send message', note: 'This is not a diagnosis or treatment recommendation.', panel: 'JARVIS chat', assistant: 'Wooaeyoung AI assistant', voiceOn: 'Turn voice replies on', voiceOff: 'Turn voice replies off', close: 'Close JARVIS', voiceUnsupported: 'Voice recognition is not supported in this browser. Please type your question.', voiceFailed: 'I couldn’t recognize your voice. Check microphone access and try again.', quick: ['Summarize today’s analysis', 'What is the calcium to phosphorus ratio?', 'Show nutrients marked low', 'Open my previous records'] },
  ja: { welcome: 'こんにちは。ウエヨンのJARVISです。栄養分析や保存した記録を一緒に確認します。気軽にお尋ねください。', status: '自動応答 · ケアアシスタント', hasAnalysis: '最近の分析があります', noAnalysis: '分析結果はありません', records: (count: number) => `保存記録 ${count}件`, noRecords: '保存記録はありません', linked: '18項目の栄養素と連携', basic: '基本案内', today: '今日', ask: 'こんな質問ができます', retryHint: '直前の質問をもう一度確認できます。', retry: '再試行', listen: '音声入力を開始', stopListening: '音声入力を停止', loading: '回答を準備しています…', placeholder: 'JARVISに質問する', send: 'メッセージを送信', note: '健康状態の診断や治療の提案を行うものではありません。', panel: 'JARVISチャット', assistant: 'ウエヨン AIアシスタント', voiceOn: '音声回答をオンにする', voiceOff: '音声回答をオフにする', close: 'JARVISを閉じる', voiceUnsupported: 'このブラウザーでは音声認識を利用できません。テキストで入力してください。', voiceFailed: '音声を認識できませんでした。マイクの権限を確認して再度お試しください。', quick: ['今日の分析結果を要約して', 'カルシウムとリンの比率は？', '不足と判定された成分を表示して', '過去の記録を開いて'] }
} as const
const BACKEND_FAILURES = {
  en: { AI_NOT_CONFIGURED: 'The personalized answer service is not configured yet. Analysis summaries and saved records are still available.', AI_AUTHENTICATION: 'The AI provider rejected its credentials. The service team needs to check the API key.', AI_MODEL_NOT_FOUND: 'The configured AI model is unavailable. The service team needs to check the model setting.', AI_RATE_LIMIT: 'The AI provider has reached its usage limit. Please try again later.', AI_TIMEOUT_OR_NETWORK: 'The AI response is taking longer than expected. Please try again in a little while.', AI_PROVIDER_ERROR: 'The AI provider is temporarily unavailable. Please try again later.', AI_EMPTY_RESPONSE: 'The AI provider returned an empty answer. Please try again.', AI_UNAVAILABLE: 'The personalized answer service is temporarily unavailable. Please try again later.' },
  ja: { AI_NOT_CONFIGURED: '個別回答サービスはまだ設定されていません。分析の要約と保存記録は引き続きご利用いただけます。', AI_AUTHENTICATION: 'AIプロバイダーの認証に失敗しました。APIキーの確認が必要です。', AI_MODEL_NOT_FOUND: '設定されたAIモデルを利用できません。モデル設定の確認が必要です。', AI_RATE_LIMIT: 'AIプロバイダーの利用上限に達しました。しばらくしてから再度お試しください。', AI_TIMEOUT_OR_NETWORK: 'AIの回答に時間がかかっています。少し待ってから再度お試しください。', AI_PROVIDER_ERROR: 'AIプロバイダーを一時的に利用できません。後ほど再度お試しください。', AI_EMPTY_RESPONSE: 'AIプロバイダーから回答がありませんでした。もう一度お試しください。', AI_UNAVAILABLE: '個別回答サービスを一時的に利用できません。後ほど再度お試しください。' }
} as const

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

const NUTRIENT_NAMES: Record<string, { en: string; ja: string }> = {
  EPA_DHA: { en: 'EPA+DHA (omega-3)', ja: 'EPA+DHA（オメガ3）' }, CALCIUM: { en: 'Calcium', ja: 'カルシウム' }, PHOSPHORUS: { en: 'Phosphorus', ja: 'リン' },
  COPPER: { en: 'Copper', ja: '銅' }, IODINE: { en: 'Iodine', ja: 'ヨウ素' }, IRON: { en: 'Iron', ja: '鉄' }, MANGANESE: { en: 'Manganese', ja: 'マンガン' },
  SELENIUM: { en: 'Selenium', ja: 'セレン' }, ZINC: { en: 'Zinc', ja: '亜鉛' }, VITAMIN_A: { en: 'Vitamin A', ja: 'ビタミンA' }, VITAMIN_D: { en: 'Vitamin D', ja: 'ビタミンD' },
  VITAMIN_E: { en: 'Vitamin E', ja: 'ビタミンE' }, VITAMIN_B1: { en: 'Vitamin B1', ja: 'ビタミンB1' }, VITAMIN_B6: { en: 'Vitamin B6', ja: 'ビタミンB6' },
  VITAMIN_B12: { en: 'Vitamin B12', ja: 'ビタミンB12' }, FOLATE: { en: 'Folate', ja: '葉酸' }, BIOTIN: { en: 'Biotin', ja: 'ビオチン' }, TAURINE: { en: 'Taurine', ja: 'タウリン' },
}

function quickAnswer(index: number, analysis: Analysis | null, records: SavedRecord[], language: 'ko' | 'en' | 'ja'): CommandAnswer {
  const ja = language === 'ja'
  const label = (nutrient: Analysis['nutrients'][number]) => language === 'ko' ? nutrient.name : NUTRIENT_NAMES[nutrient.nutrientId]?.[language] ?? nutrient.name
  const latest = [...records].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0]
  if (index === 0) {
    if (!analysis) return { answer: ja ? 'まだ完了した分析結果がありません。プロフィールと食べている製品を入力して分析してください。' : 'There is no completed analysis yet. Enter your pet’s profile and products, then start an analysis.', page: 'analysis' }
    const s = analysis.summary
    return { answer: ja ? `最新の分析結果です。不足 ${s.deficient ?? 0}項目、適正 ${s.adequate ?? 0}項目、注意 ${s.caution ?? 0}項目、過剰 ${s.excess ?? 0}項目です。気になる栄養素があれば、理由も説明します。` : `Here is the latest analysis: ${s.deficient ?? 0} low, ${s.adequate ?? 0} adequate, ${s.caution ?? 0} caution, and ${s.excess ?? 0} high nutrient results. Ask me about any nutrient for more detail.`, page: 'analysis' }
  }
  if (index === 1) {
    const ratio = analysis?.ratios.calciumPhosphorus
    if (!ratio || ratio.value == null) return { answer: ja ? 'カルシウムとリンの比率を確認できる分析結果がありません。製品を入力して分析してください。' : 'I don’t have an analysis with a calcium to phosphorus ratio yet. Enter the products and run an analysis first.', page: 'analysis' }
    return { answer: ja ? `カルシウムとリンの比率は ${ratio.value.toFixed(2)}:1 です。判定は${ratio.status === 'ADEQUATE' ? '適正' : '確認が必要'}です。` : `The calcium to phosphorus ratio is ${ratio.value.toFixed(2)}:1. The result is ${ratio.status === 'ADEQUATE' ? 'within range' : 'outside the expected range'}.`, page: 'analysis' }
  }
  if (index === 2) {
    const source = analysis?.nutrients ?? []
    if (!analysis) return { answer: ja ? '現在の不足成分を確認できる分析結果がありません。先に分析してください。' : 'There is no completed analysis to check for low nutrients. Please run an analysis first.', page: 'analysis' }
    const names = source.filter(item => item.status === 'DEFICIENT').map(label)
    return { answer: names.length ? (ja ? `不足と判定された成分は${names.join('、')}です。これは入力された摂取量と基準の比較結果です。` : `Nutrients marked low: ${names.join(', ')}. This compares the intake you entered with the selected standard.`) : (ja ? '現在の分析では不足と判定された成分はありません。' : 'No nutrients are marked low in the current analysis.'), page: 'analysis' }
  }
  if (!latest) return { answer: ja ? '保存された記録はまだありません。分析結果を保存すると、ここから確認できます。' : 'There are no saved records yet. Save an analysis to review it here.', page: 'records' }
  const summary = latest.summary
  const date = new Date(latest.date).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US')
  return { answer: ja ? `${latest.name}さんの${date}の保存記録です。不足 ${summary.deficient ?? 0}項目、適正 ${summary.adequate ?? 0}項目、注意 ${summary.caution ?? 0}項目、過剰 ${summary.excess ?? 0}項目です。記録画面で詳細を確認できます。` : `${latest.name}’s saved record from ${date}: ${summary.deficient ?? 0} low, ${summary.adequate ?? 0} adequate, ${summary.caution ?? 0} caution, and ${summary.excess ?? 0} high results. Open Pet records to see the details.`, page: 'records' }
}

function answerCommand(input: string, analysis: Analysis | null, records: SavedRecord[], awaitingPetSelection: boolean, contextPet: string): CommandAnswer | undefined {
  const phrase = input.replace(/\s+/g, '').toLowerCase()
  const petNames = Array.from(new Set(records.map(record => record.name).filter(Boolean)))
    .sort((a, b) => b.replace(/\s+/g, '').length - a.replace(/\s+/g, '').length)
  const requestedPet = petNames.find(name => phrase.includes(name.replace(/\s+/g, '').toLowerCase()))
  const historicalPet = phrase.match(/(?:과거에?|지난|이전)([a-z0-9가-힣]+?)(?:의)?(?:분석|기록)/)?.[1]
  const inspectionPet = phrase.match(/^([a-z0-9가-힣]+?)(?:의)?(?:검사|점검)(?:결과|기록)?(?:해줘|확인|설명|보여줘?)?$/)?.[1]
  const savedAnalysisPet = phrase.match(/^([a-z0-9가-힣]+?)(?:의)?분석(?:결과|기록)(?:해줘|확인|설명|요약|보여줘?)?$/)?.[1]
  const healthRecordPet = phrase.match(/^([a-z0-9가-힣]+?)(?:의)?건강기록(?:해줘|확인|설명|요약|보여줘?)?$/)?.[1]
  const mentionedPet = historicalPet ?? inspectionPet ?? savedAnalysisPet ?? healthRecordPet
  const isSummaryRequest = /(오늘|최근).*(분석|결과).*(요약|설명)|(분석|결과).*(요약|설명)|(요약|설명).*(분석|결과)/.test(phrase)
  const isHistoricalAnalysisRequest = /(과거|지난|이전).*(분석|결과).*(했던|한|설명|요약|보여|찾)|(?:분석|결과).*(과거|지난|이전)/.test(phrase)
  const isInspectionRequest = Boolean(inspectionPet || savedAnalysisPet || healthRecordPet) || /^(검사|점검)(결과|기록)?(확인|설명|보여줘?)?$/.test(phrase)
  const isRecordRequest = isHistoricalAnalysisRequest || isInspectionRequest || /(건강)?기록.*(있|여기|보여|조회|열|찾)|.*(있|여기).*(건강)?기록|(?:지난|이전|반려동물).*(?:기록|결과)|기록(?:을|보여|조회)/.test(phrase)
  const isSavedResultRequest = isHistoricalAnalysisRequest || /(저장|지난|이전|과거|기록).*(요약|부족|결과|성분|분석|설명)/.test(phrase)
  const isDeficientRequest = /(부족).*(성분|영양)|(?:성분|영양).*(부족)|부족한성분/.test(phrase)
  const prefersSavedSummary = isSavedResultRequest || (isSummaryRequest && Boolean(contextPet || requestedPet || (!analysis && petNames.length === 1)))
  const needsSavedRecord = isRecordRequest || prefersSavedSummary || awaitingPetSelection

  if ((isHistoricalAnalysisRequest || isInspectionRequest) && mentionedPet && !requestedPet) {
    return { answer: `${mentionedPet}의 저장된 건강 기록을 찾지 못했어요. 기록 화면에서 저장된 이름을 확인해 주세요.`, page: 'records' }
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
  if (/^(?:영양제)?분석(?:화면|페이지)?(?:으로)?(?:이동|열어|열기|가줘|가자|시작)(?:해줘|줘)?$/.test(phrase)) return { answer: '영양제 분석 화면으로 이동할게요. 반려동물 정보와 급여 제품을 입력해 주세요.', page: 'analysis' }
  if (/(고객센터|문의|도움말)/.test(phrase)) return { answer: '고객센터로 이동할게요.', page: 'support' }
  if (/(홈|처음|메인)/.test(phrase)) return { answer: '홈 화면으로 이동할게요.', page: 'home' }
  if (/(감사|고마워|고맙)/.test(phrase)) return { answer: '별말씀을요. 궁금한 점이 생기면 언제든 편하게 말씀해 주세요.' }
  if (/(안녕|자비스)/.test(phrase)) return { answer: WELCOME }
  return undefined
}

export default function JarvisAssistant({ onNavigate, analysis, records, language = 'ko' }: Props) {
  const t = COPY[language]
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [messages, setMessages] = useState<Message[]>([{ from: 'assistant', text: t.welcome }])
  const [loading, setLoading] = useState(false)
  const [speak, setSpeak] = useState(false)
  const [failedInput, setFailedInput] = useState('')
  const [awaitingPetSelection, setAwaitingPetSelection] = useState(false)
  const [contextPet, setContextPet] = useState('')
  const recognition = useRef<Recognition | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => recognition.current?.stop(), [])
  useEffect(() => { setMessages(previous => previous.length === 1 && previous[0].from === 'assistant' && (previous[0].text === WELCOME || Object.values(COPY).some(copy => previous[0].text === copy.welcome)) ? [{ from: 'assistant', text: t.welcome }] : previous) }, [t.welcome])
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ block: 'nearest' }) }, [messages, open])

  const submit = async (value = input) => {
    const text = value.trim()
    if (!text) return
    setMessages(previous => [...previous, { from: 'user', text }])
    setInput('')
    const quickIndex = language === 'ko' ? -1 : t.quick.findIndex(prompt => prompt.toLocaleLowerCase() === text.toLocaleLowerCase())
    const localResponse = quickIndex >= 0 ? quickAnswer(quickIndex, analysis, records, language) : language === 'ko' ? answerCommand(text, analysis, records, awaitingPetSelection, contextPet) : undefined
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
      const response = await askJarvis(text, analysis, history, language)
      setFailedInput(['AI_RATE_LIMIT', 'AI_TIMEOUT_OR_NETWORK', 'AI_PROVIDER_ERROR', 'AI_EMPTY_RESPONSE', 'AI_UNAVAILABLE'].includes(response.intent) ? text : '')
      const answer = language === 'ko' ? response.answer : BACKEND_FAILURES[language][response.intent as keyof typeof BACKEND_FAILURES[typeof language]] ?? response.answer
      setMessages(previous => [...previous, { from: 'assistant', text: answer }])
      if (speak && 'speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(answer))
      if (response.page) onNavigate(response.page)
    } catch (error) {
      setFailedInput(text)
      const message = error instanceof Error && error.message.includes('늦어지고')
        ? '서버가 깨어나는 중이거나 응답이 지연되고 있어요.'
        : error instanceof Error ? error.message : '자비스 응답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.'
      setMessages(previous => [...previous, { from: 'assistant', text: `${message} 입력하신 내용은 보존했어요.` }])
    } finally { setLoading(false) }
  }

  useEffect(() => {
    let typingTimer = 0
    let sendTimer = 0
    const demo = () => {
      window.clearInterval(typingTimer)
      window.clearTimeout(sendTimer)
      const example = language === 'en' ? 'Hi JARVIS, what can you help me with?' : language === 'ja' ? 'こんにちはJARVIS、どんなことを手伝ってくれますか？' : '안녕 자비스, 어떤 도움을 받을 수 있어?'
      let length = 0
      setOpen(true)
      setSpeak(true)
      setInput('')
      typingTimer = window.setInterval(() => {
        length += 1
        setInput(example.slice(0, length))
        if (length >= example.length) {
          window.clearInterval(typingTimer)
          sendTimer = window.setTimeout(() => {
            const answer = language === 'en' ? 'I can summarize analysis results, find saved records, and explain nutrients.' : language === 'ja' ? '分析結果の要約、保存記録の確認、栄養素の説明をお手伝いします。' : '분석 결과 요약, 저장 기록 조회, 영양 성분 설명을 도와드릴 수 있어요.'
            setInput('')
            setMessages(previous => [...previous, { from: 'user', text: example }, { from: 'assistant', text: answer }])
            if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(answer))
          }, 650)
        }
      }, 65)
    }
    const cancelDemo = () => {
      window.clearInterval(typingTimer)
      window.clearTimeout(sendTimer)
      setInput('')
      setOpen(false)
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
    const pauseDemo = () => {
      window.clearInterval(typingTimer)
      window.clearTimeout(sendTimer)
    }
    window.addEventListener('wooaeyoung:pause-tour-demos', pauseDemo)
    window.addEventListener('wooaeyoung:demo-jarvis', demo)
    window.addEventListener('wooaeyoung:cancel-tour-demos', cancelDemo)
    return () => {
      window.clearInterval(typingTimer)
      window.clearTimeout(sendTimer)
      window.removeEventListener('wooaeyoung:pause-tour-demos', pauseDemo); window.removeEventListener('wooaeyoung:demo-jarvis', demo)
      window.removeEventListener('wooaeyoung:cancel-tour-demos', cancelDemo)
    }
  }, [language])

  const listen = () => {
    if (listening) { recognition.current?.stop(); return }
    const speechWindow = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!Constructor) { setMessages(previous => [...previous, { from: 'assistant', text: t.voiceUnsupported }]); return }
    const next = new Constructor()
    next.lang = language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'ko-KR'; next.continuous = false; next.interimResults = false
    next.onresult = event => { void submit(event.results[0][0].transcript) }
    next.onerror = () => setMessages(previous => [...previous, { from: 'assistant', text: t.voiceFailed }])
    next.onend = () => setListening(false)
    recognition.current = next
    try { next.start(); setListening(true) } catch { setListening(false) }
  }

  return <aside className="jarvis-root" aria-label={t.assistant}>
    {open && <section className="jarvis-panel" aria-label={t.panel}>
      <header className="jarvis-top"><div className="jarvis-identity"><span className="jarvis-monogram">J</span><div><b>JARVIS</b><small><i /> {t.status}</small></div></div><div className="jarvis-tools"><button type="button" onClick={() => setSpeak(value => !value)} aria-pressed={speak} title={speak ? t.voiceOff : t.voiceOn} aria-label={speak ? t.voiceOff : t.voiceOn}>{speak ? <Volume2 size={16} /> : <VolumeX size={16} />}</button><button type="button" onClick={() => setOpen(false)} aria-label={t.close}><X size={17} /></button></div></header>
      <div className="jarvis-context" aria-label={language === 'en' ? 'Conversation context' : language === 'ja' ? '会話の情報' : '현재 대화 정보'}><span>{analysis ? t.hasAnalysis : t.noAnalysis}</span><span>{records.length ? t.records(records.length) : t.noRecords}</span><span>{analysis ? t.linked : t.basic}</span></div>
      <div className="jarvis-messages" role="log" aria-live="polite"><span className="jarvis-day">{t.today}</span>{messages.map((message, index) => <p key={index} className={`jarvis-msg ${message.from}`}>{message.text}</p>)}{messages.length === 1 && <div className="jarvis-quick"><small>{t.ask}</small><div>{t.quick.map(prompt => <button type="button" key={prompt} onClick={() => void submit(prompt)}>{prompt}</button>)}</div></div>}<div ref={endRef} /></div>
      {failedInput && !loading && <div className="jarvis-retry-bar" role="status"><span>{t.retryHint}</span><button type="button" className="jarvis-retry" onClick={() => void submit(failedInput)}><RefreshCw size={14} /> {t.retry}</button></div>}
      <form className="jarvis-form" onSubmit={event => { event.preventDefault(); void submit() }}><button type="button" onClick={listen} aria-label={listening ? t.stopListening : t.listen} aria-pressed={listening} className={listening ? 'listening' : ''}><Mic size={19} /></button><input value={input} maxLength={500} onChange={event => setInput(event.target.value)} placeholder={loading ? t.loading : t.placeholder} aria-label={t.placeholder} disabled={loading} /><button type="submit" aria-label={t.send} disabled={!input.trim() || loading}>{loading ? '…' : <Send size={18} />}</button></form>
      <small className="jarvis-note">{t.note}</small>
    </section>}
    <button type="button" className="jarvis-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}><Sparkles size={19} /><span>JARVIS</span></button>
  </aside>
}
