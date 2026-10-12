import { useLayoutEffect, useRef } from 'react'
import './story.css'

declare global {
  interface Window { gsap?: any; ScrollTrigger?: any }
}

export type Page = 'home' | 'analysis' | 'records'
const days = [['월','14',true],['화','15',true],['수','16',true],['목','17',false],['금','18',false],['토','19',false],['일','20',false]] as const

export default function Home({ go }: { go: (page: Page) => void }) {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const element = root.current
    if (!element) return
    const gsap = window.gsap
    const ScrollTrigger = window.ScrollTrigger
    if (!gsap || !ScrollTrigger) return
    gsap.registerPlugin(ScrollTrigger)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const context = gsap.context(() => {
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: element, start: 'top top', end: '+=4200', pin: '.story-stage', scrub: 1.35, anticipatePin: 1, invalidateOnRefresh: true },
      })
        .to('.hero-copy', { opacity: 0, y: -70, duration: .8 }, .25)
        .to('.pet-visual', { width: '31rem', height: '39rem', borderRadius: '2.7rem', xPercent: 0, yPercent: 0, duration: 1.7 }, .2)
        .to('.device-shell', { opacity: 1, scale: 1, duration: 1.2 }, .55)
        .to('.pet-visual', { opacity: 0, scale: .94, duration: .55 }, 1.45)
        .to('.stage-word', { opacity: .055, xPercent: -8, duration: 1.3 }, .5)
        .to('.chapter-one', { opacity: 0, y: -38, duration: .55 }, 1.25)
        .to('.chapter-two', { opacity: 1, y: 0, duration: .65 }, 1.55)
        .to('.analysis-screen', { opacity: 1, duration: .55 }, 1.55)
        .fromTo('.chart-bar', { scaleY: 0 }, { scaleY: 1, stagger: .12, duration: .8 }, 1.7)
        .fromTo('.score-ring', { '--score': 0 }, { '--score': 84, duration: 1 }, 1.65)
        .fromTo('.metric-row i', { scaleX: 0 }, { scaleX: 1, stagger: .1, duration: .7 }, 1.72)
        .to('.chapter-two', { opacity: 0, y: -34, duration: .45 }, 2.65)
        .to('.device-shell', { x: '-32vw', rotateY: 6, scale: .86, duration: 1.1 }, 2.55)
        .to('.chapter-three', { opacity: 1, y: 0, duration: .7 }, 2.8)
        .fromTo('.calendar-dashboard', { opacity: 0, x: '60vw' }, { opacity: 1, x: 0, duration: 1.2 }, 2.55)
        .fromTo('.day-card', { opacity: 0, y: 32 }, { opacity: 1, y: 0, stagger: .08, duration: .55 }, 2.9)
        .fromTo('.trend-line', { strokeDashoffset: 420 }, { strokeDashoffset: 0, duration: 1.1 }, 3.05)
        .to('.story-progress i', { scaleX: 1, duration: 3.65 }, 0)

      ScrollTrigger.create({ trigger: element, start: 'top top', end: '+=4200', onUpdate: (self: { progress: number }) => {
        element.dataset.step = self.progress < .35 ? '01' : self.progress < .68 ? '02' : '03'
      }})
    }, element)
    return () => context.revert()
  }, [])

  return <main ref={root} className="story-root" data-step="01">
    <section className="story-stage" aria-label="우애영 맞춤 영양 관리 이야기">
      <div className="story-noise"/><div className="stage-word" aria-hidden="true">BETTER<br/>TOGETHER</div>
      <div className="story-progress" aria-hidden="true"><i/></div>
      <div className="story-rail" aria-label="현재 스토리 단계"><span data-no="01">만남</span><span data-no="02">분석</span><span data-no="03">기록</span></div>

      <div className="hero-copy chapter-one"><p className="story-kicker">PERSONAL NUTRITION FOR PETS</p><h1>매일 먹는 것부터,<br/><em>더 오래 함께.</em></h1><p>우리 아이의 나이, 체중, 생활 습관을 바탕으로<br/>꼭 필요한 영양만 섬세하게 설계해요.</p><div className="scroll-cue"><span/>SCROLL TO DISCOVER</div></div>

      <div className="pet-visual" role="img" aria-label="햇살 아래 앉아 있는 반려견과 반려묘"><div className="sun-disc"/><div className="pet-art"><span className="dog">🐕</span><span className="cat">🐈</span></div><small>MOONGI &amp; HARU · 2026</small></div>

      <div className="device-shell" aria-label="우애영 모바일 앱 미리보기"><div className="device-speaker"/><div className="device-screen"><div className="device-top"><b>우애영</b><span>•••</span></div><div className="device-pet"><span>🐕</span><div><small>오늘도 건강하게</small><b>몽이의 영양 리포트</b></div></div><div className="analysis-screen"><div className="analysis-head"><div><small>DAILY BALANCE</small><b>오늘의 영양 균형</b></div><div className="score-ring"><strong>84</strong><small>GOOD</small></div></div><div className="chart-card">{[1,2,3,4,5,6].map(n=><span className="chart-bar" key={n}/>)}</div><div className="metrics">{[['오메가 3','92%'],['칼슘','76%'],['비타민 D','68%']].map(([name,value])=><div className="metric-row" key={name}><span>{name}</span><b>{value}</b><em><i style={{width:value}}/></em></div>)}</div><div className="device-note"><span>✓</span><p><b>균형이 좋아요</b><small>칼슘 섭취량을 조금만 보충해 주세요.</small></p></div></div></div></div>

      <div className="chapter-copy chapter-two"><p className="story-kicker">02 · NUTRITION INSIGHT</p><h2>복잡한 성분표를<br/><em>한눈에 이해하도록.</em></h2><p>사료와 영양제의 모든 성분을 함께 계산해<br/>부족과 과잉을 알기 쉽게 보여드려요.</p><button onClick={() => go('analysis')}>내 영양 균형 분석하기 <span>↗</span></button></div>

      <div className="chapter-copy chapter-three"><p className="story-kicker">03 · DAILY RECORD</p><h2>작은 기록이 만드는<br/><em>분명한 건강 변화.</em></h2><p>섭취 여부와 컨디션을 매일 체크하고,<br/>우리 아이에게 맞는 루틴을 발견하세요.</p><button onClick={() => go('records')}>건강 기록 시작하기 <span>↗</span></button></div>

      <div className="calendar-dashboard"><div className="calendar-head"><div><small>OCTOBER · WEEK 3</small><h3>몽이의 데일리 루틴</h3></div><span>이번 주 5일 완료</span></div><div className="week-row">{days.map(([label,date,done])=><div className={`day-card ${done?'done':''}`} key={date}><small>{label}</small><b>{date}</b><span>{done?'✓':''}</span></div>)}</div><div className="dashboard-grid"><div className="habit-list">{[['◌','유산균','아침 식사 후 · 1포'],['◇','오메가 3','저녁 식사 후 · 1캡슐'],['＋','관절 케어','저녁 식사와 함께 · 1정']].map((item,index)=><div key={item[1]}><span className="habit-icon">{item[0]}</span><p><b>{item[1]}</b><small>{item[2]}</small></p><button className={index===0?'checked':''}>{index===0?'✓':'완료'}</button></div>)}</div><div className="health-trend"><div><small>HEALTH TREND</small><b>컨디션 변화</b></div><strong>+12%</strong><svg viewBox="0 0 360 130" role="img" aria-label="최근 7일 컨디션 상승 그래프"><path d="M8 108 C55 104,72 83,108 88 S164 105,196 68 S263 71,286 43 S332 34,352 12" className="trend-line"/><path d="M8 108 C55 104,72 83,108 88 S164 105,196 68 S263 71,286 43 S332 34,352 12 L352 130 L8 130Z" className="trend-fill"/></svg></div></div></div>
    </section>
  </main>
}
