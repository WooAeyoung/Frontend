import { useEffect, useMemo, useRef, useState } from 'react'
import type { Analysis, Profile } from './api'
import NutritionReport from './NutritionReport'
import { nutritionOneLine } from './nutritionInsight'

export type SavedRecord = { id: string; profileId?: string; date: string; name: string; species: string; items: string[]; summary: Record<string, number>; oneLineInsight?: string; standardVersion?: string; standardSource?: string; analysisSnapshot?: Analysis; profileSnapshot?: Profile }
export type SavedProfile = Profile & { id: string; savedAt: string }
type DailyLog = { id: string; profileId: string; date: string; feedingDone: boolean; appetite: '좋음' | '보통' | '낮음'; stool: '정상' | '묽음' | '단단함' | '기록 안 함'; vitality: '좋음' | '보통' | '낮음'; weightKg?: number }
type Reminder = { profileId: string; time: string; enabled: boolean }
const KEY = 'wooaeyoung.records'
const PROFILE_KEY = 'wooaeyoung.profiles'
const DAILY_KEY = 'wooaeyoung.daily-logs'
const REMINDER_KEY = 'wooaeyoung.feeding-reminders'
const PDF_KEY = 'wooaeyoung.imported-pdfs'
const storageMessage = '저장하지 못했어요. 브라우저 저장 공간과 저장 허용 설정을 확인해 주세요.'
function persist(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true }
  catch { return false }
}
type ImportedPdf = { id: string; profileId?: string; name: string; size: number; addedAt: string; dataUrl?: string }
const read = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) ?? '') as T } catch { return fallback } }
export const loadRecords = (): SavedRecord[] => read<SavedRecord[]>(KEY, []).map(record => record.oneLineInsight || !record.analysisSnapshot ? record : { ...record, oneLineInsight: nutritionOneLine(record.analysisSnapshot) })
export const loadProfiles = (): SavedProfile[] => read<SavedProfile[]>(PROFILE_KEY, [])
export function saveRecord(record: SavedRecord) { localStorage.setItem(KEY, JSON.stringify([record, ...loadRecords()])); window.dispatchEvent(new CustomEvent('wooaeyoung:records-changed')) }
export function saveProfile(profile: Profile, id: string = crypto.randomUUID()): SavedProfile { const next: SavedProfile = { ...profile, id, savedAt: new Date().toISOString() }; const profiles = loadProfiles(); const index = profiles.findIndex(item => item.id === id); localStorage.setItem(PROFILE_KEY, JSON.stringify(index >= 0 ? profiles.map(item => item.id === id ? next : item) : [next, ...profiles])); window.dispatchEvent(new CustomEvent('wooaeyoung:profiles-changed')); return next }
const today = () => new Date().toISOString().slice(0, 10)
const loadDaily = (): DailyLog[] => read<DailyLog[]>(DAILY_KEY, [])
const loadReminders = (): Reminder[] => read<Reminder[]>(REMINDER_KEY, [])
const loadImportedPdfs = (): ImportedPdf[] => read<ImportedPdf[]>(PDF_KEY, [])
export const loadImportedPdfCount = (profileId?: string) => loadImportedPdfs().filter(file => !profileId || file.profileId === profileId).length
const openPdfPreview = (dataUrl: string) => { const base64 = dataUrl.split(',')[1] || ''; const binary = atob(base64); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i); const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })); window.open(url, '_blank', 'noopener,noreferrer'); window.setTimeout(() => URL.revokeObjectURL(url), 60_000) }

