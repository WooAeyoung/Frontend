import { useEffect, useState } from 'react'

export default function RoamingPet() {
  const [paused, setPaused] = useState(false)
  const [action, setAction] = useState<'walk' | 'play' | 'sleep'>('walk')
  useEffect(() => { const timer = window.setInterval(() => setAction(current => current === 'walk' ? 'play' : current === 'play' ? 'sleep' : 'walk'), 6500); return () => window.clearInterval(timer) }, [])
  return <button className={`roaming-pet pet-${action} ${paused ? 'pet-paused' : ''}`} onClick={() => setPaused(value => !value)} aria-label={paused ? '반려동물 움직임 재생' : '반려동물 움직임 멈추기'}>
    <span className="pet-art"><i className="pet-head">🐶</i><i className="pet-body" /><i className="pet-leg leg-a" /><i className="pet-leg leg-b" /><i className="pet-ball" /></span><small>{paused ? '▶' : action === 'play' ? '공놀이 중' : action === 'sleep' ? '잠자는 중' : '클릭하면 멈춤'}</small>
  </button>
}
