import { useState } from 'react'
import type { Profile } from './api'

export type SavedRecord = { id: string; date: string; name: string; species: string; items: string[]; summary: Record<string, number> }
const KEY = 'wooaeyoung.records'
const PROFILE_KEY = 'wooaeyoung.profiles'
export type SavedProfile = Profile & { id: string; savedAt: string }

export function loadRecords(): SavedRecord[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}
export function saveRecord(r: SavedRecord) {
  try { localStorage.setItem(KEY, JSON.stringify([r, ...loadRecords()])) } catch { /* 저장 불가 환경 */ }
}
export function loadProfiles(): SavedProfile[] {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '[]') } catch { return [] }
}
export function saveProfile(profile: Profile, id?: string): SavedProfile {
  const next: SavedProfile = { ...profile, id: id ?? crypto.randomUUID(), savedAt: new Date().toISOString() }
  try {
    const profiles = loadProfiles()
    const updated = id ? profiles.map(item => item.id === id ? next : item) : [next, ...profiles]
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated))
  } catch { /* 저장 불가 환경 */ }
  return next
}

export default function Records({ go }: { go: (p: 'analysis') => void }) {
  const [list, setList] = useState(loadRecords)
  const [profiles, setProfiles] = useState(loadProfiles)
  const clear = () => { try { localStorage.removeItem(KEY) } catch { /* noop */ } setList([]) }
  return (
    <div className="w page">
      <h2>반려동물 기록</h2><p className="lead">저장한 프로필과 분석 기록이 이 기기의 브라우저에만 보관됩니다.</p>
      <div className="panel"><h3>저장된 반려동물 프로필</h3>
        {profiles.length === 0 ? <p className="note">저장된 프로필이 없습니다. 영양제 분석에서 먼저 프로필을 저장해 주세요.</p> : <ul className="plist">{profiles.map(profile => <li key={profile.id}><span><b>{profile.name}</b> <small>{profile.species === 'DOG' ? '강아지' : '고양이'} · {profile.weightKg}kg · {profile.age.value}{profile.age.unit === 'MONTH' ? '개월' : '주'}</small></span><button className="btn ghost" onClick={() => go('analysis')}>분석 화면으로</button></li>)}</ul>}
      </div>
      {list.length === 0 ? (
        <div className="panel">아직 저장된 기록이 없습니다. <button className="btn" onClick={() => go('analysis')}>영양제 분석하러 가기</button></div>
      ) : (
        <>
          {list.map(r => (
            <div className="panel" key={r.id}>
              <h3>{r.name} <small className="note">{r.species === 'DOG' ? '강아지' : '고양이'} · {new Date(r.date).toLocaleString('ko-KR')}</small></h3>
              <div className="note">급여: {r.items.join(', ')}</div>
              <div className="note">부족 {r.summary.deficient ?? 0} · 적정 {r.summary.adequate ?? 0} · 주의 {r.summary.caution ?? 0} · 과다 {r.summary.excess ?? 0}</div>
            </div>
          ))}
          <button className="btn ghost" onClick={clear}>기록 모두 삭제</button>
        </>
      )}
    </div>
  )
}
