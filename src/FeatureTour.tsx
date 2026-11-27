import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Move, X } from 'lucide-react'
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
  lockScroll?: boolean
}

type TourLanguage = 'ko' | 'en' | 'ja'
type TourCopy = { steps: Omit<TourStep, 'page' | 'selector' | 'scanPage' | 'lockScroll'>[]; label: string; move: string; moveAria: string; close: string; interaction: string; skip: string; finish: string; previous: string; next: string; previousAria: string; progress: (current: number, total: number) => string }

const TOUR_COPY: Record<Exclude<TourLanguage, 'ko'>, TourCopy> = {
  en: {
    steps: [
      { eyebrow: 'Home', title: 'See the whole care journey at a glance', description: 'Scroll through the home page to explore the journey from your pet’s profile to nutrition analysis and daily records.' },
      { eyebrow: 'Main menu', title: 'Go straight to the feature you need', description: 'Open Home, About Us, Nutrition analysis, Pet records, or Support whenever you need them.' },
      { eyebrow: 'About Us', title: 'Learn about our standards and principles', description: 'See how Wooaeyoung organizes nutrition information and helps you understand results with care.' },
      { eyebrow: 'Nutrition analysis', title: 'Review everything your pet eats', description: 'Enter your pet’s profile, food, and supplements to review nutrient levels and suggested next steps.' },
      { eyebrow: 'Pet records', title: 'Keep analysis and daily care together', description: 'Review today’s wellbeing, nutrition records, health trends, and records for each pet.' },
      { eyebrow: 'Import and manage records', title: 'Bring in reports and manage saved records', description: 'Use “Import JSON/PDF” in Nutrition records to bring in a report. Find delete options under More or Profile settings. The tour previews these controls without deleting anything.' },
      { eyebrow: 'Search the care guide', title: 'Find answers to your questions', description: 'Enter a keyword in Support search to find relevant help articles.' },
      { eyebrow: 'Support', title: 'Find service and health guidance', description: 'Browse search, help categories, and question lists, then open the guidance you need.' },
      { eyebrow: 'Care companion', title: 'A little friend to look around with', description: 'Find this companion below Support. It watches your cursor and rests when you pause, then wakes when you return.' },
      { eyebrow: 'Find a veterinarian', title: 'Look for nearby veterinary clinics', description: 'Allow location access to find nearby clinics. Your location is used only to search for clinics.' },
      { eyebrow: 'JARVIS', title: 'Ask about your pet’s results', description: 'JARVIS can summarize available analyses and explain nutrients. Open it with the JARVIS button at the bottom of any page.' },
      { eyebrow: 'On-screen pet', title: 'Meet your little companion around the site', description: 'Move the pet around, or use its settings to pause walking, hide it, and bring it back.' },
    ],
    label: 'Feature tour', move: 'Feature tour · Move', moveAria: 'Move the tour card. Use arrow keys to move and Home to reset.', close: 'Close feature tour', interaction: 'You can still click menus and use the page while the tour is open.', skip: 'Skip tour', finish: 'Finish tour', previous: 'Previous', next: 'Next', previousAria: 'Previous feature', progress: (current, total) => `Step ${current} of ${total}`,
  },
  ja: {
    steps: [
      { eyebrow: 'ホーム', title: 'ウエヨンのケアの流れをひと目で', description: 'ホーム画面をスクロールして、ペットのプロフィール入力から栄養分析、日々の記録までをご覧ください。' },
      { eyebrow: 'メインメニュー', title: '必要な機能へすぐに移動', description: 'ホーム、About Us、栄養分析、ペットの記録、サポートをいつでも開けます。' },
      { eyebrow: 'About Us', title: '分析基準とサービスの方針', description: 'ウエヨンが栄養情報をどのような基準で整理し、結果を理解するお手伝いをしているかをご紹介します。' },
      { eyebrow: '栄養分析', title: '食べているものをまとめて確認', description: 'ペットのプロフィール、フード、サプリを入力すると、栄養素の状態と次の確認ポイントを見られます。' },
      { eyebrow: 'ペットの記録', title: '分析と毎日のケアをまとめて管理', description: '今日の体調、栄養記録、健康の推移、ほかのペットの記録を確認できます。' },
      { eyebrow: '記録の取り込み・管理', title: 'レポートを取り込み、記録を管理', description: '栄養記録の「JSON/PDFを読み込む」からレポートを取り込めます。「その他」やプロフィール管理から削除メニューを確認できます。この案内では削除を実行しません。' },
      { eyebrow: 'ケアガイドを検索', title: '知りたいことをすぐに検索', description: 'サポートの検索欄にキーワードを入力すると、関連するヘルプを探せます。' },
      { eyebrow: 'サポート', title: '使い方や健康に関する案内を探す', description: '検索、ヘルプの分類、質問一覧から必要な案内を選べます。' },
      { eyebrow: 'ケアの仲間', title: '一緒に見てくれる小さな友だち', description: 'サポートの下にいる仲間です。カーソルを目で追い、操作が止まると休み、再び使うと目を覚まします。' },
      { eyebrow: '動物病院を探す', title: '近くの動物病院を確認', description: '位置情報を許可すると、現在地の近くにある病院を探せます。位置情報は病院検索にのみ使用します。' },
      { eyebrow: 'JARVIS', title: 'ペットの分析結果について質問', description: 'JARVISは分析結果の要約や栄養素の説明をお手伝いします。各ページ下部のJARVISボタンから開けます。' },
      { eyebrow: '画面のペット', title: '画面を一緒に歩く小さな友だち', description: 'ペットを好きな場所へ移動できます。設定から歩行を停止したり、非表示にしたり、再び表示できます。' },
    ],
    label: '機能案内', move: '機能案内 · 移動', moveAria: '案内カードを移動します。矢印キーで移動、Homeキーで位置をリセットします。', close: '機能案内を閉じる', interaction: '案内中もメニューや画面の機能を直接操作できます。', skip: 'スキップ', finish: '案内を終了', previous: '戻る', next: '次へ', previousAria: '前の機能', progress: (current, total) => `${total}段階中 ${current}段階目`,
  },
}

