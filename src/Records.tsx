import { useState } from 'react'

export type SavedRecord = { id: string; date: string; name: string; species: string; items: string[]; summary: Record<string, number> }
const KEY = 'wooaeyoung.records'

export function loadRecords(): SavedRecord[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}
export function saveRecord(r: SavedRecord) {
  try { localStorage.setItem(KEY, JSON.stringify([r, ...loadRecords()])) } catch { /* 저장 불가 환경 */ }
}

export default function Records({ go }: { go: (p: 'analysis') => void }) {
  const [list, setList] = useState(loadRecords)
  const clear = () => { try { localStorage.removeItem(KEY) } catch { /* noop */ } setList([]) }
  return (
    <div className="w page">
      <h2>반려동물 기록</h2><p className="lead">분석 후 저장한 급여 기록이 날짜순으로 쌓입니다. 이 기기의 브라우저에만 저장돼요.</p>
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
