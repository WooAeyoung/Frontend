import { useEffect, useRef, useState } from 'react'

type Language = 'ko' | 'en' | 'ja'

type PetState = { x: number; y: number; paused: boolean; hidden: boolean }
const KEY = 'wooaeyoung-web-pet-v1'
const readState = (): Partial<PetState> => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } }

export default function RoamingPet({ language = 'ko' }: { language?: Language }) {
  const saved = useRef(readState())
  const [paused, setPaused] = useState(Boolean(saved.current.paused))
  const [hidden, setHidden] = useState(Boolean(saved.current.hidden))
  const [menuOpen, setMenuOpen] = useState(false)
  const [position, setPosition] = useState({ x: saved.current.x ?? Math.max(12, window.innerWidth - 110), y: saved.current.y ?? Math.max(12, window.innerHeight - 120) })
  const [dragging, setDragging] = useState(false)
  const currentState = useRef({ paused, hidden })
  currentState.current = { paused, hidden }
  const dragOffset = useRef({ x: 0, y: 0 }); const frame = useRef(0); const direction = useRef(-1); const last = useRef(performance.now())
  const clamp = (x: number, y: number) => ({ x: Math.max(8, Math.min(window.innerWidth - 88, x)), y: Math.max(8, Math.min(window.innerHeight - 100, y)) })
  const persist = (next: Partial<PetState> = {}) => { try { localStorage.setItem(KEY, JSON.stringify({ x: position.x, y: position.y, paused, hidden, ...next })) } catch {} }
  // The roaming pet is an explicit, user-facing interaction. Keep its gentle walk
  // available even when the OS requests reduced motion; the menu still provides
  // an explicit pause control and dragging never triggers animation.
  useEffect(() => { const tick = (now: number) => { const dt = Math.min((now - last.current) / 1000, .06); last.current = now; if (!paused && !hidden && !dragging && !document.hidden) setPosition(current => { const next = clamp(current.x + direction.current * 28 * dt, current.y); if (next.x <= 8 || next.x >= window.innerWidth - 88) direction.current *= -1; return next }); frame.current = requestAnimationFrame(tick) }; frame.current = requestAnimationFrame(tick); const resize = () => setPosition(current => clamp(current.x, current.y)); window.addEventListener('resize', resize); return () => { cancelAnimationFrame(frame.current); window.removeEventListener('resize', resize) } }, [paused, hidden, dragging])
  useEffect(() => {
    let timers: number[] = []
    let original: { paused: boolean; hidden: boolean } | null = null
    const apply = (next: Partial<PetState>) => {
      if ('paused' in next) setPaused(Boolean(next.paused))
      if ('hidden' in next) setHidden(Boolean(next.hidden))
      try {
        const savedState = JSON.parse(localStorage.getItem(KEY) || '{}')
        localStorage.setItem(KEY, JSON.stringify({ ...savedState, ...next }))
      } catch {}
      setMenuOpen(false)
    }
    const cancelDemo = () => {
      timers.forEach(window.clearTimeout)
      timers = []
      if (original) apply(original)
      original = null
    }
    const demo = () => {
      cancelDemo()
      original = { ...currentState.current }
      apply({ hidden: false, paused: false })
      timers = [
        window.setTimeout(() => apply({ paused: true }), 900),
        window.setTimeout(() => apply({ paused: false }), 1_800),
        window.setTimeout(() => apply({ hidden: true }), 2_700),
        window.setTimeout(() => apply({ hidden: false }), 3_600),
        window.setTimeout(() => { if (original) apply(original); original = null }, 4_500),
      ]
    }
    const pauseDemo = () => {
      timers.forEach(window.clearTimeout)
      timers = []
      original = null
    }
    window.addEventListener('wooaeyoung:pause-tour-demos', pauseDemo)
    window.addEventListener('wooaeyoung:demo-pet', demo)
    window.addEventListener('wooaeyoung:cancel-tour-demos', cancelDemo)
    return () => { cancelDemo(); window.removeEventListener('wooaeyoung:pause-tour-demos', pauseDemo); window.removeEventListener('wooaeyoung:demo-pet', demo); window.removeEventListener('wooaeyoung:cancel-tour-demos', cancelDemo) }
  }, [])
  const down = (event: React.PointerEvent<HTMLDivElement>) => { if ((event.target as HTMLElement).closest('button')) return; setDragging(true); dragOffset.current = { x: event.clientX - position.x, y: event.clientY - position.y }; event.currentTarget.setPointerCapture(event.pointerId) }
  const move = (event: React.PointerEvent<HTMLDivElement>) => { if (dragging) setPosition(clamp(event.clientX - dragOffset.current.x, event.clientY - dragOffset.current.y)) }
  const up = () => { setDragging(false); persist() }
  const update = (next: Partial<PetState>) => { if ('paused' in next) setPaused(Boolean(next.paused)); if ('hidden' in next) setHidden(Boolean(next.hidden)); persist(next); setMenuOpen(false) }
  const reset = () => { const next = { x: Math.max(12, window.innerWidth - 110), y: Math.max(12, window.innerHeight - 120) }; setPosition(next); persist(next); setMenuOpen(false) }
  const labels = language === 'en'
    ? { group: 'Roaming pet', menu: 'Pet settings', alt: 'Golden retriever', resume: 'Resume walking', pause: 'Pause walking', reset: 'Reset position', hide: 'Hide pet', show: '🐾 Show pet' }
    : language === 'ja'
      ? { group: '画面を歩くペット', menu: 'ペットの設定', alt: 'ゴールデンレトリバー', resume: '歩行を再開', pause: '歩行を停止', reset: '位置をリセット', hide: 'ペットを隠す', show: '🐾 ペットを表示' }
      : { group: '화면 속 반려견', menu: '펫 설정', alt: '골든리트리버', resume: '걷기 재개', pause: '걷기 멈추기', reset: '위치 초기화', hide: '펫 숨기기', show: '🐾 펫 보이기' }
  return <>{!hidden && <div className={`roaming-pet web-pet ${dragging ? 'pet-dragging' : ''}`} style={{ left: position.x, top: position.y, right: 'auto', bottom: 'auto' }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="group" aria-label={labels.group}><button className="web-pet-menu" onClick={() => setMenuOpen(value => !value)} aria-label={labels.menu} aria-expanded={menuOpen}>⋯</button><img className="pet-sprite" src="/pets/dog-transparent.png" alt={labels.alt} />{menuOpen && <div className="web-pet-actions"><button onClick={() => update({ paused: !paused })}>{paused ? labels.resume : labels.pause}</button><button onClick={reset}>{labels.reset}</button><button onClick={() => update({ hidden: true })}>{labels.hide}</button></div>}</div>}{hidden && <button className="web-pet-show" onClick={() => update({ hidden: false })}>{labels.show}</button>}</>
}