function healthOneLine(profile: SavedProfile, records: SavedRecord[], language: Language): string {
  const logs = loadDaily().filter(log => log.profileId === profile.id).sort((a, b) => b.date.localeCompare(a.date))
  const latest = logs[0]
  const latestWeight = latest?.weightKg ?? profile.weightKg
  const previous = logs.find(log => log.weightKg != null && log.id !== latest?.id)?.weightKg
  const weight = previous != null && latest?.weightKg != null ? tr(language, `최근 체중 ${latestWeight}kg (${latestWeight > previous ? '+' : ''}${(latestWeight - previous).toFixed(1)}kg)`, `Latest weight: ${latestWeight}kg (${latestWeight > previous ? '+' : ''}${(latestWeight - previous).toFixed(1)}kg)`, `最近の体重 ${latestWeight}kg（${latestWeight > previous ? '+' : ''}${(latestWeight - previous).toFixed(1)}kg）`) : tr(language, `현재 기록 체중 ${latestWeight}kg`, `Recorded weight: ${latestWeight}kg`, `記録上の体重 ${latestWeight}kg`)
  const appetite = latest ? tr(language, latest.appetite, ({ 좋음: 'Good', 보통: 'Normal', 낮음: 'Low' } as Record<string, string>)[latest.appetite], ({ 좋음: '良い', 보통: '普通', 낮음: '低い' } as Record<string, string>)[latest.appetite]) : ''
  const vitality = latest ? tr(language, latest.vitality, ({ 좋음: 'Good', 보통: 'Normal', 낮음: 'Low' } as Record<string, string>)[latest.vitality], ({ 좋음: '良い', 보통: '普通', 낮음: '低い' } as Record<string, string>)[latest.vitality]) : ''
  const stool = latest ? tr(language, latest.stool, ({ 정상: 'Normal', 묽음: 'Loose', 단단함: 'Firm', '기록 안 함': 'Not recorded' } as Record<string, string>)[latest.stool], ({ 정상: '正常', 묽음: '軟便', 단단함: '硬め', '기록 안 함': '未記録' } as Record<string, string>)[latest.stool]) : ''
  const condition = latest ? tr(language, `${latest.date} 컨디션 · 식욕 ${latest.appetite} · 활력 ${latest.vitality} · 배변 ${latest.stool}`, `${latest.date} wellbeing · Appetite ${appetite} · Energy ${vitality} · Stool ${stool}`, `${latest.date}の体調 · 食欲 ${appetite} · 活力 ${vitality} · 便 ${stool}`) : tr(language, '식욕·활력·배변 기록이 아직 없어요', 'No appetite, energy, or stool records yet', '食欲・活力・便の記録はまだありません')
  const nutrition = records[0] ? (records[0].analysisSnapshot ? language === 'ko' ? records[0].oneLineInsight ?? nutritionOneLine(records[0].analysisSnapshot) : tr(language, `최근 영양 분석: 부족 ${records[0].summary.deficient ?? 0}개 · 적정 ${records[0].summary.adequate ?? 0}개`, `Latest nutrition analysis: ${records[0].summary.deficient ?? 0} low · ${records[0].summary.adequate ?? 0} adequate`, `最新の栄養分析：不足${records[0].summary.deficient ?? 0}項目・適正${records[0].summary.adequate ?? 0}項目`) : tr(language, records[0].oneLineInsight ?? `최근 영양 분석: 적정 ${records[0].summary.adequate ?? 0}개`, records[0].oneLineInsight ?? `Latest nutrition analysis: ${records[0].summary.adequate ?? 0} adequate`, records[0].oneLineInsight ?? `最新の栄養分析：適正${records[0].summary.adequate ?? 0}項目`)) : tr(language, '영양 분석 기록이 아직 없어요', 'No nutrition analysis records yet', '栄養分析の記録はまだありません')
  return `${weight} · ${condition} · ${nutrition}`
}

type RecordTab = 'today' | 'analysis' | 'trend' | 'reminder'
type Language = 'ko' | 'en' | 'ja'
const tr = (language: Language, ko: string, en: string, ja: string) => language === 'en' ? en : language === 'ja' ? ja : ko
const dateLocale = (language: Language) => language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'ko-KR'

