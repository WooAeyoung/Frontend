import { useEffect, useRef, useState } from 'react'

export type Page = 'home' | 'analysis' | 'records'

export default function Home({ go }: { go: (p: Page) => void }) {
  const homeRef = useRef<HTMLElement>(null)
  const storyStepRef = useRef(0)
  const flowStepRef = useRef(0)
  const [focus, setFocus] = useState<'food' | 'data' | 'safe'>('food')
  const [storyStep, setStoryStep] = useState(0)
  const [flowStep, setFlowStep] = useState(0)
  const setStoryFocus = (index: number) => {
    storyStepRef.current = index
    setStoryStep(index)
    setFocus((['food', 'data', 'safe'] as const)[index])
  }
  const info = {
    food: ['오늘의 급여', '오늘 먹은 제품과 양을 담았어요.'],
    data: ['영양 신호', '성분별 섭취량을 기준과 비교했어요.'],
    safe: ['조합 확인', '함께 먹일 때의 균형을 확인했어요.'],
  }[focus]

  useEffect(() => {
    const root = homeRef.current
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    let pointerFrame = 0
    let pointerX = 0
    let pointerY = 0
    let smoothX = 0
    let smoothY = 0
    const update = () => {
      frame = 0
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const pageProgress = window.scrollY / max
      root.style.setProperty('--page-scroll', String(pageProgress))
      const nextFlowStep = Math.min(3, Math.floor(pageProgress * 4.2))
      if (flowStepRef.current !== nextFlowStep) {
        flowStepRef.current = nextFlowStep
        setFlowStep(nextFlowStep)
      }
      const lab = root.querySelector<HTMLElement>('.lab-hero')
      if (lab) {
        const rect = lab.getBoundingClientRect()
        const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)))
        root.style.setProperty('--lab-scroll', String(progress))
        const nextStep = progress < .4 ? 0 : progress < .68 ? 1 : 2
        if (storyStepRef.current !== nextStep) {
          storyStepRef.current = nextStep
          setStoryStep(nextStep)
          setFocus((['food', 'data', 'safe'] as const)[nextStep])
        }
      }
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    const easePointer = () => {
      smoothX += (pointerX - smoothX) * .08
      smoothY += (pointerY - smoothY) * .08
      root.style.setProperty('--cursor-x', smoothX.toFixed(4))
      root.style.setProperty('--cursor-y', smoothY.toFixed(4))
      if (Math.abs(pointerX - smoothX) > .001 || Math.abs(pointerY - smoothY) > .001) pointerFrame = requestAnimationFrame(easePointer)
      else pointerFrame = 0
    }
    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX / Math.max(1, window.innerWidth) - .5
      pointerY = event.clientY / Math.max(1, window.innerHeight) - .5
      if (!pointerFrame) pointerFrame = requestAnimationFrame(easePointer)
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-visible', entry.isIntersecting))
    }, { threshold: .16 })
    root.querySelectorAll('[data-scroll-3d]').forEach(element => observer.observe(element))
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); window.removeEventListener('pointermove', onPointerMove); if (frame) cancelAnimationFrame(frame); if (pointerFrame) cancelAnimationFrame(pointerFrame); observer.disconnect() }
  }, [])

  return (
    <main ref={homeRef} className="home-scroll3d">
      <nav className="home-flow" aria-label="영양 관리 흐름"><span className={flowStep === 0 ? 'active' : ''}>01 소개</span><i/><span className={flowStep === 1 ? 'active' : ''}>02 급여 담기</span><i/><span className={flowStep === 2 ? 'active' : ''}>03 영양 확인</span><i/><span className={flowStep === 3 ? 'active' : ''}>04 기록하기</span></nav>
      <section className="welcome-intro" data-scroll-3d><div className="w"><div className="welcome-head"><span>01 · START WITH YOUR DAY</span><h1>우리 아이의 하루를<br/>먹는 것부터 기록해요.</h1></div><div className="welcome-scenes">
        <article className="intro-slide intro-one" data-scroll-3d><div className="pet-scene dog-play"><span className="pet dog">🐕</span><span className="toy ball">●</span><span className="ground"/></div><span>PLAY TIME</span><b>신나게 뛰어논<br/>우리 강아지</b></article>
        <article className="intro-slide intro-two" data-scroll-3d><div className="pet-scene cat-play"><span className="pet cat">🐈</span><span className="toy yarn">●</span><span className="yarn-line"/><span className="ground"/></div><span>CURIOUS CAT</span><b>호기심 많은<br/>우리 고양이</b></article>
        <article className="intro-slide intro-three" data-scroll-3d><div className="pet-scene together"><span className="pet dog">🐕</span><span className="pet cat">🐈</span><span className="bowl-mini">♥</span><span className="ground"/></div><span>HEALTHY EVERY DAY</span><b>먹는 것까지<br/>함께 살펴봐요</b></article>
      </div></div></section>
      <section className={`lab-hero story-step-${storyStep}`} data-scroll-3d><div className="w lab-grid"><div className="lab-copy"><span className="lab-kicker">02 · ADD TODAY'S FOOD</span><h1>오늘 먹은 제품을 담아볼까요?</h1><p>급여한 제품을 담으면 영양 분석이 이어져요.</p><div className="lab-story" aria-label="영양 분석 과정">
          {([['급여 담기', '먹인 제품과 양을 기록해요.'], ['영양 확인', '하루 기준과 비교해요.'], ['조합 점검', '함께 먹을 때를 살펴봐요.']] as const).map((item, index) => <button key={item[0]} className={storyStep === index ? 'active' : ''} onClick={() => setStoryFocus(index)}><i>{String(index + 1).padStart(2, '0')}</i><span><b>{item[0]}</b><small>{item[1]}</small></span></button>)}
        </div><div className="lab-info" aria-live="polite"><b>{info[0]}</b><span>{info[1]}</span></div><button className="btn lab-cta" onClick={() => go('analysis')}>영양 분석 시작하기</button></div>
        <div className="lab-scene" aria-label="3D 영양 분석 작업대"><div className="lab-wall"><span>WOOAEYOUNG LAB</span></div><div className="lab-table"/>
          <button className={`lab-object food ${focus === 'food' ? 'active' : ''}`} onClick={() => setStoryFocus(0)} aria-label="급여 담기"><i/><i/><i/><span/></button>
          <button className={`lab-object laptop ${focus === 'data' ? 'active' : ''}`} onClick={() => setStoryFocus(1)} aria-label="영양 확인"><img src="./laptop.svg" alt="영양 수치가 표시된 노트북"/></button>
          <button className={`lab-object jar ${focus === 'safe' ? 'active' : ''}`} onClick={() => setStoryFocus(2)} aria-label="조합 점검"><b>+</b></button>
          <div className="lab-pet dog-pet" aria-hidden="true">🐕</div><div className="lab-pet cat-pet" aria-hidden="true">🐈</div><div className="lab-shadow"/>
        </div></div></section>

      <section className="sec" data-scroll-3d><div className="w">
        <span className="section-kicker">03 · CHECK THE SIGNAL</span><h2>담은 제품의 영양을<br/>확인해요.</h2><p className="lead">사료와 영양제의 성분이 하루 기준에 맞는지 살펴봅니다.</p>
        <div className="cards">
          <button className="card feature-link" onClick={() => go('analysis')}><div className="img" style={{ background: '#dfe2e3' }}><svg width="110" height="50" viewBox="0 0 110 50"><rect x="5" y="8" width="100" height="34" rx="17" fill="#4d8f4a" /><rect x="55" y="8" width="50" height="34" rx="17" fill="#8a7a3a" /></svg></div><h3>비타민 분석</h3><p>비타민 D와 비타민 E의 하루 섭취량을 확인하고 적용 가능한 영양 기준과 비교합니다.</p><span>분석 화면 열기 →</span></button>
          <button className="card feature-link" onClick={() => go('analysis')}><div className="img" style={{ background: '#d6d9dd' }}><svg width="110" height="60" viewBox="0 0 110 60"><ellipse cx="55" cy="30" rx="42" ry="20" fill="#f4f4f2" /><ellipse cx="55" cy="26" rx="38" ry="15" fill="#fff" /></svg></div><h3>칼슘·인 분석</h3><p>칼슘과 인의 하루 총량과 칼슘:인 비율을 반려동물의 성장 단계에 맞춰 확인합니다.</p><span>분석 화면 열기 →</span></button>
          <button className="card feature-link" onClick={() => go('analysis')}><div className="img" style={{ background: '#dcdfe0' }}><svg width="120" height="70" viewBox="0 0 120 70"><ellipse cx="60" cy="38" rx="48" ry="24" fill="#d99a2b" /><ellipse cx="60" cy="32" rx="42" ry="18" fill="#f0b94c" /><ellipse cx="66" cy="34" rx="14" ry="9" fill="#f7d488" /></svg></div><h3>오메가3·아연 분석</h3><p>오메가3와 아연을 포함해 현재 지원하는 6종 성분을 함께 확인합니다.</p><span>분석 화면 열기 →</span></button>
        </div>
        <button className="btn" onClick={() => go('analysis')}>영양제 분석 시작하기</button>
      </div></section>

      <section className="sec alt" data-scroll-3d><div className="w">
        <span className="section-kicker">04 · KEEP THE RECORD</span><h2>확인한 내용을<br/>기록으로 남겨요.</h2><p className="lead">한 번의 분석이 매일의 건강한 급여 습관으로 이어집니다.</p>
        <div className="steps">
          <div><b>01</b><h3>반려동물 프로필 등록</h3><p>이름, 나이, 품종, 체중 등 기본 정보를 입력하면 맞춤 분석이 시작됩니다.</p></div>
          <div><b>02</b><h3>영양제 성분 입력</h3><p>급여 중인 영양제를 고르면 비타민, 칼슘 등 항목별로 분석합니다.</p></div>
          <div><b>03</b><h3>총량 확인 및 기록</h3><p>하루 섭취 총량을 확인하고, 매일의 급여 기록을 체계적으로 관리하세요.</p></div>
        </div>
      </div></section>

      <section className="sec" data-scroll-3d><div className="w trust">
        <div className="pic">👩‍💻🐶</div>
        <div><span className="section-kicker">YOUR DAILY NUTRITION NOTE</span><h2>오늘의 기록이<br/>더 안전한 급여가 돼요.</h2>
          <p>우애영은 반려동물 영양학 데이터를 기반으로 영양제 성분을 정밀하게 분석합니다. 개와 고양이 각각의 권장 섭취량에 맞춰 비타민, 칼슘, 미네랄 등의 과부족을 한눈에 파악할 수 있습니다.</p>
          <p>여러 영양제를 동시에 급여할 때 성분이 중복되거나 부족한 부분을 자동으로 계산하여 총량을 확인할 수 있어, 보다 안전하고 효율적인 영양 관리가 가능합니다.</p>
          <button className="btn" onClick={() => go('records')}>반려동물 기록 시작</button></div>
      </div></section>
    </main>
  )
}
