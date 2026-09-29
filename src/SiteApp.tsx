import { useState } from 'react'
import './site.css'
import Home from './Home'
import type { Page } from './Home'
import AnalysisPage from './AnalysisPage'
import Records from './Records'

const MENU: [Page, string][] = [['home', '홈'], ['analysis', '영양제 분석'], ['records', '반려동물 기록']]

export default function SiteApp() {
  const [page, setPage] = useState<Page>('home')
  const [tick, setTick] = useState(0)
  const [profileToLoad, setProfileToLoad] = useState<string>()
  const go = (p: Page) => { setPage(p); window.scrollTo({ top: 0 }) }
  return (
    <>
      <header className="site-h"><div className="w">
        <button className="logo" onClick={() => go('home')}>우애영</button>
        <nav>{MENU.map(([k, label]) => <button key={k} className={page === k ? 'on' : ''} onClick={() => { if (k === 'analysis') setProfileToLoad(undefined); go(k) }}>{label}</button>)}</nav>
      </div></header>
      <main>
        {page === 'home' && <Home go={go} />}
        {page === 'analysis' && <AnalysisPage onSaved={() => setTick(tick + 1)} initialProfileId={profileToLoad} />}
        {page === 'records' && <Records key={tick} go={go} selectProfile={id => { setProfileToLoad(id); go('analysis') }} />}
      </main>
      <footer className="site-f"><b>우애영</b><br />반려동물 영양제 분석 서비스<br />© 2026 우애영. All rights reserved.</footer>
    </>
  )
}