const STEPS: TourStep[] = [
  { page: 'home', selector: '.story-stage', eyebrow: '홈', title: '우애영의 돌봄 흐름을 한눈에', description: '첫 화면을 천천히 내려보면 반려동물 정보 입력부터 영양 분석, 기록 관리까지 전체 이용 흐름을 이야기처럼 살펴볼 수 있어요.', scanPage: true },
  { page: 'home', selector: '.site-h nav', eyebrow: '전체 메뉴', title: '필요한 기능으로 바로 이동', description: '홈, 우애영 소개, 영양제 분석, 반려동물 기록, 고객센터를 언제든 바로 열 수 있어요.' },
  { page: 'about', selector: '.about-page', eyebrow: 'About Us', title: '분석 기준과 서비스 원칙', description: '우애영이 어떤 기준으로 영양 정보를 정리하고, 보호자가 결과를 안전하게 활용하도록 돕는지 확인할 수 있어요.', scanPage: true },
  { page: 'analysis', selector: '.analysis-page', eyebrow: '영양제 분석', title: '급여 내용을 모아 맞춤 분석', description: '반려동물 정보와 사료·영양제를 입력하면 영양소별 적정·부족·주의·과다 상태와 다음 행동을 한 화면에서 확인할 수 있어요.', scanPage: true },
  { page: 'records', selector: '.records-page', eyebrow: '반려동물 기록', title: '분석과 일상 기록을 이어서 관리', description: '오늘 상태, 영양 기록, 건강 추이와 다른 반려동물을 순서대로 반복해서 보여드려요.', scanPage: true },
  { page: 'records', selector: '.records-workspace, .records-empty', eyebrow: '기록 가져오기·관리', title: '외부 리포트를 가져오고 안전하게 정리', description: '영양 기록의 “JSON/PDF 파일 불러오기”로 다른 곳에서 저장한 리포트를 가져올 수 있어요. 더보기와 프로필 관리에서 삭제 메뉴를 찾을 수 있으며, 둘러보기에서는 위치만 보여주고 실제 삭제는 실행하지 않아요.' },
  { page: 'support', selector: '.support-library-head', eyebrow: '돌봄 가이드 검색', title: '모르는 내용을 바로 검색', description: '“잘 모르겠는 부분부터 차근히 살펴보세요.” 아래의 고객센터 검색창에 궁금한 단어를 입력하면 관련 도움말을 바로 찾을 수 있어요.', lockScroll: true },
  { page: 'support', selector: '.support-library-main', eyebrow: '고객센터', title: '사용법과 건강 안내를 빠르게 찾기', description: '검색, 도움말 분류, 질문 목록을 한 화면에서 살펴보고 원하는 안내를 선택할 수 있어요.', lockScroll: true },
  { page: 'support', selector: '.support-page .pet-companion', eyebrow: '돌봄 친구', title: '같이 살펴보는 작은 안내 친구', description: '고객센터 아래쪽에 있는 “같이 볼까요?” 친구예요. 마우스를 바라보고, 잠시 움직임이 없으면 편안하게 쉬다가 다시 이용하면 깨어나요.' },
  { page: 'support', selector: '#nearby-vets', eyebrow: '동물병원 찾기', title: '필요할 때 가까운 병원 확인', description: '위치 권한을 허용하면 현재 위치를 기준으로 가까운 동물병원을 찾을 수 있어요. 위치는 병원 검색에만 사용돼요.' },
  { page: 'support', selector: '.jarvis-toggle', eyebrow: 'JARVIS', title: '궁금한 내용을 바로 물어보세요', description: '저장된 분석과 기록을 바탕으로 요약과 성분 설명을 도와드려요. 화면 아래 JARVIS 버튼은 어느 페이지에서든 열 수 있어요.' },
  { page: 'support', selector: '.roaming-pet, .web-pet-show', eyebrow: '화면 속 반려견', title: '함께 다니는 작은 친구', description: '반려견을 원하는 곳으로 옮기거나 설정 버튼에서 걷기를 멈추고, 숨기고, 다시 불러올 수 있어요.' },
]

