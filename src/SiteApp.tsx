import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import './site.css'
import Home from './Home'
import type { AnalysisDraft, Page } from './Home'
import AnalysisPage from './AnalysisPage'
import Records from './Records'
import Support from './Support'
import AboutPage from './AboutPage'
import RoamingPet from './RoamingPet'
import { loadRecords, saveProfile, type SavedRecord } from './Records'
import JarvisAssistant from './JarvisAssistant'
import { warmServer, type Analysis } from './api'
import FeatureTour from './FeatureTour'
import { Compass } from 'lucide-react'

const MENU: [Page, string][] = [['home', '홈'], ['about', 'About Us'], ['analysis', '영양제 분석'], ['records', '반려동물 기록'], ['support', '고객센터']]
const EN_MENU: Record<Page, string> = { home: 'Home', about: 'About Us', analysis: 'Nutrition analysis', records: 'Pet records', support: 'Support' }
const JA_MENU: Record<Page, string> = { home: 'ホーム', about: 'About Us', analysis: '栄養分析', records: 'ペットの記録', support: 'サポート' }

const pageFromPath = (): Page => window.location.pathname === '/about' ? 'about' : 'home'

export default function SiteApp() {
  const [menuLanguage, setMenuLanguage] = useState<'ko' | 'en' | 'ja'>(() => {
    try { const stored = localStorage.getItem('wooaeyoung.menu-language'); return stored === 'en' || stored === 'ja' ? stored : 'ko' } catch { return 'ko' }
  })
  const changeMenuLanguage = (language: 'ko' | 'en' | 'ja') => {
    setMenuLanguage(language)
    try { localStorage.setItem('wooaeyoung.menu-language', language) } catch { /* Session selection still works. */ }
  }
  const [page, setPage] = useState<Page>(pageFromPath)
  const [tick, setTick] = useState(0)
  const [profileToLoad, setProfileToLoad] = useState<string>()
  const [analysisDraft, setAnalysisDraft] = useState<AnalysisDraft>()
  const [loadSeq, setLoadSeq] = useState(0)
  const [analysisVisited, setAnalysisVisited] = useState(false)
  const [latestAnalysis, setLatestAnalysis] = useState<Analysis | null>(null)
  const [savedRecords, setSavedRecords] = useState<SavedRecord[]>(loadRecords)
  const [tourRequest, setTourRequest] = useState(0)
  const firstPageRender = useRef(true)
  const scrollByPage = useRef<Partial<Record<Page, number>>>({})
  const restoreOnEnter = useRef(false)

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    // Render free instances can sleep while idle. Wake the API before the user
    // opens analysis or JARVIS so their first action does not carry that delay.
    void warmServer()
  }, [])

  // restore=true: 메뉴로 돌아올 때 떠나기 전 스크롤 위치를 복원한다.
  const go = (p: Page, restore = false, push = true) => {
    scrollByPage.current[page] = window.scrollY
    restoreOnEnter.current = restore
    if (p === 'analysis') setAnalysisVisited(true)
    if (push) window.history.pushState({ page: p }, '', p === 'about' ? '/about' : '/')
    setPage(p)
  }

  useEffect(() => {
    const onPopState = () => go(pageFromPath(), false, false)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [page])

  useEffect(() => {
    const refreshRecords = () => setSavedRecords(loadRecords())
    window.addEventListener('wooaeyoung:records-changed', refreshRecords)
    return () => window.removeEventListener('wooaeyoung:records-changed', refreshRecords)
  }, [])

  // Navigation is a destination jump, not part of the landing-page story scroll.
  // Run after the new page has rendered so the browser can animate to its actual top.
  useEffect(() => {
    const behavior = firstPageRender.current ? 'auto' : 'smooth'
    firstPageRender.current = false
    const saved = restoreOnEnter.current && page !== 'home' ? scrollByPage.current[page] : undefined
    restoreOnEnter.current = false
    window.scrollTo({ top: saved ?? 0, behavior: saved === undefined ? behavior : 'auto' })
  }, [page])

  return (
    <>
      <header className="site-h"><div className="w">
        <button className="logo" onClick={() => go('home')}>우애영</button>
        <label style={{ fontSize: 12 }}>언어 / Language / 言語 <select aria-label="언어 / Language / 言語" value={menuLanguage} onChange={event => changeMenuLanguage(event.target.value === 'en' || event.target.value === 'ja' ? event.target.value : 'ko')}><option value="ko">한국어</option><option value="en">English</option><option value="ja">日本語</option></select></label>
        <nav lang={menuLanguage}>{MENU.map(([k, label]) => <button key={k} className={page === k ? 'on' : ''} onClick={() => { if (k === 'analysis') { setProfileToLoad(undefined); setAnalysisDraft(undefined) } window.dispatchEvent(new CustomEvent('wooaeyoung:tour-page', { detail: k })); go(k, true) }}>{menuLanguage === 'en' ? EN_MENU[k] : menuLanguage === 'ja' ? JA_MENU[k] : label}</button>)}<button type="button" className="feature-tour-trigger" onClick={() => { window.dispatchEvent(new CustomEvent('wooaeyoung:tour-music-start')); setTourRequest(value => value + 1) }}><Compass /> {menuLanguage === 'en' ? 'Feature tour' : menuLanguage === 'ja' ? '機能案内' : '기능 안내'}</button></nav>
      </div></header>
      <main className={`site-main page-${page}`}>
        {page === 'home' && <Home go={go} language={menuLanguage} beginAnalysis={draft => { const saved = saveProfile({ name: draft.name, species: draft.species, weightKg: draft.weightKg, age: { value: draft.ageYears * 12, unit: 'MONTH' }, completeFeed: true }); setAnalysisDraft(draft); setProfileToLoad(saved.id); setLoadSeq(n => n + 1); go('analysis') }} />}
        {page === 'about' && <AboutPage go={go} language={menuLanguage} />}
        {/* 실제 분석 화면은 계속 마운트해 두어 다른 화면에 다녀와도 입력값·결과가 유지된다. */}
        {analysisVisited && <div hidden={page !== 'analysis'}><AnalysisPage onSaved={() => setTick(value => value + 1)} onAnalysis={setLatestAnalysis} initialProfileId={profileToLoad} initialDraft={analysisDraft} loadSeq={loadSeq} active={page === 'analysis'} /></div>}
        {page === 'records' && <Records key={tick} go={go} selectProfile={id => { setAnalysisDraft(undefined); setProfileToLoad(id); setLoadSeq(n => n + 1); go('analysis') }} />}
        {page === 'support' && <Support language={menuLanguage} />}
      </main>
      <footer className="site-f"><b>우애영</b><br />반려동물 영양제 분석 서비스<br />© 2026 우애영. All rights reserved.</footer>
      <RoamingPet />
      <JarvisAssistant onNavigate={go} analysis={latestAnalysis} records={savedRecords} />
      <FeatureTour requestKey={tourRequest} currentPage={page} onNavigate={destination => go(destination, false, false)} />
    </>
  )
}
