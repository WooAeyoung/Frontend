import { useEffect, useState } from 'react'

export type Page = 'home' | 'analysis' | 'records'

export default function Home({ go }: { go: (p: Page) => void }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setN(v => (v + 1) % 2), 5000)
    return () => clearInterval(t)
  }, [])
  return (
    <>
      <div className="hero">
        <div className={`slide s1${n === 0 ? ' on' : ''}`}><div className="w"><h1>반려동물 건강 기록,<br />매일매일 쉽게</h1><p>프로필 등록부터 하루 기록까지, 체계적으로 관리하세요.</p><span className="deco">🛋️🪴</span></div></div>
        <div className={`slide s2${n === 1 ? ' on' : ''}`}><div className="w"><h1>먹이는 영양제,<br />성분까지 한눈에</h1><p>여러 영양제를 함께 급여해도 성분 중복과 부족을 확인해요.</p><span className="deco">🐕🐈</span></div></div>
        <div className="dots">{[0, 1].map(i => <button key={i} aria-label={`슬라이드 ${i + 1}`} className={n === i ? 'on' : ''} onClick={() => setN(i)} />)}</div>
      </div>

      <section className="sec"><div className="w">
        <h2>영양제 성분 분석</h2><p className="lead">개와 고양이 영양제의 핵심 성분을 항목별로 비교·확인하세요.</p>
        <div className="cards">
          <div className="card"><div className="img" style={{ background: '#dfe2e3' }}><svg width="110" height="50" viewBox="0 0 110 50"><rect x="5" y="8" width="100" height="34" rx="17" fill="#4d8f4a" /><rect x="55" y="8" width="50" height="34" rx="17" fill="#8a7a3a" /></svg></div><h3>비타민 분석</h3><p>비타민 A, B군, C, D, E 등 필수 비타민 함유 여부를 확인하고 권장 섭취량과 비교합니다.</p></div>
          <div className="card"><div className="img" style={{ background: '#d6d9dd' }}><svg width="110" height="60" viewBox="0 0 110 60"><ellipse cx="55" cy="30" rx="42" ry="20" fill="#f4f4f2" /><ellipse cx="55" cy="26" rx="38" ry="15" fill="#fff" /></svg></div><h3>칼슘 분석</h3><p>칼슘, 인, 마그네슘 등 뼈와 관절 건강에 필수적인 미네랄 성분을 분석합니다.</p></div>
          <div className="card"><div className="img" style={{ background: '#dcdfe0' }}><svg width="120" height="70" viewBox="0 0 120 70"><ellipse cx="60" cy="38" rx="48" ry="24" fill="#d99a2b" /><ellipse cx="60" cy="32" rx="42" ry="18" fill="#f0b94c" /><ellipse cx="66" cy="34" rx="14" ry="9" fill="#f7d488" /></svg></div><h3>기타 성분</h3><p>오메가 지방산, 아연 등 추가 영양 성분도 함께 확인합니다.</p></div>
        </div>
        <button className="btn" onClick={() => go('analysis')}>영양제 분석 시작하기</button>
      </div></section>

      <section className="sec alt"><div className="w">
        <h2>이렇게 활용하세요</h2><p className="lead">우애영의 3단계 영양 관리 프로세스</p>
        <div className="steps">
          <div><b>01</b><h3>반려동물 프로필 등록</h3><p>이름, 나이, 품종, 체중 등 기본 정보를 입력하면 맞춤 분석이 시작됩니다.</p></div>
          <div><b>02</b><h3>영양제 성분 입력</h3><p>급여 중인 영양제를 고르면 비타민, 칼슘 등 항목별로 분석합니다.</p></div>
          <div><b>03</b><h3>총량 확인 및 기록</h3><p>하루 섭취 총량을 확인하고, 매일의 급여 기록을 체계적으로 관리하세요.</p></div>
        </div>
      </div></section>

      <section className="sec"><div className="w trust">
        <div className="pic">👩‍💻🐶</div>
        <div><h2>전문적이고 신뢰할 수 있는 분석</h2>
          <p>우애영은 반려동물 영양학 데이터를 기반으로 영양제 성분을 정밀하게 분석합니다. 개와 고양이 각각의 권장 섭취량에 맞춰 비타민, 칼슘, 미네랄 등의 과부족을 한눈에 파악할 수 있습니다.</p>
          <p>여러 영양제를 동시에 급여할 때 성분이 중복되거나 부족한 부분을 자동으로 계산하여 총량을 확인할 수 있어, 보다 안전하고 효율적인 영양 관리가 가능합니다.</p>
          <button className="btn" onClick={() => go('records')}>반려동물 기록 시작</button></div>
      </div></section>
    </>
  )
}