function ProfileTools({ profile, records: _records, view, language }: { profile: SavedProfile; records: SavedRecord[]; view: Exclude<RecordTab, 'analysis'>; language: Language }) {
  const t = (ko: string, en: string, ja: string) => tr(language, ko, en, ja)
  const [daily, setDaily] = useState<DailyLog[]>(loadDaily)
  const [reminders, setReminders] = useState<Reminder[]>(loadReminders)
  const existing = daily.find(item => item.profileId === profile.id && item.date === today())
  const [form, setForm] = useState<Omit<DailyLog, 'id' | 'profileId' | 'date'>>({ feedingDone: existing?.feedingDone ?? false, appetite: existing?.appetite ?? '보통', stool: existing?.stool ?? '기록 안 함', vitality: existing?.vitality ?? '보통', weightKg: existing?.weightKg })
  const reminder = reminders.find(item => item.profileId === profile.id) ?? { profileId: profile.id, time: '08:00', enabled: false }
  const [reminderTime, setReminderTime] = useState(reminder.time)
  const [notice, setNotice] = useState('')
  const fired = useRef('')
  useEffect(() => { const latest = daily.find(item => item.profileId === profile.id && item.date === today()); setForm({ feedingDone: latest?.feedingDone ?? false, appetite: latest?.appetite ?? '보통', stool: latest?.stool ?? '기록 안 함', vitality: latest?.vitality ?? '보통', weightKg: latest?.weightKg }) }, [profile.id, daily])
  useEffect(() => { const timer = window.setInterval(() => { const active = reminders.find(item => item.profileId === profile.id && item.enabled); const now = new Date(); const hhmm = now.toTimeString().slice(0, 5); const key = `${profile.id}-${today()}-${hhmm}`; if (!active || active.time !== hhmm || fired.current === key) return; fired.current = key; if ('Notification' in window && Notification.permission === 'granted') new Notification(t(`${profile.name}의 급여 시간`, `Feeding time for ${profile.name}`, `${profile.name}の給餌時間`), { body: t('사료·영양제 급여 여부를 확인해 주세요.', 'Please check off food and supplements.', 'フード・サプリの給餌を記録してください。') }); else setNotice(t(`${profile.name}의 급여 시간이에요. 오늘의 급여를 체크해 주세요.`, `It’s feeding time for ${profile.name}. Record today’s feeding.`, `${profile.name}の給餌時間です。今日の給餌を記録してください。`)) }, 20_000); return () => window.clearInterval(timer) }, [profile.id, profile.name, reminders, language])
  const saveDaily = () => {
    if (form.weightKg != null && (!Number.isFinite(form.weightKg) || form.weightKg <= 0)) { setNotice(t('체중은 0보다 큰 숫자로 입력해 주세요.', 'Enter a weight greater than zero.', '体重は0より大きい数値を入力してください。')); return }
    try {
      const item: DailyLog = { id: existing?.id ?? crypto.randomUUID(), profileId: profile.id, date: today(), ...form }
      const next = existing ? daily.map(log => log.id === item.id ? item : log) : [item, ...daily]
      localStorage.setItem(DAILY_KEY, JSON.stringify(next)); setDaily(next)
      window.dispatchEvent(new Event('wooaeyoung:records-changed')); setNotice(t('오늘의 기록을 저장했어요.', 'Today’s record has been saved.', '今日の記録を保存しました。'))
    } catch { setNotice(t('기록을 저장하지 못했어요. 브라우저 저장 공간과 저장 허용 설정을 확인해 주세요.', 'Could not save the record. Check browser storage and permissions.', '記録を保存できませんでした。ブラウザーの保存容量と設定を確認してください。')) }
  }
  const saveReminder = async () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) { setNotice(t('올바른 알림 시간을 선택해 주세요.', 'Choose a valid reminder time.', '正しい通知時刻を選択してください。')); return }
    try {
      let enabled = false
      if ('Notification' in window) enabled = Notification.permission === 'granted' || await Notification.requestPermission() === 'granted'
      const next = reminders.filter(item => item.profileId !== profile.id).concat({ profileId: profile.id, time: reminderTime, enabled })
      if (!persist(REMINDER_KEY, next)) { setNotice(t(storageMessage, 'Could not save. Check browser storage and permissions.', '保存できませんでした。ブラウザーの保存容量と設定を確認してください。')); return }
      setReminders(next); setNotice(enabled ? t('급여 알림을 저장했어요. 이 탭을 열어 두면 알려드려요.', 'Feeding reminder saved. Keep this tab open to receive it.', '給餌通知を保存しました。このタブを開いたままにすると通知します。') : t('알림을 사용할 수 없어 시간만 저장했어요.', 'Notifications are unavailable, so only the time was saved.', '通知を利用できないため、時刻のみ保存しました。'))
    } catch { setNotice(t('알림 권한을 확인하지 못했어요. 브라우저 설정을 확인해 주세요.', 'Could not check notification permission. Review your browser settings.', '通知の権限を確認できませんでした。ブラウザーの設定を確認してください。')) }
  }
  const dailyChart = useMemo(() => daily.filter(item => item.profileId === profile.id).sort((a, b) => a.date.localeCompare(b.date)).slice(-7), [daily, profile.id])
  const conditionScore = (item: DailyLog) => (item.feedingDone ? 2 : 0) + ({ 좋음: 2, 보통: 1, 낮음: 0 }[item.appetite]) + ({ 좋음: 2, 보통: 1, 낮음: 0 }[item.vitality]) + ({ 정상: 2, '기록 안 함': 1, 묽음: 0, 단단함: 0 }[item.stool])
  const pointList = dailyChart.map((item, index) => { const x = dailyChart.length === 1 ? 150 : 16 + (index * 268) / (dailyChart.length - 1); const y = 92 - (conditionScore(item) / 8) * 70; return [x, y] as const })
  return <div className="care-tools compact" aria-live="polite">
    {view === 'today' && <section className="panel daily-log-panel workspace-panel"><p className="eyebrow">{t('오늘', 'TODAY', '今日')} · {today()}</p><h4>{t('오늘의 컨디션', 'Today’s wellbeing', '今日の体調')}</h4><p className="workspace-panel-copy">{t('자주 확인하는 항목만 한 화면에서 빠르게 기록하세요.', 'Quickly record the essentials in one place.', 'よく確認する項目をまとめて記録しましょう。')}</p><label className="feeding-check"><input type="checkbox" checked={form.feedingDone} onChange={event => setForm(current => ({ ...current, feedingDone: event.target.checked }))} /> {t('오늘 사료·영양제 급여 완료', 'Food and supplements given today', '今日のフード・サプリの給餌完了')}</label><div className="daily-fields"><label>{t('식욕', 'Appetite', '食欲')}<select value={form.appetite} onChange={event => setForm(current => ({ ...current, appetite: event.target.value as DailyLog['appetite'] }))}><option value="좋음">{t('좋음', 'Good', '良い')}</option><option value="보통">{t('보통', 'Normal', '普通')}</option><option value="낮음">{t('낮음', 'Low', '低い')}</option></select></label><label>{t('변 상태', 'Stool', '便の状態')}<select value={form.stool} onChange={event => setForm(current => ({ ...current, stool: event.target.value as DailyLog['stool'] }))}><option value="기록 안 함">{t('기록 안 함', 'Not recorded', '未記録')}</option><option value="정상">{t('정상', 'Normal', '正常')}</option><option value="묽음">{t('묽음', 'Loose', '軟便')}</option><option value="단단함">{t('단단함', 'Firm', '硬め')}</option></select></label><label>{t('활력', 'Energy', '活力')}<select value={form.vitality} onChange={event => setForm(current => ({ ...current, vitality: event.target.value as DailyLog['vitality'] }))}><option value="좋음">{t('좋음', 'Good', '良い')}</option><option value="보통">{t('보통', 'Normal', '普通')}</option><option value="낮음">{t('낮음', 'Low', '低い')}</option></select></label><label>{t('오늘 체중 (kg)', 'Today’s weight (kg)', '今日の体重 (kg)')}<input type="number" min="0" step="0.1" value={form.weightKg ?? ''} onChange={event => setForm(current => ({ ...current, weightKg: event.target.value ? Number(event.target.value) : undefined }))} /></label></div><button className="btn" onClick={saveDaily}>{t('오늘 기록 저장', 'Save today’s record', '今日の記録を保存')}</button></section>}
    {view === 'trend' && <section className="panel comparison-panel workspace-panel"><p className="eyebrow">DAILY HEALTH TREND</p><h4>{t('오늘 기록 변화', 'Daily record trends', '日々の記録の推移')}</h4><p className="workspace-panel-copy">{t('최근 7일의 급여 완료, 식욕, 활력, 변 상태와 체중 기록을 비교합니다.', 'Compare feeding, appetite, energy, stool, and weight over the past 7 days.', '過去7日間の給餌・食欲・活力・便の状態・体重を比較します。')}</p>{dailyChart.length < 2 ? <p className="note">{t(`오늘 기록을 2일 이상 저장하면 날짜별 컨디션 변화가 표시됩니다. 현재 ${dailyChart.length}일 기록되어 있어요.`, `Save at least 2 days of records to see wellbeing trends. ${dailyChart.length} day(s) recorded so far.`, `2日以上記録すると日ごとの体調変化が表示されます。現在${dailyChart.length}日分の記録があります。`)}</p> : <><div className="comparison-chart"><svg viewBox="0 0 300 112" role="img" aria-label={t('날짜별 오늘 기록 컨디션 변화 그래프', 'Daily wellbeing trend chart', '日ごとの体調推移グラフ')}><line x1="16" y1="92" x2="284" y2="92" /><polyline points={pointList.map(point => point.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{pointList.map(([x, y], index) => <circle key={dailyChart[index].id} cx={x} cy={y} r="4" />)}</svg></div><div className="chart-labels daily-trend-labels">{dailyChart.map(item => <span key={item.id}>{new Date(`${item.date}T00:00:00`).toLocaleDateString(dateLocale(language), { month: 'numeric', day: 'numeric' })}<b>{t('컨디션', 'Wellbeing', '体調')} {conditionScore(item)}/8</b><small>{t(item.appetite, item.appetite === '좋음' ? 'Good appetite' : item.appetite === '보통' ? 'Normal appetite' : 'Low appetite', item.appetite === '좋음' ? '食欲：良い' : item.appetite === '보통' ? '食欲：普通' : '食欲：低い')} · {t(item.vitality, item.vitality === '좋음' ? 'Good energy' : item.vitality === '보통' ? 'Normal energy' : 'Low energy', item.vitality === '좋음' ? '活力：良い' : item.vitality === '보통' ? '活力：普通' : '活力：低い')}{item.weightKg ? ` · ${item.weightKg}kg` : ''}</small></span>)}</div></>}</section>}
    {view === 'reminder' && <section className="panel reminder-panel workspace-panel"><p className="eyebrow">FEEDING REMINDER</p><h4>{t('사료·영양제 시간 알림', 'Feeding reminders', '給餌リマインダー')}</h4><p className="workspace-panel-copy">{t('브라우저 탭을 열어 둔 동안 설정한 시간에 알려드려요.', 'We’ll notify you at the set time while this browser tab is open.', 'このブラウザーのタブを開いている間、設定時刻にお知らせします。')}</p><label>{t('알림 시간', 'Reminder time', '通知時刻')}<input type="time" value={reminderTime} onChange={event => setReminderTime(event.target.value)} /></label><button className="btn" onClick={saveReminder}>{t('알림 저장', 'Save reminder', '通知を保存')}</button></section>}
    {notice && <p className="care-notice">{notice}</p>}
  </div>
}

export default function Records({ selectProfile, embedded, language = 'ko' }: { go: (p: 'analysis') => void; selectProfile: (id: string) => void; embedded?: boolean; language?: Language }) {
  const t = (ko: string, en: string, ja: string) => tr(language, ko, en, ja)
  const [list, setList] = useState<SavedRecord[]>(loadRecords)
  const [profiles, setProfiles] = useState<SavedProfile[]>(loadProfiles)
  const [openReport, setOpenReport] = useState<SavedRecord | null>(null)
  const [selectedId, setSelectedId] = useState(() => loadProfiles()[0]?.id ?? '')
  const [activeTab, setActiveTab] = useState<RecordTab>('today')
  const demoState = useRef({ selectedId, activeTab, profiles })
  demoState.current = { selectedId, activeTab, profiles }
  const importInput = useRef<HTMLInputElement>(null)
  const [importNotice, setImportNotice] = useState('')
  const [importedPdfs, setImportedPdfs] = useState<ImportedPdf[]>(loadImportedPdfs)
  useEffect(() => { const refresh = () => { setList(loadRecords()); setProfiles(loadProfiles()) }; window.addEventListener('wooaeyoung:records-changed', refresh); window.addEventListener('wooaeyoung:profiles-changed', refresh); return () => { window.removeEventListener('wooaeyoung:records-changed', refresh); window.removeEventListener('wooaeyoung:profiles-changed', refresh) } }, [])
  const recordsFor = (profile: SavedProfile) => list.filter(record => record.profileId ? record.profileId === profile.id : record.name === profile.name)
  const removeRecord = (id: string) => { const next = list.filter(record => record.id !== id); if (!persist(KEY, next)) { setImportNotice(storageMessage); return } setList(next); window.dispatchEvent(new CustomEvent('wooaeyoung:records-changed')) }
  const removeProfile = (id: string) => { const next = profiles.filter(profile => profile.id !== id); if (!persist(PROFILE_KEY, next)) { setImportNotice(storageMessage); return } setProfiles(next); window.dispatchEvent(new CustomEvent('wooaeyoung:profiles-changed')) }
  const removeImportedPdf = (id: string) => { const next = loadImportedPdfs().filter(file => file.id !== id); if (!persist(PDF_KEY, next)) { setImportNotice(storageMessage); return } setImportedPdfs(next); setImportNotice(t('올린 PDF를 삭제했어요.', 'Uploaded PDF removed.', 'アップロードしたPDFを削除しました。')); window.dispatchEvent(new CustomEvent('wooaeyoung:files-changed')) }
  const importSavedAnalysis = async (file: File) => {
    try {
      if (!file.size || file.size > 2 * 1024 * 1024) throw new Error('파일은 0바이트보다 크고 2MB 이하여야 해요.')
      if (!/\.(pdf|json)$/i.test(file.name)) throw new Error('PDF 또는 JSON 파일을 선택해 주세요.')
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        if (await file.slice(0, 5).text() !== '%PDF-') throw new Error('올바른 PDF 파일이 아니에요.')
        const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file) })
        const pdf: ImportedPdf = { id: crypto.randomUUID(), profileId: selectedProfile?.id, name: file.name, size: file.size, addedAt: new Date().toISOString(), dataUrl }
        const next = [pdf, ...loadImportedPdfs()]
        localStorage.setItem(PDF_KEY, JSON.stringify(next)); setImportedPdfs(next); window.dispatchEvent(new CustomEvent('wooaeyoung:files-changed'))
        setImportNotice(`“${file.name}” 파일을 기록에 저장했어요.`)
        return
      }
      const parsed: unknown = JSON.parse(await file.text())
      const parsedObject = parsed && typeof parsed === 'object' ? parsed as { records?: unknown } : null
      const candidates: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray(parsedObject?.records) ? parsedObject.records : [parsed]
      const imported = candidates.filter((raw): raw is SavedRecord => {
        if (!raw || typeof raw !== 'object') return false
        const item = raw as Partial<SavedRecord>
        const a = item.analysisSnapshot
        const summaryValid = (value: unknown) => value != null && typeof value === 'object' && !Array.isArray(value) && Object.values(value).every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0)
        return Boolean(a && summaryValid(a.summary) && (!item.summary || summaryValid(item.summary))
          && Array.isArray(a.nutrients) && a.nutrients.length <= 100
          && a.nutrients.every(n => n && ['nutrientId', 'name', 'unit', 'status'].every(k => typeof n[k as keyof typeof n] === 'string') && ['total', 'fromFeed', 'fromSupplements', 'minimum', 'upper', 'caution'].every(k => { const v = n[k as keyof typeof n]; return v === null || typeof v === 'number' && Number.isFinite(v) }))
          && a.ratios && typeof a.ratios === 'object' && Object.values(a.ratios).every(r => r && typeof r.status === 'string' && (r.value === null || typeof r.value === 'number' && Number.isFinite(r.value)))
          && Array.isArray(a.warnings) && a.warnings.every(w => typeof w === 'string')
          && (!item.items || Array.isArray(item.items) && item.items.every(i => typeof i === 'string'))
          && (!item.id || typeof item.id === 'string') && (!item.name || typeof item.name === 'string')
          && (!item.date || typeof item.date === 'string' && Number.isFinite(Date.parse(item.date)))
          && (!item.profileSnapshot || typeof item.profileSnapshot.name === 'string' && item.profileSnapshot.age && typeof item.profileSnapshot.age.value === 'number'))
      }).map(item => ({
        ...item,
        id: item.id || crypto.randomUUID(),
        date: item.date || new Date().toISOString(),
        name: item.name || item.profileSnapshot?.name || '가져온 분석',
        species: item.species || item.profileSnapshot?.species || 'DOG',
        items: Array.isArray(item.items) ? item.items : [],
        summary: item.summary || item.analysisSnapshot!.summary,
      }))
      if (!imported.length) throw new Error('analysis')
      const existing = loadRecords()
      const known = new Set(existing.map(item => item.id))
      const added = imported.filter(item => { if (known.has(item.id)) return false; known.add(item.id); return true })
      const next = [...added, ...existing]
      localStorage.setItem(KEY, JSON.stringify(next)); setList(next); window.dispatchEvent(new CustomEvent('wooaeyoung:records-changed')); setImportNotice(`${added.length}개의 저장 분석을 불러왔어요. 중복 ${imported.length - added.length}개는 제외했어요.`)
    } catch (error) { setImportNotice(error instanceof DOMException && error.name === 'QuotaExceededError' ? '브라우저 저장 공간이 부족해요. 기존 파일을 정리한 뒤 다시 시도해 주세요.' : error instanceof SyntaxError ? 'JSON 형식이 올바르지 않아요.' : error instanceof Error && error.message !== 'analysis' ? error.message : '분석 기록의 필수 정보가 없어요.') }
  }
  const selectedProfile = profiles.find(profile => profile.id === selectedId) ?? profiles[0]
  const selectedRecords = selectedProfile ? recordsFor(selectedProfile) : []
  const selectedPdfs = importedPdfs.filter(file => file.profileId === selectedProfile?.id)
  useEffect(() => { if (selectedProfile && selectedProfile.id !== selectedId) setSelectedId(selectedProfile.id) }, [selectedId, selectedProfile])
  useEffect(() => {
    let timers: number[] = []
    let original: { selectedId: string; activeTab: RecordTab } | null = null
    const clearDemoMarkers = () => {
      document.querySelectorAll<HTMLElement>('.tour-demo-focus').forEach(element => element.classList.remove('tour-demo-focus'))
      document.querySelectorAll<HTMLDetailsElement>('details[data-tour-opened="true"]').forEach(element => { element.open = false; delete element.dataset.tourOpened })
    }
    const revealDeleteMenu = (selector: string) => {
      const details = document.querySelector<HTMLDetailsElement>(selector)
      if (!details) return
      if (!details.open) { details.open = true; details.dataset.tourOpened = 'true' }
      details.querySelector<HTMLElement>('.danger')?.classList.add('tour-demo-focus')
    }
    const cancel = () => {
      timers.forEach(window.clearTimeout)
      timers = []
      clearDemoMarkers()
      if (original) {
        setSelectedId(original.selectedId)
        setActiveTab(original.activeTab)
        original = null
      }
    }
    const demo = () => {
      cancel()
      const current = demoState.current
      original = { selectedId: current.selectedId, activeTab: current.activeTab }
      const runCycle = (): void => {
        clearDemoMarkers()
        setActiveTab('today')
        timers.push(window.setTimeout(() => setActiveTab('analysis'), 1_500))
        timers.push(window.setTimeout(() => document.querySelector<HTMLElement>('.records-section-head .btn.ghost')?.classList.add('tour-demo-focus'), 2_100))
        timers.push(window.setTimeout(() => revealDeleteMenu('.record-more'), 2_700))
        timers.push(window.setTimeout(() => setActiveTab('trend'), 3_800))
        timers.push(window.setTimeout(() => {
            const latest = demoState.current
            if (latest.profiles.length > 1) setSelectedId(latest.profiles.find(profile => profile.id !== latest.selectedId)?.id ?? latest.selectedId)
            setActiveTab('today')
          }, 5_200))
        timers.push(window.setTimeout(() => revealDeleteMenu('.profile-management'), 6_000))
        timers.push(window.setTimeout(runCycle, 7_500))
      }
      runCycle()
    }
    const pauseDemo = () => {
      original = null
      cancel()
    }
    window.addEventListener('wooaeyoung:pause-tour-demos', pauseDemo)
    window.addEventListener('wooaeyoung:demo-records', demo)
    window.addEventListener('wooaeyoung:cancel-records-demo', cancel)
    return () => { cancel(); window.removeEventListener('wooaeyoung:pause-tour-demos', pauseDemo); window.removeEventListener('wooaeyoung:demo-records', demo); window.removeEventListener('wooaeyoung:cancel-records-demo', cancel) }
  }, [])
  return <section className={`records-page ${embedded ? 'embedded' : ''}`}>
    {embedded && <div className="panel-title"><span>STEP 5</span><div><h3>{t('반려동물 기록', 'Pet records', 'ペットの記録')}</h3><p>{t('분석을 저장하면 이곳에서 이어서 확인할 수 있어요.', 'Save an analysis to review it here later.', '分析を保存すると、ここで後から確認できます。')}</p></div></div>}
    {!embedded && <><span className="records-kicker">PET HEALTH WORKSPACE</span><h2>{t('반려동물 기록', 'Pet records', 'ペットの記録')}</h2><p className="lead">{t('한 아이씩 선택해 오늘 관리와 영양 분석 기록을 확인하세요.', 'Select a pet to review daily care and nutrition records.', 'ペットを選んで、今日のケアや栄養分析の記録を確認しましょう。')}</p></>}
    {profiles.length === 0 ? <div className="panel records-empty"><h3>{t('아직 저장된 프로필이 없어요.', 'No saved profiles yet.', '保存されたプロフィールはありません。')}</h3><p>{t('영양제 분석에서 반려동물 정보를 먼저 저장해 주세요.', 'Save your pet’s information in Nutrition analysis first.', 'まず栄養分析でペット情報を保存してください。')}</p></div> : <div className="records-workspace">
      <aside className="records-sidebar" aria-label={t('반려동물 선택', 'Select a pet', 'ペットを選択')}><span>MY PETS</span><h3>{t('반려동물', 'My pets', 'ペット')}</h3><div className="records-pet-list">{profiles.map(profile => { const count = recordsFor(profile).length; const selected = profile.id === selectedProfile?.id; return <button key={profile.id} type="button" className={`records-pet-button ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={() => { setSelectedId(profile.id); setActiveTab('today'); setImportNotice('') }}><i>{profile.species === 'DOG' ? '🐶' : '🐱'}</i><span><b>{profile.name}</b><small>{profile.weightKg}kg · {profile.age.value}{profile.age.unit === 'MONTH' ? t('개월', ' months', 'か月') : t('주', ' weeks', '週')}</small></span><em>{count}</em></button> })}</div></aside>
      {selectedProfile && <main className="records-work-main"><header className="records-work-head"><div><span>{selectedProfile.name.toUpperCase()}’S RECORD</span><h3>{t(`${selectedProfile.name}의 건강 기록`, `${selectedProfile.name}’s health records`, `${selectedProfile.name}の健康記録`)}</h3><p>{selectedProfile.species === 'DOG' ? t('강아지', 'Dog', '犬') : t('고양이', 'Cat', '猫')} · {selectedProfile.weightKg}kg · {selectedRecords.length + selectedPdfs.length} {t('건 저장된 기록', 'saved records', '件の保存記録')}</p><p className="pet-health-oneline"><b>{t('건강 한줄 요약', 'Health summary', '健康の一言まとめ')}</b>{healthOneLine(selectedProfile, selectedRecords, language)}</p></div><div className="records-head-actions">{(selectedRecords.length + selectedPdfs.length) > 0 && <div className="achievement-badge records-achievement" role="status"><b>★</b><span><strong>{t('참 잘했어요 · 기록 ', 'Great job · Records ', 'よくできました · 記録 ')}{selectedRecords.length + selectedPdfs.length}{t('회', '', '件')}</strong><small>{new Date(selectedRecords[0]?.date || selectedPdfs[0]?.addedAt || Date.now()).toLocaleDateString(dateLocale(language))} {t('획득', 'earned', '獲得')}</small></span></div>}<button className="btn" onClick={() => selectProfile(selectedProfile.id)}>{t('새 분석', 'New analysis', '新しい分析')}</button></div></header>
        <nav className="records-tabs" aria-label={t('기록 종류', 'Record types', '記録の種類')}>{([['today', t('오늘 관리', 'Today', '今日の管理')], ['analysis', `${t('영양 기록', 'Nutrition records', '栄養記録')} ${selectedRecords.length + selectedPdfs.length || ''}`], ['trend', t('건강 변화', 'Health trends', '健康の推移')], ['reminder', t('알림 설정', 'Reminders', '通知設定')]] as [RecordTab, string][]).map(([id, label]) => <button key={id} className={activeTab === id ? 'active' : ''} aria-current={activeTab === id ? 'page' : undefined} onClick={() => setActiveTab(id)}>{label}</button>)}</nav>
        <div className="records-tab-panel">
          {activeTab === 'analysis' && <section className="records-analysis-list"><div className="records-section-head"><div><span>ANALYSIS REPORTS</span><h4>{t('저장된 영양 분석', 'Saved nutrition analyses', '保存した栄養分析')}</h4></div><div><input ref={importInput} type="file" accept=".json,.pdf,application/json,application/pdf" hidden onChange={event => { const file = event.target.files?.[0]; if (file) void importSavedAnalysis(file); event.currentTarget.value = '' }} /><button className="btn ghost" onClick={() => importInput.current?.click()}>{t('JSON/PDF 파일 불러오기', 'Import JSON/PDF', 'JSON/PDFを読み込む')}</button></div></div>{importNotice && <p className="care-notice">{importNotice}</p>}{selectedPdfs.length > 0 && <div className="imported-files"><b>{t('올린 파일', 'Uploaded files', 'アップロードしたファイル')}</b>{selectedPdfs.map(file => <div className="imported-file" key={file.id}><span>PDF</span><div><strong>{file.name}</strong><small>{new Date(file.addedAt).toLocaleString(dateLocale(language))} · {(file.size / 1024).toFixed(0)}KB</small></div>{file.dataUrl && <button className="btn ghost" onClick={() => openPdfPreview(file.dataUrl!)}>{t('PDF 미리보기', 'Preview PDF', 'PDFをプレビュー')}</button>}<button className="btn danger imported-file-delete" onClick={() => removeImportedPdf(file.id)}>{t('삭제', 'Delete', '削除')}</button></div>)}</div>}{selectedRecords.length === 0 ? <p className="empty-record">{t('아직 저장된 분석 기록이 없어요. 첫 분석을 시작해 보세요.', 'No saved analysis records yet. Start your first analysis.', '保存された分析記録はありません。最初の分析を始めましょう。')}</p> : selectedRecords.map(record => <article className="record-card" key={record.id}><div><b>{new Date(record.date).toLocaleString(dateLocale(language))}</b><span>{t('부족', 'Low', '不足')} {record.summary.deficient ?? 0} · {t('적정', 'Adequate', '適正')} {record.summary.adequate ?? 0} · {t('주의', 'Caution', '注意')} {record.summary.caution ?? 0} · {t('과다', 'High', '過剰')} {record.summary.excess ?? 0}</span><small className="record-oneline">{record.oneLineInsight ?? (record.analysisSnapshot ? nutritionOneLine(record.analysisSnapshot) : t('분석 상세 데이터가 없어 한줄 요약을 만들 수 없습니다.', 'A summary is unavailable because analysis details were not saved.', '分析の詳細データがないため、一言まとめを作成できません。'))}</small><small>{record.items.join(', ')}</small>{record.standardVersion && <small>{t('기준', 'Standard', '基準')} {record.standardVersion}</small>}</div><div className="record-actions"><button className="btn report-open" onClick={() => setOpenReport(record)}>{t('리포트 보기', 'View report', 'レポートを見る')}</button><details className="record-more"><summary aria-label={t('기록 더보기', 'More record options', '記録のその他の操作')}>•••</summary><button className="btn danger" onClick={() => removeRecord(record.id)}>{t('기록 삭제', 'Delete record', '記録を削除')}</button></details></div></article>)}</section>}
          {activeTab !== 'analysis' && <ProfileTools key={selectedProfile.id} profile={selectedProfile} records={selectedRecords} view={activeTab} language={language} />}
        </div>
        <details className="profile-management"><summary>{t('프로필 관리', 'Manage profile', 'プロフィール管理')}</summary><button className="btn danger" onClick={() => removeProfile(selectedProfile.id)}>{t('이 프로필 삭제', 'Delete this profile', 'このプロフィールを削除')}</button></details>
      </main>}
    </div>}
    {openReport && <NutritionReport record={openReport} onClose={() => setOpenReport(null)} language={language} />}
  </section>
}
