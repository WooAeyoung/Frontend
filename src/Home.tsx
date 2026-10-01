import { useState } from 'react'

export type Page = 'home' | 'analysis' | 'records'

export default function Home({ go }: { go: (p: Page) => void }) {
  const [focus, setFocus] = useState<'food' | 'data' | 'safe'>('food')
  const info = {
    food: ['오늘의 급여', '실제 시판 사료와 영양제를 하루 급여량으로 모아요.'],
    data: ['영양 신호', '칼슘·인·비타민의 부족과 과다를 한눈에 비교해요.'],
    safe: ['조합 확인', '함께 먹일 때 주의가 필요한 성분을 다시 계산해요.'],
  }[focus]
  return (
    <>
      <section className="welcome-intro"><div className="w"><div className="welcome-head"><span>WOOAEYOUNG INTRODUCTION</span><h1>잘 놀고, 잘 먹는 하루를<br/>영양 기록으로 이어가요.</h1></div><div className="welcome-scenes">
        <article className="intro-slide intro-one"><div className="pet-scene dog-play"><span className="pet dog">🐕</span><span className="toy ball">●</span><span className="ground"/></div><span>PLAY TIME</span><b>신나게 뛰어논<br/>우리 강아지</b></article>
        <article className="intro-slide intro-two"><div className="pet-scene cat-play"><span className="pet cat">🐈</span><span className="toy yarn">●</span><span className="yarn-line"/><span className="ground"/></div><span>CURIOUS CAT</span><b>호기심 많은<br/>우리 고양이</b></article>
        <article className="intro-slide intro-three"><div className="pet-scene together"><span className="pet dog">🐕</span><span className="pet cat">🐈</span><span className="bowl-mini">♥</span><span className="ground"/></div><span>HEALTHY EVERY DAY</span><b>먹는 것까지<br/>함께 살펴봐요</b></article>
      </div></div></section>
      <section className="lab-hero"><div className="w lab-grid"><div className="lab-copy"><span className="lab-kicker">INTERACTIVE NUTRITION LAB</span><h1>먹는 것을 올려두면,<br />영양 신호가 보여요.</h1><p>작업대의 오브젝트를 눌러 분석 과정을 살펴보세요.</p><div className="lab-info" aria-live="polite"><b>{info[0]}</b><span>{info[1]}</span></div><button className="btn lab-cta" onClick={() => go('analysis')}>영양 분석 시작하기</button></div>
        <div className="lab-scene" aria-label="3D 영양 분석 작업대"><div className="lab-wall"><span>WOOAEYOUNG LAB</span></div><div className="lab-table"/>
          <button className={`lab-object food ${focus === 'food' ? 'active' : ''}`} onClick={() => setFocus('food')} aria-label="오늘의 급여"><i/><i/><i/><span/></button>
          <button className={`lab-object laptop ${focus === 'data' ? 'active' : ''}`} onClick={() => setFocus('data')} aria-label="영양 신호"><img src="./laptop.svg" alt="영양 수치가 표시된 노트북"/></button>
          <button className={`lab-object jar ${focus === 'safe' ? 'active' : ''}`} onClick={() => setFocus('safe')} aria-label="조합 확인"><b>+</b></button>
          <div className="lab-pet">🐕</div><div className="lab-shadow"/>
        </div></div></section>

      <section className="sec"><div className="w">
        <h2>영양제 성분 분석</h2><p className="lead">개와 고양이 영양제의 핵심 성분을 항목별로 비교·확인하세요.</p>
        <div className="cards">
          <button className="card feature-link" onClick={() => go('analysis')}><div className="img" style={{ background: '#dfe2e3' }}><svg width="110" height="50" viewBox="0 0 110 50"><rect x="5" y="8" width="100" height="34" rx="17" fill="#4d8f4a" /><rect x="55" y="8" width="50" height="34" rx="17" fill="#8a7a3a" /></svg></div><h3>비타민 분석</h3><p>비타민 A, B군, C, D, E 등 필수 비타민 함유 여부를 확인하고 권장 섭취량과 비교합니다.</p><span>분석 화면 열기 →</span></button>
          <button className="card feature-link" onClick={() => go('analysis')}><div className="img" style={{ background: '#d6d9dd' }}><svg width="110" height="60" viewBox="0 0 110 60"><ellipse cx="55" cy="30" rx="42" ry="20" fill="#f4f4f2" /><ellipse cx="55" cy="26" rx="38" ry="15" fill="#fff" /></svg></div><h3>칼슘 분석</h3><p>칼슘, 인, 마그네슘 등 뼈와 관절 건강에 필수적인 미네랄 성분을 분석합니다.</p><span>분석 화면 열기 →</span></button>
          <button className="card feature-link" onClick={() => go('analysis')}><div className="img" style={{ background: '#dcdfe0' }}><svg width="120" height="70" viewBox="0 0 120 70"><ellipse cx="60" cy="38" rx="48" ry="24" fill="#d99a2b" /><ellipse cx="60" cy="32" rx="42" ry="18" fill="#f0b94c" /><ellipse cx="66" cy="34" rx="14" ry="9" fill="#f7d488" /></svg></div><h3>기타 성분</h3><p>오메가 지방산, 아연 등 추가 영양 성분도 함께 확인합니다.</p><span>분석 화면 열기 →</span></button>
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
