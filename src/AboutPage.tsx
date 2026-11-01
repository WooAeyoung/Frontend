import { useState } from 'react'
import type { Page } from './Home'
import './about.css'

type AboutPageProps = { go: (page: Page) => void }

const features = [
  ['01', 'PROFILE', '아이를 먼저 이해해요', '종·나이·체중과 성장 단계를 저장해 분석의 출발점을 만듭니다.'],
  ['02', 'ANALYSIS', '먹는 것을 함께 살펴봐요', '사료와 영양제의 하루 급여량을 합산해 18개 영양성분을 한 흐름으로 확인합니다.'],
  ['03', 'JOURNAL', '결과를 하루의 기록으로', '분석 리포트와 급여·식욕·활력·체중 기록을 반려동물별로 이어갑니다.'],
]

const steps = [
  ['01', '프로필을 만들고', '우리 아이의 종, 나이, 체중과 성장기 체급을 입력합니다.'],
  ['02', '먹는 것을 더하고', '검색 제품과 라벨 직접 입력 제품을 하루 급여량 기준으로 합칩니다.'],
  ['03', '리포트로 남겨요', '분석 결과를 PDF 리포트와 일일 건강 기록으로 보관합니다.'],
]

export default function AboutPage({ go }: AboutPageProps) {
  const [videoFailed, setVideoFailed] = useState(false)
  const asset = import.meta.env.BASE_URL

  return <div className="about-page">
    <section className="about-hero">
      <div className="w about-hero-grid">
        <div className="about-copy">
          <span className="about-kicker">WOOAEYOUNG · NUTRITION JOURNAL</span>
          <h1>매일 먹는 것을<br /><em>건강의 기록으로.</em></h1>
          <p>우애영은 반려동물의 사료와 영양제를 함께 살펴보고, 복잡한 영양 정보를 보호자가 이해할 수 있는 하루의 리포트로 정리합니다.</p>
          <div className="about-actions"><button className="about-primary" onClick={() => go('analysis')}>우리 아이 분석 시작 <span>→</span></button><a href="#about-principle">우리가 일하는 방식</a></div>
          <dl className="about-proof"><div><dt>18</dt><dd>분석 영양성분</dd></div><div><dt>2</dt><dd>영양 기준 체계</dd></div><div><dt>LOCAL</dt><dd>브라우저 기록 저장</dd></div></dl>
        </div>
        <div className="about-portrait" aria-label="우애영의 반려견 영양 관찰 노트">
          <span className="about-orbit orbit-one">CALCIUM</span><span className="about-orbit orbit-two">OMEGA-3</span><span className="about-orbit orbit-three">VITAMIN</span>
          <div className="about-portrait-frame"><span className="about-portrait-index">01 / DAILY CARE</span><img src={`${asset}pets/dog-transparent.png`} alt="햇살 아래 앉아 있는 반려견" /><p>잘 먹는 오늘이<br />오래 함께할 내일이 되도록.</p></div>
        </div>
      </div>
      <div className="about-marquee" aria-hidden="true"><span>PROFILE · DAILY INTAKE · 18 NUTRIENTS · REPORT · HEALTH JOURNAL · </span><span>PROFILE · DAILY INTAKE · 18 NUTRIENTS · REPORT · HEALTH JOURNAL · </span></div>
    </section>

    <main className="w about-main">
      <section id="about-principle" className="about-manifesto" aria-labelledby="about-manifesto-title">
        <div><span className="about-section-label">01 · OUR POINT OF VIEW</span><h2 id="about-manifesto-title">좋은 선택은<br />잘 보이는 정보에서 시작됩니다.</h2></div>
        <div className="about-manifesto-copy"><p>영양제 하나만 보면 간단해 보여도, 사료와 여러 제품을 함께 먹는 순간 하루 섭취량은 복잡해집니다.</p><p>우애영은 제품을 추천하기 전에 지금 먹는 조합을 먼저 정리합니다. 확인된 값과 추정값, 기준이 있는 성분과 아직 판단할 수 없는 성분을 구분해 보여주는 것이 우리의 원칙입니다.</p><strong>정보를 더 많이 보여주는 것보다,<br />무엇을 믿고 판단할 수 있는지 분명하게.</strong></div>
      </section>

      <section className="about-feature-story" aria-labelledby="about-feature-title">
        <header><span className="about-section-label">02 · THE SERVICE</span><h2 id="about-feature-title">프로필에서 리포트까지,<br />하나의 돌봄 흐름으로.</h2></header>
        <div className="about-feature-list">{features.map(([number, label, title, description]) => <article key={number}><span>{number}</span><small>{label}</small><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>

      <section className="about-standard" aria-label="분석 기준 안내">
        <div className="about-standard-seal"><span>REFERENCE</span><b>F / N</b><small>2025 · v3</small></div>
        <div><span className="about-section-label">REFERENCE, NOT DIAGNOSIS</span><h2>기준을 밝히고,<br />모르는 값은 모른다고 표시해요.</h2><p>FEDIAF 2025와 NIAS v3 기준 버전, 데이터 검증 상태, 실제값과 추정 여부를 결과에 함께 표시합니다. 우애영의 결과는 건강 상태의 진단이나 처방을 대신하지 않습니다.</p></div>
      </section>

      <section className="about-how" aria-labelledby="about-how-title"><div className="about-how-head"><span className="about-section-label">03 · HOW IT WORKS</span><h2 id="about-how-title">오늘부터 시작하는<br />세 번의 작은 입력</h2></div><ol>{steps.map(([number, title, description]) => <li key={number}><b>{number}</b><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol></section>

      <section className="about-film" aria-labelledby="about-film-title"><div className="about-film-copy"><span className="about-section-label">04 · A MINUTE WITH US</span><h2 id="about-film-title">우애영을<br />60초로 만나보세요.</h2><p>자동 재생과 소리 없이, 원할 때 직접 재생할 수 있습니다.</p></div><div className="about-video-frame">{videoFailed ? <div className="about-video-fallback"><span>WOOAEYOUNG</span><b>영상을 불러오지 못했습니다.</b><p>잠시 후 다시 시도해 주세요.</p></div> : <video controls playsInline preload="metadata" poster={`${asset}pets/dog-transparent.png`} onError={() => setVideoFailed(true)} aria-label="우애영 서비스 소개 영상"><source src={`${asset}videos/promo.mp4`} type="video/mp4" />이 브라우저에서는 영상을 재생할 수 없습니다.</video>}</div></section>

      <section className="about-cta"><span>START WITH TODAY</span><h2>우리 아이가 오늘 먹는 것부터<br />차분히 확인해 보세요.</h2><p>분석은 한 번의 판단으로 끝나지 않고, 매일의 건강 기록으로 이어집니다.</p><div><button onClick={() => go('analysis')}>영양제 분석 시작하기 <span>→</span></button><button className="about-cta-secondary" onClick={() => go('records')}>건강 기록 살펴보기</button></div></section>
    </main>
  </div>
}
