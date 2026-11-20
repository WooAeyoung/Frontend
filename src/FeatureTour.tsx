import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Compass, X } from 'lucide-react'
import type { Page } from './Home'
import './feature-tour.css'

const STORAGE_KEY = 'wooaeyoung.feature-tour.v1'

type TourStep = {
  page: Page
  selector: string
  eyebrow: string
  title: string
  description: string
  scanPage?: boolean
}

const STEPS: TourStep[] = [
  { page: 'home', selector: '.story-stage', eyebrow: '홈', title: '우애영의 돌봄 흐름을 한눈에', description: '첫 화면을 천천히 내려보면 반려동물 정보 입력부터 영양 분석, 기록 관리까지 전체 이용 흐름을 이야기처럼 살펴볼 수 있어요.', scanPage: true },
  { page: 'home', selector: '.site-h nav', eyebrow: '전체 메뉴', title: '필요한 기능으로 바로 이동', description: '홈, 우애영 소개, 영양제 분석, 반려동물 기록, 고객센터를 언제든 바로 열 수 있어요.' },
  { page: 'about', selector: '.about-page', eyebrow: 'About Us', title: '분석 기준과 서비스 원칙', description: '우애영이 어떤 기준으로 영양 정보를 정리하고, 보호자가 결과를 안전하게 활용하도록 돕는지 확인할 수 있어요.', scanPage: true },
  { page: 'analysis', selector: '.analysis-page', eyebrow: '영양제 분석', title: '급여 내용을 모아 맞춤 분석', description: '반려동물 정보와 사료·영양제를 입력하면 영양소별 적정·부족·주의·과다 상태와 다음 행동을 한 화면에서 확인할 수 있어요.', scanPage: true },
  { page: 'records', selector: '.records-page', eyebrow: '반려동물 기록', title: '분석과 일상 기록을 이어서 관리', description: '반려동물별 저장 분석, 급여 체크, 몸무게와 컨디션 기록을 모아 변화 흐름을 계속 살펴볼 수 있어요.', scanPage: true },
  { page: 'support', selector: '.support-library-head', eyebrow: '고객센터', title: '사용법과 건강 안내를 빠르게 찾기', description: '자주 묻는 질문, 이용 안내, 건강 관련 주의사항과 가까운 동물병원 찾기를 이용할 수 있어요.', scanPage: true },
  { page: 'support', selector: '#nearby-vets', eyebrow: '동물병원 찾기', title: '필요할 때 가까운 병원 확인', description: '위치 권한을 허용하면 현재 위치를 기준으로 가까운 동물병원을 찾을 수 있어요. 위치는 병원 검색에만 사용돼요.' },
  { page: 'support', selector: '.jarvis-toggle', eyebrow: 'JARVIS', title: '궁금한 내용을 바로 물어보세요', description: '저장된 분석과 기록을 바탕으로 요약과 성분 설명을 도와드려요. 화면 아래 JARVIS 버튼은 어느 페이지에서든 열 수 있어요.' },
  { page: 'support', selector: '.roaming-pet, .web-pet-show', eyebrow: '화면 속 반려견', title: '함께 다니는 작은 친구', description: '반려견을 원하는 곳으로 옮기거나 설정 버튼에서 걷기를 멈추고, 숨기고, 다시 불러올 수 있어요.' },
]

type Rect = { top: number; left: number; width: number; height: number }

const FIRST_STEP_BY_PAGE: Record<Page, number> = { home: 0, about: 2, analysis: 3, records: 4, support: 5 }

