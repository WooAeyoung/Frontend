import { useEffect, useMemo, useRef, useState } from 'react'
import type { Analysis, Profile } from './api'
import NutritionReport from './NutritionReport'

export type SavedRecord = { id: string; profileId?: string; date: string; name: string; species: string; items: string[]; summary: Record<string, number>; standardVersion?: string; standardSource?: string; analysisSnapshot?: Analysis; profileSnapshot?: Profile }
export type SavedProfile = Profile & { id: string; savedAt: string }
type DailyLog = { id: string; profileId: string; date: string; feedingDone: boolean; appetite: '좋음' | '보통' | '낮음'; stool: '정상' | '묽음' | '단단함' | '기록 안 함'; vitality: '좋음' | '보통' | '낮음'; weightKg?: number }
type Reminder = { profileId: string; time: string; enabled: boolean }
const KEY = 'wooaeyoung.records'
const PROFILE_KEY = 'wooaeyoung.profiles'
const DAILY_KEY = 'wooaeyoung.daily-logs'
const REMINDER_KEY = 'wooaeyoung.feeding-reminders'
const read = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) ?? '') as T } catch { return fallback } }
export const loadRecords = (): SavedRecord[] => read<SavedRecord[]>(KEY, [])
export const loadProfiles = (): SavedProfile[] => read<SavedProfile[]>(PROFILE_KEY, [])
export function saveRecord(record: SavedRecord) { localStorage.setItem(KEY, JSON.stringify([record, ...loadRecords()])); window.dispatchEvent(new CustomEvent('wooaeyoung:records-changed')) }
export function saveProfile(profile: Profile, id: string = crypto.randomUUID()): SavedProfile { const next: SavedProfile = { ...profile, id, savedAt: new Date().toISOString() }; const profiles = loadProfiles(); const index = profiles.findIndex(item => item.id === id); localStorage.setItem(PROFILE_KEY, JSON.stringify(index >= 0 ? profiles.map(item => item.id === id ? next : item) : [next, ...profiles])); window.dispatchEvent(new CustomEvent('wooaeyoung:profiles-changed')); return next }
const today = () => new Date().toISOString().slice(0, 10)
const loadDaily = (): DailyLog[] => read<DailyLog[]>(DAILY_KEY, [])
const loadReminders = (): Reminder[] => read<Reminder[]>(REMINDER_KEY, [])

type RecordTab = 'today' | 'analysis' | 'trend' | 'reminder'

