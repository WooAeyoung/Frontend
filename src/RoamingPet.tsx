import { useEffect, useState } from 'react'

export default function RoamingPet() {
  const [paused, setPaused] = useState(false)
  const [action, setAction] = useState<'walk' | 'play' | 'sleep'>('walk')
  const [cat, setCat] = useState(false)
  const [frame, setFrame] = useState(1)
  useEffect(() => { const timer = window.setInterval(() => { const selected = document.querySelector('.saved-profile-card.selected .profile-card-main small')?.textContent ?? ''; setCat(selected.includes('고양이')) }, 500); return () => window.clearInterval(timer) }, [])
  useEffect(() => { const timer = window.setInterval(() => setAction(current => current === 'walk' ? 'play' : current === 'play' ? 'sleep' : 'walk'), 6500); return () => window.clearInterval(timer) }, [])
  useEffect(() => { if (paused || action !== 'walk') return; const timer = window.setInterval(() => setFrame(value => value === 6 ? 1 : value + 1), 140); return () => window.clearInterval(timer) }, [paused, action])
  return <button className={`roaming-pet pet-${action} ${paused ? 'pet-paused' : ''}`} onClick={() => setPaused(value => !value)} aria-label={paused ? '반려동물 움직임 재생' : '반려동물 움직임 멈추기'}>
    <span className="pet-art"><img className="pet-sprite" src={`/pets/dog_frame_${frame}.png`} alt="골든리트리버 애니메이션" /></span><small>{paused ? '▶' : action === 'play' ? '공놀이 중' : action === 'sleep' ? '잠자는 중' : '클릭하면 멈춤'}</small>
  </button>
}
