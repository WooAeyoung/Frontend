import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './story.css'

gsap.registerPlugin(ScrollTrigger)

export type Page = 'home' | 'about' | 'analysis' | 'records' | 'support'
const days = [['월','14',true],['화','15',true],['수','16',true],['목','17',false],['금','18',false],['토','19',false],['일','20',false]] as const

export type AnalysisDraft = { name: string; species: 'DOG' | 'CAT'; weightKg: number; ageYears: number; symptoms: string[] }

export default function Home({ go, beginAnalysis, language = 'ko' }: { go: (page: Page) => void; beginAnalysis: (draft: AnalysisDraft) => void; language?: 'ko' | 'en' | 'ja' }) {
  const root = useRef<HTMLElement>(null)
  const unlocked = useRef(false)
  const [name, setName] = useState('')
  const [species, setSpecies] = useState<'DOG' | 'CAT'>('DOG')
  const [weight, setWeight] = useState('')
  const [age, setAge] = useState('')
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const formValid = name.trim().length > 0 && Number(weight) > 0 && Number(age) > 0
  const t = (ko: string, en: string, ja: string) => language === 'en' ? en : language === 'ja' ? ja : ko
  const symptomText = (value: string) => ({ '관절': t('관절', 'Joints', '関節'), '피부·모질': t('피부·모질', 'Skin & coat', '皮膚・被毛'), '장 건강': t('장 건강', 'Digestion', 'お腹'), '눈 건강': t('눈 건강', 'Eyes', '目'), '특별한 증상 없음': t('특별한 증상 없음', 'No specific concerns', '特に気になる症状はない') }[value] ?? value)

  const toggleSymptom = (value: string) => setSymptoms(current => value === '특별한 증상 없음'
    ? (current.includes(value) ? [] : [value])
    : current.filter(item => item !== '특별한 증상 없음').includes(value)
      ? current.filter(item => item !== value)
      : [...current.filter(item => item !== '특별한 증상 없음'), value])

  const startAnalysis = () => {
    if (!formValid || analyzing || !root.current) return
    setAnalyzing(true)
    const finish = () => {
      unlocked.current = true
      root.current?.classList.remove('story-gated')
      root.current?.classList.add('story-unlocked')
      setAnalyzing(false)
      beginAnalysis({ name: name.trim(), species, weightKg: Number(weight), ageYears: Number(age), symptoms })
    }
    // 홈 안의 요소만 선택한다. 전역 셀렉터('.input-panel' 등)를 쓰면 마운트된 분석 화면의 STEP 1·2 패널까지 opacity:0이 된다.
    const scope = root.current
    const q = (selector: string) => scope.querySelectorAll(selector)
    const particles = q('.data-particle')
    gsap.timeline({ onComplete: finish })
      .to(q('.form-fields'), { opacity: 0, scale: .94, duration: .35, ease: 'power2.in' })
      .to(particles, { opacity: 1, x: () => gsap.utils.random(-260, 260), y: () => gsap.utils.random(-210, 210), scale: () => gsap.utils.random(.7, 1.5), stagger: .035, duration: .75, ease: 'power3.out' }, .1)
      .to(particles, { opacity: 0, scale: 0, duration: .35 }, .62)
      .to(q('.input-panel'), { opacity: 0, y: -35, pointerEvents: 'none', duration: .4 }, .55)
      .to(q('.chapter-two'), { opacity: 0, y: -35, duration: .35 }, .6)
      .to(q('.analysis-screen'), { opacity: 1, duration: .5 }, .72)
      .fromTo(q('.chart-bar'), { scaleY: 0 }, { scaleY: 1, stagger: .09, duration: .65, ease: 'back.out(1.7)' }, .78)
      .fromTo(q('.score-ring'), { '--score': 0 }, { '--score': 84, duration: .9, ease: 'power2.out' }, .76)
      .fromTo(q('.metric-row i'), { scaleX: 0 }, { scaleX: 1, stagger: .08, duration: .55 }, .85)
      .to(q('.result-toast'), { opacity: 1, y: 0, duration: .45 }, 1.08)
  }

  useLayoutEffect(() => {
    const element = root.current
    if (!element) return
    // Browsers can restore the previous pinned-story offset after the app mounts.
    // Reset the landing story itself so a fresh visit always starts at 01 · 만남.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
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
        .to('.input-panel', { opacity: 1, y: 0, pointerEvents: 'auto', duration: .65 }, 1.6)
        .to('.chapter-two', { opacity: 0, y: -34, duration: .45 }, 2.65)
        .to('.input-panel', { opacity: 0, y: -34, pointerEvents: 'none', duration: .45 }, 2.65)
        .to('.device-shell', { x: '-32vw', rotateY: 6, scale: .86, duration: 1.1 }, 2.55)
        .to('.device-shell', { opacity: 0, duration: .7 }, 2.85)
        .to('.chapter-three', { opacity: 1, y: 0, duration: .7 }, 2.8)
        .fromTo('.calendar-dashboard', { opacity: 0, x: '60vw' }, { opacity: 1, x: 0, duration: 1.2 }, 2.55)
        .fromTo('.day-card', { opacity: 0, y: 32 }, { opacity: 1, y: 0, stagger: .08, duration: .55 }, 2.9)
        .fromTo('.trend-line', { strokeDashoffset: 420 }, { strokeDashoffset: 0, duration: 1.1 }, 3.05)
        .to('.story-progress i', { scaleX: 1, duration: 3.65 }, 0)

      const gate = ScrollTrigger.create({ trigger: element, start: 'top top', end: '+=4200', onUpdate: (self: { progress: number }) => {
        element.dataset.step = self.progress < .35 ? '01' : self.progress < .68 ? '02' : '03'
      }})
      return () => gate.kill()
    }, element)
    // Layout can change after the first measurement while emoji, images, or web fonts load.
    // Refreshing after those assets settle prevents a stale pin range on a revisit.
    const refresh = () => ScrollTrigger.refresh()
    const frame = window.requestAnimationFrame(refresh)
    const images = Array.from(element.querySelectorAll('img'))
    images.forEach(image => {
      if (!image.complete) image.addEventListener('load', refresh, { once: true })
    })
    document.fonts?.ready.then(refresh).catch(() => undefined)
    return () => {
      window.cancelAnimationFrame(frame)
      images.forEach(image => image.removeEventListener('load', refresh))
      context.revert()
    }
  }, [])

  return <main ref={root} className="story-root" data-step="01">
      <section className="story-stage" aria-label={t('우애영 맞춤 영양 관리 이야기', 'Wooaeyoung personalized nutrition journey', 'ウエヨンの個別栄養ケアストーリー')}>
      <div className="story-noise"/><div className="stage-word" aria-hidden="true">BETTER<br/>TOGETHER</div>
      <div className="story-progress" aria-hidden="true"><i/></div>
      <div className="story-rail" aria-label={t('현재 스토리 단계', 'Story sections', 'ストーリーの項目')}><span data-no="01">{t('만남', 'Meet', '出会い')}</span><span data-no="02">{t('분석', 'Analyze', '分析')}</span><span data-no="03">{t('기록', 'Journal', '記録')}</span></div>

      <div className="hero-copy chapter-one"><p className="story-kicker">PERSONAL NUTRITION FOR PETS</p><h1>{language === 'en' ? <>Start with what they eat,<br/><em>stay together longer.</em></> : language === 'ja' ? <>毎日の食事から、<br/><em>もっと長く一緒に。</em></> : <>매일 먹는 것부터,<br/><em>더 오래 함께.</em></>}</h1><p>{language === 'en' ? <>Thoughtfully tailored nutrition based on<br/>your pet’s age, weight, and lifestyle.</> : language === 'ja' ? <>年齢・体重・暮らしに合わせて、<br/>必要な栄養を丁寧に考えます。</> : <>우리 아이의 나이, 체중, 생활 습관을 바탕으로<br/>꼭 필요한 영양만 섬세하게 설계해요.</>}</p><div className="scroll-cue"><span/>{t('스크롤하여 둘러보기', 'SCROLL TO DISCOVER', 'スクロールして見る')}</div></div>

      <div className="pet-visual" role="img" aria-label={t('햇살 아래 앉아 있는 반려견과 반려묘', 'A dog and cat sitting in the sunshine', '日差しの下に座る犬と猫')}><div className="sun-disc"/><div className="pet-art"><span className="dog">🐕</span><span className="cat">🐈</span></div><small>MOONGI &amp; HARU · 2026</small></div>

      <div className="device-shell" aria-label={t('우애영 모바일 앱 미리보기', 'Wooaeyoung app preview', 'ウエヨンアプリのプレビュー')}><div className="device-speaker"/><div className="device-screen"><div className="device-top"><b>우애영</b><span>•••</span></div><div className="device-pet"><span>🐕</span><div><small>{t('오늘도 건강하게', 'A healthier day', '今日も元気に')}</small><b>{name || t('우리 아이', 'My pet', 'うちの子')}{t('의 영양 리포트', '’s nutrition report', 'の栄養レポート')}</b></div></div><div className="analysis-screen"><div className="analysis-head"><div><small>DAILY BALANCE</small><b>{t('오늘의 영양 균형', 'Today’s nutrition balance', '今日の栄養バランス')}</b></div><div className="score-ring"><strong>84</strong><small>GOOD</small></div></div><div className="chart-card">{[1,2,3,4,5,6].map(n=><span className="chart-bar" key={n}/>)}</div><div className="metrics">{[[t('오메가 3','Omega 3','オメガ3'),'92%'],[t('칼슘','Calcium','カルシウム'),'76%'],[t('비타민 D','Vitamin D','ビタミンD'),'68%']].map(([label,value])=><div className="metric-row" key={label}><span>{label}</span><b>{value}</b><em><i style={{width:value}}/></em></div>)}</div><div className="device-note"><span>✓</span><p><b>{name || t('우리 아이', 'Your pet', 'うちの子')}{t('에게 좋은 균형이에요', ' is in good balance', 'に良いバランスです')}</b><small>{symptoms[0] ? symptomText(symptoms[0]) : t('건강', 'wellbeing', '健康')}{t(' 케어 성분을 꾸준히 기록해 주세요.', ' care: keep tracking the nutrients they receive.', 'ケアに必要な栄養を継続して記録しましょう。')}</small></p></div></div></div></div>

      <div className="chapter-copy chapter-two"><p className="story-kicker">02 · NUTRITION INSIGHT</p><h2>{language === 'en' ? <>Tell us about<br/><em>your pet first.</em></> : language === 'ja' ? <>まずは、うちの子の<br/><em>ことを教えてください。</em></> : <>우리 아이를<br/><em>먼저 알려주세요.</em></>}</h2><p>{language === 'en' ? <>Enter a few details to begin a personalized analysis.<br/>Continue scrolling to explore health records.</> : language === 'ja' ? <>プロフィールを入力して個別分析を始めましょう。<br/>スクロールすると健康記録をご覧いただけます。</> : <>정보를 입력하면 맞춤 분석을 시작할 수 있어요.<br/>스크롤을 계속하면 건강 기록을 살펴볼 수 있습니다.</>}</p></div>

      <form className="input-panel" onSubmit={event => { event.preventDefault(); startAnalysis() }}><div className="form-fields"><div className="form-heading"><small>PERSONAL PROFILE</small><h3>{t('맞춤 분석 정보', 'Personalized analysis', '個別分析の情報')}</h3><span>{t('필수 항목', 'Required', '必須')}</span></div><label>{t('반려동물 이름', 'Pet name', 'ペットの名前')}<input value={name} onChange={event => setName(event.target.value)} placeholder={t('예: 몽이', 'e.g. Mongi', '例：モンイ')} autoComplete="off"/></label><div className="form-two"><label>{t('종', 'Species', '種類')}<select value={species} onChange={event => setSpecies(event.target.value as 'DOG' | 'CAT')}><option value="DOG">🐶 {t('강아지', 'Dog', '犬')}</option><option value="CAT">🐱 {t('고양이', 'Cat', '猫')}</option></select></label><label>{t('체중', 'Weight', '体重')}<input value={weight} onChange={event => setWeight(event.target.value.replace(/[^0-9.]/g,''))} inputMode="decimal" placeholder="4.5"/><i>kg</i></label></div><label>{t('나이', 'Age', '年齢')}<input value={age} onChange={event => setAge(event.target.value.replace(/[^0-9]/g,''))} inputMode="numeric" placeholder="4"/><i>{t('살', 'years', '歳')}</i></label><fieldset><legend>{t('걱정되는 증상', 'Health concerns', '気になる症状')} <small>{t('하나 이상 선택', 'Select all that apply', '複数選択できます')}</small></legend><div className="symptom-grid">{[['관절','🦴','Joints','関節'],['피부·모질','✨','Skin & coat','皮膚・被毛'],['장 건강','◌','Digestion','お腹'],['눈 건강','◉','Eyes','目']].map(([label,icon,en,ja])=><button type="button" key={label} className={symptoms.includes(label)?'selected':''} aria-pressed={symptoms.includes(label)} onClick={() => toggleSymptom(label)}><span>{icon}</span>{language === 'en' ? en : language === 'ja' ? ja : label}<i>✓</i></button>)}</div></fieldset><button className="analyze-button" disabled={!formValid || analyzing}>{analyzing?<><span className="loader"/>{t('프로필을 저장하고 있어요', 'Saving profile…', 'プロフィールを保存中…')}</>:<>{t('맞춤 분석 시작하기', 'Start personalized analysis', '個別分析を始める')} <span>→</span></>}</button><p className="form-help">{t('입력한 프로필은 한 번 저장되어 다음 분석에서 바로 불러옵니다.', 'Your profile is saved once and available for your next analysis.', '入力したプロフィールは一度保存され、次回の分析ですぐに使えます。')}</p></div>{['NAME','AGE','CARE','DATA','BALANCE','HEALTH','84%','GOOD'].map(item=><span className="data-particle" key={item}>{item}</span>)}</form>
      <div className="result-toast" aria-live="polite"><span>✓</span><p><b>{t('분석이 완료됐어요', 'Analysis complete', '分析が完了しました')}</b><small>{t('이제 스크롤해 건강 기록으로 이어가세요.', 'Continue scrolling to explore health records.', 'スクロールして健康記録をご覧ください。')}</small></p></div>

      <div className="chapter-copy chapter-three"><p className="story-kicker">03 · DAILY RECORD</p><h2>{language === 'en' ? <>Small records,<br/><em>clearer signs of change.</em></> : language === 'ja' ? <>小さな記録が、<br/><em>健康の変化を見える形に。</em></> : <>작은 기록이 만드는<br/><em>분명한 건강 변화.</em></>}</h2><p>{language === 'en' ? <>Track meals and daily wellbeing,<br/>and find a routine that suits your pet.</> : language === 'ja' ? <>食事と毎日の体調を記録して、<br/>うちの子に合う習慣を見つけましょう。</> : <>섭취 여부와 컨디션을 매일 체크하고,<br/>우리 아이에게 맞는 루틴을 발견하세요.</>}</p><button onClick={() => go('records')}>{language === 'en' ? 'Start a health journal' : language === 'ja' ? '健康記録を始める' : '건강 기록 시작하기'} <span>↗</span></button></div>

      <div className="calendar-dashboard"><div className="calendar-head"><div><small>OCTOBER · WEEK 3</small><h3>{t('몽이의 데일리 루틴', 'Mongi’s daily routine', 'モンイの毎日の習慣')}</h3></div><span>{t('이번 주 5일 완료', '5 days completed this week', '今週は5日達成')}</span></div><div className="week-row">{days.map(([label,date,done], index)=><div className={`day-card ${done?'done':''}`} key={date}><small>{language === 'en' ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][index] : language === 'ja' ? ['月','火','水','木','金','土','日'][index] : label}</small><b>{date}</b><span>{done?'✓':''}</span></div>)}</div><div className="dashboard-grid"><div className="habit-list">{[['◌','유산균','아침 식사 후 · 1포','Probiotic','After breakfast · 1 sachet','乳酸菌','朝食後 · 1包'],['◇','오메가 3','저녁 식사 후 · 1캡슐','Omega 3','After dinner · 1 capsule','オメガ3','夕食後 · 1カプセル'],['＋','관절 케어','저녁 식사와 함께 · 1정','Joint care','With dinner · 1 tablet','関節ケア','夕食と一緒に · 1錠']].map((item,index)=><div key={item[1]}><span className="habit-icon">{item[0]}</span><p><b>{language === 'en' ? item[3] : language === 'ja' ? item[5] : item[1]}</b><small>{language === 'en' ? item[4] : language === 'ja' ? item[6] : item[2]}</small></p><button className={index===0?'checked':''}>{index===0?'✓':t('완료', 'Done', '完了')}</button></div>)}</div><div className="health-trend"><div><small>HEALTH TREND</small><b>{t('컨디션 변화', 'Wellbeing trend', '体調の変化')}</b></div><strong>+12%</strong><svg viewBox="0 0 360 130" role="img" aria-label={t('최근 7일 컨디션 상승 그래프', 'Wellbeing improved over the last 7 days', '過去7日間の体調上昇グラフ')}><path d="M8 108 C55 104,72 83,108 88 S164 105,196 68 S263 71,286 43 S332 34,352 12" className="trend-line"/><path d="M8 108 C55 104,72 83,108 88 S164 105,196 68 S263 71,286 43 S332 34,352 12 L352 130 L8 130Z" className="trend-fill"/></svg></div></div></div>
    </section>
  </main>
}