function ProfileTools({ profile, records: _records, view }: { profile: SavedProfile; records: SavedRecord[]; view: Exclude<RecordTab, 'analysis'> }) {
  const [daily, setDaily] = useState<DailyLog[]>(loadDaily)
  const [reminders, setReminders] = useState<Reminder[]>(loadReminders)
  const existing = daily.find(item => item.profileId === profile.id && item.date === today())
  const [form, setForm] = useState<Omit<DailyLog, 'id' | 'profileId' | 'date'>>({ feedingDone: existing?.feedingDone ?? false, appetite: existing?.appetite ?? '보통', stool: existing?.stool ?? '기록 안 함', vitality: existing?.vitality ?? '보통', weightKg: existing?.weightKg })
  const reminder = reminders.find(item => item.profileId === profile.id) ?? { profileId: profile.id, time: '08:00', enabled: false }
  const [reminderTime, setReminderTime] = useState(reminder.time)
  const [notice, setNotice] = useState('')
  const fired = useRef('')
  useEffect(() => { const latest = daily.find(item => item.profileId === profile.id && item.date === today()); setForm({ feedingDone: latest?.feedingDone ?? false, appetite: latest?.appetite ?? '보통', stool: latest?.stool ?? '기록 안 함', vitality: latest?.vitality ?? '보통', weightKg: latest?.weightKg }) }, [profile.id, daily])
  useEffect(() => { const timer = window.setInterval(() => { const active = reminders.find(item => item.profileId === profile.id && item.enabled); const now = new Date(); const hhmm = now.toTimeString().slice(0, 5); const key = `${profile.id}-${today()}-${hhmm}`; if (!active || active.time !== hhmm || fired.current === key) return; fired.current = key; if ('Notification' in window && Notification.permission === 'granted') new Notification(`${profile.name}의 급여 시간`, { body: '사료·영양제 급여 여부를 확인해 주세요.' }); else setNotice(`${profile.name}의 급여 시간이에요. 오늘의 급여를 체크해 주세요.`) }, 20_000); return () => window.clearInterval(timer) }, [profile.id, profile.name, reminders])
  const saveDaily = () => { const item: DailyLog = { id: existing?.id ?? crypto.randomUUID(), profileId: profile.id, date: today(), ...form }; const next = existing ? daily.map(log => log.id === item.id ? item : log) : [item, ...daily]; localStorage.setItem(DAILY_KEY, JSON.stringify(next)); setDaily(next); setNotice('오늘의 기록을 저장했어요.') }
  const saveReminder = async () => { let enabled = true; if ('Notification' in window && Notification.permission !== 'granted') enabled = (await Notification.requestPermission()) === 'granted'; const nextReminder = { profileId: profile.id, time: reminderTime, enabled }; const next = reminders.filter(item => item.profileId !== profile.id).concat(nextReminder); localStorage.setItem(REMINDER_KEY, JSON.stringify(next)); setReminders(next); setNotice(enabled ? '급여 알림 시간을 저장했어요. 이 탭을 열어 둔 동안 알려드려요.' : '알림 권한이 허용되지 않아 시간만 저장했어요.') }
  const dailyChart = useMemo(() => daily.filter(item => item.profileId === profile.id).sort((a, b) => a.date.localeCompare(b.date)).slice(-7), [daily, profile.id])
  const conditionScore = (item: DailyLog) => (item.feedingDone ? 2 : 0) + ({ 좋음: 2, 보통: 1, 낮음: 0 }[item.appetite]) + ({ 좋음: 2, 보통: 1, 낮음: 0 }[item.vitality]) + ({ 정상: 2, '기록 안 함': 1, 묽음: 0, 단단함: 0 }[item.stool])
  const pointList = dailyChart.map((item, index) => { const x = dailyChart.length === 1 ? 150 : 16 + (index * 268) / (dailyChart.length - 1); const y = 92 - (conditionScore(item) / 8) * 70; return [x, y] as const })
  return <div className="care-tools compact" aria-live="polite">
    {view === 'today' && <section className="panel daily-log-panel workspace-panel"><p className="eyebrow">TODAY · {today()}</p><h4>오늘의 컨디션</h4><p className="workspace-panel-copy">자주 확인하는 항목만 한 화면에서 빠르게 기록하세요.</p><label className="feeding-check"><input type="checkbox" checked={form.feedingDone} onChange={event => setForm(current => ({ ...current, feedingDone: event.target.checked }))} /> 오늘 사료·영양제 급여 완료</label><div className="daily-fields"><label>식욕<select value={form.appetite} onChange={event => setForm(current => ({ ...current, appetite: event.target.value as DailyLog['appetite'] }))}><option>좋음</option><option>보통</option><option>낮음</option></select></label><label>변 상태<select value={form.stool} onChange={event => setForm(current => ({ ...current, stool: event.target.value as DailyLog['stool'] }))}><option>기록 안 함</option><option>정상</option><option>묽음</option><option>단단함</option></select></label><label>활력<select value={form.vitality} onChange={event => setForm(current => ({ ...current, vitality: event.target.value as DailyLog['vitality'] }))}><option>좋음</option><option>보통</option><option>낮음</option></select></label><label>오늘 체중 (kg)<input type="number" min="0" step="0.1" value={form.weightKg ?? ''} onChange={event => setForm(current => ({ ...current, weightKg: event.target.value ? Number(event.target.value) : undefined }))} /></label></div><button className="btn" onClick={saveDaily}>오늘 기록 저장</button></section>}
    {view === 'trend' && <section className="panel comparison-panel workspace-panel"><p className="eyebrow">DAILY HEALTH TREND</p><h4>오늘 기록 변화</h4><p className="workspace-panel-copy">최근 7일의 급여 완료, 식욕, 활력, 변 상태와 체중 기록을 비교합니다.</p>{dailyChart.length < 2 ? <p className="note">오늘 기록을 2일 이상 저장하면 날짜별 컨디션 변화가 표시됩니다. 현재 {dailyChart.length}일 기록되어 있어요.</p> : <><div className="comparison-chart"><svg viewBox="0 0 300 112" role="img" aria-label="날짜별 오늘 기록 컨디션 변화 그래프"><line x1="16" y1="92" x2="284" y2="92" /><polyline points={pointList.map(point => point.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{pointList.map(([x, y], index) => <circle key={dailyChart[index].id} cx={x} cy={y} r="4" />)}</svg></div><div className="chart-labels daily-trend-labels">{dailyChart.map(item => <span key={item.id}>{new Date(`${item.date}T00:00:00`).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}<b>컨디션 {conditionScore(item)}/8</b><small>{item.appetite} 식욕 · {item.vitality} 활력{item.weightKg ? ` · ${item.weightKg}kg` : ''}</small></span>)}</div></>}</section>}
    {view === 'reminder' && <section className="panel reminder-panel workspace-panel"><p className="eyebrow">FEEDING REMINDER</p><h4>사료·영양제 시간 알림</h4><p className="workspace-panel-copy">브라우저 탭을 열어 둔 동안 설정한 시간에 알려드려요.</p><label>알림 시간<input type="time" value={reminderTime} onChange={event => setReminderTime(event.target.value)} /></label><button className="btn" onClick={saveReminder}>알림 저장</button></section>}
    {notice && <p className="care-notice">{notice}</p>}
  </div>
}

export default function Records({ selectProfile, embedded }: { go: (p: 'analysis') => void; selectProfile: (id: string) => void; embedded?: boolean }) {
  const [list, setList] = useState<SavedRecord[]>(loadRecords)
  const [profiles, setProfiles] = useState<SavedProfile[]>(loadProfiles)
  const [openReport, setOpenReport] = useState<SavedRecord | null>(null)
  const [selectedId, setSelectedId] = useState(() => loadProfiles()[0]?.id ?? '')
  const [activeTab, setActiveTab] = useState<RecordTab>('today')
  useEffect(() => { const refresh = () => { setList(loadRecords()); setProfiles(loadProfiles()) }; window.addEventListener('wooaeyoung:records-changed', refresh); window.addEventListener('wooaeyoung:profiles-changed', refresh); return () => { window.removeEventListener('wooaeyoung:records-changed', refresh); window.removeEventListener('wooaeyoung:profiles-changed', refresh) } }, [])
  const recordsFor = (profile: SavedProfile) => list.filter(record => record.profileId ? record.profileId === profile.id : record.name === profile.name)
  const removeRecord = (id: string) => { const next = list.filter(record => record.id !== id); localStorage.setItem(KEY, JSON.stringify(next)); setList(next) }
  const removeProfile = (id: string) => { const next = profiles.filter(profile => profile.id !== id); localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); setProfiles(next) }
  const selectedProfile = profiles.find(profile => profile.id === selectedId) ?? profiles[0]
  const selectedRecords = selectedProfile ? recordsFor(selectedProfile) : []
  useEffect(() => { if (selectedProfile && selectedProfile.id !== selectedId) setSelectedId(selectedProfile.id) }, [selectedId, selectedProfile])
  return <section className={`records-page ${embedded ? 'embedded' : ''}`}>
    {embedded && <div className="panel-title"><span>STEP 5</span><div><h3>반려동물 기록</h3><p>분석을 저장하면 이곳에서 이어서 확인할 수 있어요.</p></div></div>}
    {!embedded && <><span className="records-kicker">PET HEALTH WORKSPACE</span><h2>반려동물 기록</h2><p className="lead">한 아이씩 선택해 오늘 관리와 영양 분석 기록을 확인하세요.</p></>}
    {profiles.length === 0 ? <div className="panel records-empty"><h3>아직 저장된 프로필이 없어요.</h3><p>영양제 분석에서 반려동물 정보를 먼저 저장해 주세요.</p></div> : <div className="records-workspace">
      <aside className="records-sidebar" aria-label="반려동물 선택"><span>MY PETS</span><h3>반려동물</h3><div className="records-pet-list">{profiles.map(profile => { const count = recordsFor(profile).length; const selected = profile.id === selectedProfile?.id; return <button key={profile.id} type="button" className={`records-pet-button ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={() => { setSelectedId(profile.id); setActiveTab('today') }}><i>{profile.species === 'DOG' ? '🐶' : '🐱'}</i><span><b>{profile.name}</b><small>{profile.weightKg}kg · {profile.age.value}{profile.age.unit === 'MONTH' ? '개월' : '주'}</small></span><em>{count}</em></button> })}</div></aside>
      {selectedProfile && <main className="records-work-main"><header className="records-work-head"><div><span>{selectedProfile.name.toUpperCase()}’S RECORD</span><h3>{selectedProfile.name}의 건강 기록</h3><p>{selectedProfile.species === 'DOG' ? '강아지' : '고양이'} · {selectedProfile.weightKg}kg · 저장된 분석 {selectedRecords.length}건</p></div><button className="btn" onClick={() => selectProfile(selectedProfile.id)}>새 분석</button></header>
        <nav className="records-tabs" aria-label="기록 종류">{([['today', '오늘 관리'], ['analysis', `영양 분석 ${selectedRecords.length || ''}`], ['trend', '건강 변화'], ['reminder', '알림 설정']] as [RecordTab, string][]).map(([id, label]) => <button key={id} className={activeTab === id ? 'active' : ''} aria-current={activeTab === id ? 'page' : undefined} onClick={() => setActiveTab(id)}>{label}</button>)}</nav>
        <div className="records-tab-panel">
          {activeTab === 'analysis' && <section className="records-analysis-list"><div className="records-section-head"><div><span>ANALYSIS REPORTS</span><h4>저장된 영양 분석</h4></div></div>{selectedRecords.length === 0 ? <p className="empty-record">아직 저장된 분석 기록이 없어요. 첫 분석을 시작해 보세요.</p> : selectedRecords.map(record => <article className="record-card" key={record.id}><div><b>{new Date(record.date).toLocaleString('ko-KR')}</b><span>부족 {record.summary.deficient ?? 0} · 적정 {record.summary.adequate ?? 0} · 주의 {record.summary.caution ?? 0} · 과다 {record.summary.excess ?? 0}</span><small>{record.items.join(', ')}</small>{record.standardVersion && <small>기준 {record.standardVersion}</small>}</div><div className="record-actions"><button className="btn report-open" onClick={() => setOpenReport(record)}>리포트 보기</button><details className="record-more"><summary aria-label="기록 더보기">•••</summary><button className="btn danger" onClick={() => removeRecord(record.id)}>기록 삭제</button></details></div></article>)}</section>}
          {activeTab !== 'analysis' && <ProfileTools key={selectedProfile.id} profile={selectedProfile} records={selectedRecords} view={activeTab} />}
        </div>
        <details className="profile-management"><summary>프로필 관리</summary><button className="btn danger" onClick={() => removeProfile(selectedProfile.id)}>이 프로필 삭제</button></details>
      </main>}
    </div>}
    {openReport && <NutritionReport record={openReport} onClose={() => setOpenReport(null)} />}
  </section>
}
