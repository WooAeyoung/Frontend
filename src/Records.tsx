import { useState } from 'react'
import type { Profile } from './api'

export type SavedRecord = { id: string; profileId?: string; date: string; name: string; species: string; items: string[]; summary: Record<string, number> }
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

export default function Records({ selectProfile }: { go: (p: 'analysis') => void; selectProfile: (id: string) => void }) {
  const [list, setList] = useState(loadRecords)
  const [profiles, setProfiles] = useState(loadProfiles)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const removeRecord = (id: string) => {
    const next = list.filter(record => record.id !== id)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* 저장 불가 환경 */ }
    setList(next)
  }
  const removeProfile = (id: string) => {
    const next = profiles.filter(profile => profile.id !== id)
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)) } catch { /* 저장 불가 환경 */ }
    setProfiles(next)
    if (selectedProfileId === id) setSelectedProfileId(null)
  }
  const selectedProfile = profiles.find(profile => profile.id === selectedProfileId)
  const selectedRecords = selectedProfile ? list.filter(record => record.profileId ? record.profileId === selectedProfile.id : record.name === selectedProfile.name) : []
  return (
    <div className="w page">
      <h2>반려동물 기록</h2><p className="lead">저장한 프로필과 분석 기록이 이 기기의 브라우저에만 보관됩니다.</p>
      <div className="panel records-profile-panel"><h3>저장된 반려동물 프로필</h3><p className="note">프로필을 누르면 해당 반려동물의 분석 기록이 열립니다.</p>
        {profiles.length === 0 ? <p className="note">저장된 프로필이 없습니다. 영양제 분석에서 먼저 프로필을 저장해 주세요.</p> : <div className="profile-card-grid">{profiles.map(profile => { const count = list.filter(record => record.profileId ? record.profileId === profile.id : record.name === profile.name).length; return <article key={profile.id} className={`saved-profile-card ${selectedProfileId === profile.id ? 'selected' : ''}`}><button className="profile-card-main" onClick={() => setSelectedProfileId(selectedProfileId === profile.id ? null : profile.id)} aria-expanded={selectedProfileId === profile.id}><span className="profile-avatar">{profile.species === 'DOG' ? '🐶' : '🐱'}</span><span><b>{profile.name}</b><small>{profile.species === 'DOG' ? '강아지' : '고양이'} · {profile.weightKg}kg · {profile.age.value}{profile.age.unit === 'MONTH' ? '개월' : '주'}</small><em>저장된 분석 {count}건</em></span><strong>{selectedProfileId === profile.id ? '접기' : '기록 보기'}</strong></button><div className="profile-card-actions"><button className="btn ghost" onClick={() => selectProfile(profile.id)}>이 프로필로 분석</button><button className="btn danger" onClick={() => removeProfile(profile.id)}>삭제</button></div></article> })}</div>}
        {selectedProfile && <div className="profile-records"><div className="record-title"><h3>{selectedProfile.name}의 분석 기록</h3><button className="btn ghost" onClick={() => selectProfile(selectedProfile.id)}>새 분석 시작</button></div>{selectedRecords.length === 0 ? <p className="empty-record">아직 저장된 분석 기록이 없어요. 이 프로필로 첫 분석을 시작해 보세요.</p> : selectedRecords.map(record => <article className="record-card" key={record.id}><div><b>{new Date(record.date).toLocaleString('ko-KR')}</b><span>부족 {record.summary.deficient ?? 0} · 적정 {record.summary.adequate ?? 0} · 주의 {record.summary.caution ?? 0} · 과다 {record.summary.excess ?? 0}</span><small>{record.items.join(', ')}</small></div><button className="btn danger" onClick={() => removeRecord(record.id)}>삭제</button></article>)}</div>}
      </div>
    </div>
  )
}