export default function FeatureTour({ onNavigate, requestKey, currentPage }: { onNavigate: (page: Page) => void; requestKey: number; currentPage: Page }) {
  const [active, setActive] = useState(false)
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const step = STEPS[index]

  const start = useCallback(() => {
    setIndex(FIRST_STEP_BY_PAGE[currentPage])
    setActive(true)
  }, [currentPage])

  useEffect(() => {
    if (requestKey <= 0) return
    setIndex(FIRST_STEP_BY_PAGE[currentPage])
    setActive(true)
    // 재실행은 기능 안내 버튼의 requestKey가 실제로 바뀔 때만 처리한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  useEffect(() => {
    const followMenu = (event: Event) => {
      if (!active) return
      const destination = (event as CustomEvent<Page>).detail
      setIndex(FIRST_STEP_BY_PAGE[destination])
    }
    window.addEventListener('wooaeyoung:tour-page', followMenu)
    return () => window.removeEventListener('wooaeyoung:tour-page', followMenu)
  }, [active])

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return
    const timer = window.setTimeout(() => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setIndex(FIRST_STEP_BY_PAGE[currentPage])
        setActive(true)
      }
    }, 1400)
    return () => window.clearTimeout(timer)
    // 첫 방문 자동 안내는 페이지 이동과 무관하게 앱이 열린 뒤 한 번만 예약한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = useCallback(() => {
    window.dispatchEvent(new CustomEvent('wooaeyoung:cancel-tour-demos'))
    localStorage.setItem(STORAGE_KEY, 'seen')
    setActive(false)
    setRect(null)
  }, [])

  useEffect(() => {
    if (!active) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowRight') setIndex(value => Math.min(value + 1, STEPS.length - 1))
      if (event.key === 'ArrowLeft') setIndex(value => Math.max(value - 1, 0))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, close])

  useLayoutEffect(() => {
    if (!active) return
    if (currentPage !== step.page) {
      onNavigate(step.page)
    }
    setRect(null)
    let cancelled = false
    let attempts = 0
    let timer = 0

    const locate = () => {
      if (cancelled) return
      const element = document.querySelector<HTMLElement>(step.selector)
      if (!element && attempts++ < 20) {
        timer = window.setTimeout(locate, 80)
        return
      }
      if (!element) return
      const bounds = element.getBoundingClientRect()
      const fullyVisible = bounds.top >= 72 && bounds.bottom <= window.innerHeight - 24
      if (!fullyVisible) element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      timer = window.setTimeout(() => {
        const next = element.getBoundingClientRect()
        const padding = 8
        setRect({
          top: Math.max(8, next.top - padding),
          left: Math.max(8, next.left - padding),
          width: Math.min(window.innerWidth - Math.max(8, next.left - padding) - 8, next.width + padding * 2),
          height: Math.min(window.innerHeight - Math.max(8, next.top - padding) - 8, next.height + padding * 2),
        })
      }, fullyVisible ? 80 : 520)
    }
    timer = window.setTimeout(locate, 100)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [active, currentPage, index, onNavigate, step.page, step.selector])

  useEffect(() => {
    if (!active) return
    const update = () => {
      const element = document.querySelector<HTMLElement>(step.selector)
      if (!element) return
      const next = element.getBoundingClientRect()
      setRect({ top: Math.max(8, next.top - 8), left: Math.max(8, next.left - 8), width: Math.min(window.innerWidth - Math.max(8, next.left - 8) - 8, next.width + 16), height: Math.min(window.innerHeight - Math.max(8, next.top - 8) - 8, next.height + 16) })
    }
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, { passive: true })
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update) }
  }, [active, step.selector])

  useEffect(() => {
    if (!active || !step.scanPage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    let timer = 0
    let cancelled = false
    const stop = () => { cancelled = true; window.cancelAnimationFrame(frame); window.clearTimeout(timer) }
    const animate = (from: number, to: number, duration: number, done?: () => void) => {
      const started = performance.now()
      const tick = (now: number) => {
        if (cancelled) return
        const progress = Math.min(1, (now - started) / duration)
        const eased = progress < .5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
        window.scrollTo(0, from + (to - from) * eased)
        if (progress < 1) frame = window.requestAnimationFrame(tick)
        else done?.()
      }
      frame = window.requestAnimationFrame(tick)
    }
    window.scrollTo(0, 0)
    timer = window.setTimeout(() => {
      const bottom = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      animate(0, bottom, 7_000)
    }, 1_100)
    window.addEventListener('wheel', stop, { once: true, passive: true })
    window.addEventListener('touchstart', stop, { once: true, passive: true })
    window.addEventListener('pointerdown', stop, { once: true, passive: true })
    return () => {
      stop()
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('pointerdown', stop)
    }
  }, [active, index, step.scanPage])

  useEffect(() => {
    if (!active) return
    const timers: number[] = []
    if (step.selector === '#nearby-vets') {
      timers.push(window.setTimeout(() => {
        document.querySelector<HTMLButtonElement>('.support-medical-guide button')?.click()
        timers.push(window.setTimeout(() => document.querySelector<HTMLButtonElement>('.vet-head button')?.click(), 700))
      }, 500))
    }
    if (step.selector.includes('.roaming-pet')) {
      timers.push(window.setTimeout(() => window.dispatchEvent(new CustomEvent('wooaeyoung:demo-pet')), 450))
    }
    if (step.selector === '.jarvis-toggle') {
      timers.push(window.setTimeout(() => window.dispatchEvent(new CustomEvent('wooaeyoung:demo-jarvis')), 450))
    }
    if (step.selector === '.records-page') {
      timers.push(window.setTimeout(() => window.dispatchEvent(new CustomEvent('wooaeyoung:demo-records')), 450))
    }
    if (step.selector === '.support-library-head') {
      timers.push(window.setTimeout(() => document.querySelectorAll<HTMLButtonElement>('.support-guide-list>button')[1]?.click(), 1_100))
      timers.push(window.setTimeout(() => document.querySelectorAll<HTMLButtonElement>('.support-guide-list>button')[2]?.click(), 2_300))
      timers.push(window.setTimeout(() => document.querySelectorAll<HTMLButtonElement>('.support-library-categories>button')[1]?.click(), 3_500))
      timers.push(window.setTimeout(() => document.querySelectorAll<HTMLButtonElement>('.support-guide-list>button')[0]?.click(), 4_500))
    }
    return () => {
      timers.forEach(timer => window.clearTimeout(timer))
      if (step.selector === '.records-page') window.dispatchEvent(new CustomEvent('wooaeyoung:cancel-records-demo'))
    }
  }, [active, index, step.selector])

  if (!active) return null
  const last = index === STEPS.length - 1

  return <div className="feature-tour" role="region" aria-label="기능 둘러보기" aria-live="polite" data-tour-step={index + 1}>
    <div className="feature-tour-shade" />
    {rect && <div className="feature-tour-spotlight" style={rect} aria-hidden="true" />}
    <section className={`feature-tour-card ${index >= 7 ? 'is-left' : ''}`}>
      <div className="feature-tour-card-head">
        <span><Compass size={16} /> 기능 둘러보기</span>
        <button type="button" onClick={close} aria-label="기능 안내 닫기"><X size={18} /></button>
      </div>
      <div className="feature-tour-progress" aria-label={`${STEPS.length}단계 중 ${index + 1}단계`}><i style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} /></div>
      <small>{String(index + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')} · {step.eyebrow}</small>
      <h2>{step.title}</h2>
      <p>{step.description}</p>
      <p className="feature-tour-interaction">안내 중에도 메뉴와 화면 기능을 직접 눌러보실 수 있어요.</p>
      <div className="feature-tour-actions">
        <button type="button" className="feature-tour-skip" onClick={close}>{last ? '안내 닫기' : '건너뛰기'}</button>
        <div>
          <button type="button" onClick={() => setIndex(current => Math.max(0, current - 1))} disabled={index === 0} aria-label="이전 기능"><ChevronLeft size={17} /> 이전</button>
          <button type="button" className="feature-tour-next" onClick={() => last ? close() : setIndex(current => Math.min(current + 1, STEPS.length - 1))}>{last ? '둘러보기 완료' : <>다음 <ChevronRight size={17} /></>}</button>
        </div>
      </div>
    </section>
  </div>
}