type Rect = { top: number; left: number; width: number; height: number }

const FIRST_STEP_BY_PAGE: Record<Page, number> = { home: 0, about: 2, analysis: 3, records: 4, support: 6 }

export default function FeatureTour({ onNavigate, requestKey, currentPage, language = 'ko' }: { onNavigate: (page: Page) => void; requestKey: number; currentPage: Page; language?: TourLanguage }) {
  const [active, setActive] = useState(false)
  const [index, setIndex] = useState(0)
  const [pausedStep, setPausedStep] = useState<number | null>(null)
  const paused = pausedStep === index
  const [rect, setRect] = useState<Rect | null>(null)
  const cardRef = useRef<HTMLElement>(null)
  const drag = useRef<{ id: number; x: number; y: number } | null>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)

  const moveCard = useCallback((left: number, top: number) => {
    const card = cardRef.current?.getBoundingClientRect()
    if (!card) return
    const next = {
      left: Math.max(8, Math.min(left, window.innerWidth - card.width - 8)),
      top: Math.max(8, Math.min(top, window.innerHeight - card.height - 8)),
    }
    setPosition(current => current?.left === next.left && current.top === next.top ? current : next)
  }, [])

  useLayoutEffect(() => {
    if (!active || !position || !cardRef.current) return
    const keepVisible = () => moveCard(position.left, position.top)
    keepVisible()
    const observer = new ResizeObserver(keepVisible)
    observer.observe(cardRef.current)
    window.addEventListener('resize', keepVisible)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', keepVisible)
    }
  }, [active, index, moveCard, position])
  const music = useRef<HTMLAudioElement | null>(null)
  const step = language === 'ko' ? STEPS[index] : { ...STEPS[index], ...TOUR_COPY[language].steps[index] }
  const copy = language === 'ko' ? null : TOUR_COPY[language]

  useEffect(() => {
    const audio = new Audio('/audio/first-snow-moment.mp3')
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = .28
    music.current = audio
    const startMusic = () => { void audio.play().catch(() => undefined) }
    window.addEventListener('wooaeyoung:tour-music-start', startMusic)
    return () => {
      window.removeEventListener('wooaeyoung:tour-music-start', startMusic)
      audio.pause()
      music.current = null
    }
  }, [])

  useEffect(() => {
    const audio = music.current
    if (!audio) return
    if (!active || step.selector === '.jarvis-toggle') {
      audio.pause()
      return
    }
    const unlock = () => { void audio.play().catch(() => undefined) }
    void audio.play().catch(() => undefined)
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [active, index, step.selector])

  useEffect(() => {
    if (requestKey <= 0) return
    setIndex(0)
    setPausedStep(null)
    setActive(true)
    // 재실행은 기능 안내 버튼의 requestKey가 실제로 바뀔 때만 처리한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  useEffect(() => {
    const followMenu = (event: Event) => {
      if (!active) return
      const destination = (event as CustomEvent<Page>).detail
      setIndex(FIRST_STEP_BY_PAGE[destination])
      setPausedStep(FIRST_STEP_BY_PAGE[destination])
    }
    window.addEventListener('wooaeyoung:tour-page', followMenu)
    return () => window.removeEventListener('wooaeyoung:tour-page', followMenu)
  }, [active])

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return
    const timer = window.setTimeout(() => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setIndex(0)
        setActive(true)
      }
    }, 1400)
    return () => window.clearTimeout(timer)
    // 첫 방문 자동 안내는 페이지 이동과 무관하게 앱이 열린 뒤 한 번만 예약한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = useCallback(() => {
    window.dispatchEvent(new CustomEvent('wooaeyoung:cancel-tour-demos'))
    if (music.current) {
      music.current.pause()
      music.current.currentTime = 0
    }
    localStorage.setItem(STORAGE_KEY, 'seen')
    setActive(false)
    setRect(null)
  }, [])

  useEffect(() => {
    if (!active) return
    const pause = (event: Event) => {
      if (!event.isTrusted) return
      if (!paused) window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: 'instant' })
      window.dispatchEvent(new Event('wooaeyoung:pause-tour-demos'))
      setPausedStep(index)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) { pause(event); return }
      if (event.key === 'Escape') close()
      pause(event)
    }
    window.addEventListener('pointerdown', pause, true)
    window.addEventListener('wheel', pause, { capture: true, passive: true })
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', pause, true)
      window.removeEventListener('wheel', pause, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [active, close, index, paused])

  useLayoutEffect(() => {
    if (!active) return
    if (currentPage !== step.page) {
      onNavigate(step.page)
    }
    if (paused) return
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
      const revealExactTarget = step.selector === '.support-page .pet-companion'
      if ((!fullyVisible || revealExactTarget) && !step.lockScroll) element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      timer = window.setTimeout(() => {
        const next = element.getBoundingClientRect()
        const padding = 8
        setRect({
          top: Math.max(8, next.top - padding),
          left: Math.max(8, next.left - padding),
          width: Math.min(window.innerWidth - Math.max(8, next.left - padding) - 8, next.width + padding * 2),
          height: Math.min(window.innerHeight - Math.max(8, next.top - padding) - 8, next.height + padding * 2),
        })
      }, fullyVisible && !revealExactTarget ? 80 : 900)
    }
    timer = window.setTimeout(locate, 100)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [active, currentPage, index, onNavigate, paused, step.lockScroll, step.page, step.selector])

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
    const tracking = step.selector.includes('.roaming-pet') ? window.setInterval(update, 120) : 0
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update); if (tracking) window.clearInterval(tracking) }
  }, [active, step.selector])

  useEffect(() => {
    if (!active || paused || !step.scanPage) return
    let frame = 0
    let timer = 0
    let interactionTimer = 0
    let cancelled = false
    const stop = () => { cancelled = true; window.cancelAnimationFrame(frame); window.clearTimeout(timer); window.clearTimeout(interactionTimer) }
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
    const scanUp = (): void => animate(window.scrollY, 0, 3_800, () => {
      timer = window.setTimeout(scanDown, 550)
    })
    const scanDown = (): void => {
      const bottom = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      animate(window.scrollY, bottom, 5_000, () => {
        timer = window.setTimeout(scanUp, 550)
      })
    }
    timer = window.setTimeout(() => {
      scanDown()
    }, 1_100)
    interactionTimer = window.setTimeout(() => {
      window.addEventListener('wheel', stop, { once: true, passive: true })
      window.addEventListener('touchstart', stop, { once: true, passive: true })
      window.addEventListener('pointerdown', stop, { once: true, passive: true })
    }, 450)
    return () => {
      stop()
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('pointerdown', stop)
    }
  }, [active, index, paused, step.scanPage])

  useEffect(() => {
    if (!active || paused) return
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
    if (step.selector === '.records-page' || step.selector === '.records-workspace, .records-empty') {
      timers.push(window.setTimeout(() => window.dispatchEvent(new CustomEvent('wooaeyoung:demo-records')), 450))
    }
    if (step.selector === '.support-library-head') {
      timers.push(window.setTimeout(() => window.dispatchEvent(new CustomEvent('wooaeyoung:demo-support-search')), 450))
    }
    if (step.selector === '.support-library-main') {
      const runSupportCycle = (): void => {
        document.querySelectorAll<HTMLButtonElement>('.support-library-categories>button')[0]?.click()
        timers.push(window.setTimeout(() => document.querySelectorAll<HTMLButtonElement>('.support-guide-list>button')[1]?.click(), 1_100))
        timers.push(window.setTimeout(() => document.querySelectorAll<HTMLButtonElement>('.support-guide-list>button')[2]?.click(), 2_200))
        timers.push(window.setTimeout(() => document.querySelectorAll<HTMLButtonElement>('.support-library-categories>button')[1]?.click(), 3_300))
        timers.push(window.setTimeout(() => document.querySelectorAll<HTMLButtonElement>('.support-guide-list>button')[0]?.click(), 4_400))
        timers.push(window.setTimeout(() => document.querySelectorAll<HTMLButtonElement>('.support-library-categories>button')[2]?.click(), 5_500))
        timers.push(window.setTimeout(runSupportCycle, 6_800))
      }
      timers.push(window.setTimeout(runSupportCycle, 450))
    }
    return () => {
      timers.forEach(timer => window.clearTimeout(timer))
      if (step.selector === '.records-page' || step.selector === '.records-workspace, .records-empty') window.dispatchEvent(new CustomEvent('wooaeyoung:cancel-records-demo'))
      if (step.selector === '.support-library-head') window.dispatchEvent(new CustomEvent('wooaeyoung:cancel-support-search'))
    }
  }, [active, index, paused, step.selector])

  if (!active) return null
  const last = index === STEPS.length - 1
  const petTarget = (step.selector === '.support-page .pet-companion' || index === STEPS.length - 1) && rect
  const targetSide = petTarget ? `${rect.left + rect.width / 2 > window.innerWidth / 2 ? 'target-right' : 'target-left'} ${rect.top + rect.height / 2 > window.innerHeight / 2 ? 'target-bottom' : 'target-top'}` : ''

  return <div className="feature-tour" role="region" aria-label={copy?.label ?? '기능 둘러보기'} aria-live="polite" data-tour-step={index + 1}>
    <div className="feature-tour-shade" />
    {rect && <div className="feature-tour-spotlight" style={rect} aria-hidden="true" />}
    <section ref={cardRef} className={`feature-tour-card ${index >= 7 ? 'is-left' : ''} ${petTarget ? `avoid-target ${targetSide}` : ''}`} style={position ? { ...position, right: 'auto', bottom: 'auto' } : undefined}>
      <div className="feature-tour-card-head">
        <button type="button" className="feature-tour-move" aria-label={copy?.moveAria ?? '안내창 위치 이동. 방향키로 이동, 홈 키로 초기화'}
          onPointerDown={event => {
            const card = cardRef.current?.getBoundingClientRect()
            if (!card || !event.isPrimary || event.button !== 0) return
            drag.current = { id: event.pointerId, x: event.clientX - card.left, y: event.clientY - card.top }
            event.currentTarget.setPointerCapture(event.pointerId)
            moveCard(card.left, card.top)
          }}
          onPointerMove={event => {
            const start = drag.current
            if (start?.id === event.pointerId) moveCard(event.clientX - start.x, event.clientY - start.y)
          }}
          onLostPointerCapture={() => { drag.current = null }}
          onKeyDown={event => {
            const card = cardRef.current?.getBoundingClientRect()
            if (!card) return
            const offsets: Record<string, [number, number]> = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }
            const offset = offsets[event.key]
            if (event.key === 'Home') {
              event.preventDefault()
              setPosition(null)
            } else if (offset) {
              event.preventDefault()
              moveCard(card.left + offset[0], card.top + offset[1])
            }
          }}><Move size={16} /> {copy?.move ?? '기능 둘러보기 · 이동'}</button>
        <button type="button" onClick={close} aria-label={copy?.close ?? '기능 안내 닫기'}><X size={18} /></button>
      </div>
      <div className="feature-tour-progress" aria-label={copy?.progress(index + 1, STEPS.length) ?? `${STEPS.length}단계 중 ${index + 1}단계`}><i style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} /></div>
      <small>{String(index + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')} · {step.eyebrow}</small>
      <h2>{step.title}</h2>
      <p>{step.description}</p>
      <p className="feature-tour-interaction">{copy?.interaction ?? '안내 중에도 메뉴와 화면 기능을 직접 눌러보실 수 있어요.'}</p>
      <div className="feature-tour-actions">
        <button type="button" className="feature-tour-skip" onClick={close}>{last ? copy?.finish ?? '안내 닫기' : copy?.skip ?? '건너뛰기'}</button>
        <div>
          <button type="button" onClick={() => { setPausedStep(null); setIndex(current => Math.max(0, current - 1)) }} disabled={index === 0} aria-label={copy?.previousAria ?? '이전 기능'}><ChevronLeft size={17} /> {copy?.previous ?? '이전'}</button>
          <button type="button" className="feature-tour-next" onClick={() => { if (last) close(); else { setPausedStep(null); setIndex(current => Math.min(current + 1, STEPS.length - 1)) } }}>{last ? copy?.finish ?? '둘러보기 완료' : <>{copy?.next ?? '다음'} <ChevronRight size={17} /></>}</button>
        </div>
      </div>
    </section>
  </div>
}
