import { useState } from 'react'
import type { Page } from './Home'
import './about.css'

type AboutPageProps = { go: (page: Page) => void; language?: 'ko' | 'en' | 'ja' }

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

const principles = [
  ['01', '근거를 밝힙니다', '적용한 기준 버전과 데이터 검증 상태를 결과에 함께 표시합니다.'],
  ['02', '모르는 것은 남깁니다', '제품에 없는 값이나 추정할 수 없는 성분을 실제 0으로 단정하지 않습니다.'],
  ['03', '기록으로 이어갑니다', '한 번의 영양 분석을 매일의 건강 변화와 다음 돌봄으로 연결합니다.'],
]

const COPY = {
  en: {
    hero: <>Clearer,<br />not louder.</>, intro: 'When food and supplements overlap, small numbers can matter. Wooaeyoung separates what we know from what is still unknown, helping you understand today’s choices.', start: 'Analyze my pet', principles: 'Three principles we believe in', quote: <>More information is not always better.<br />It becomes useful when it helps you decide.</>,
    principle: [['We show our sources', 'We include the applied standard version and data verification status.'], ['We keep unknowns visible', 'Missing or unestimated nutrients are never treated as zero.'], ['We connect analysis to daily care', 'Nutrition results lead into everyday health records and next steps.']],
    service: <>From profile to report,<br />one connected care journey.</>, features: [['Understand your pet first', 'Save species, age, weight, and life stage to begin an analysis.'], ['Review the whole diet', 'Combine daily food and supplement amounts across 18 nutrients.'], ['Keep a daily journal', 'Continue with analysis reports and feeding, appetite, energy, and weight records.']],
    standard: <>We show the standard<br />and mark what is unknown.</>, standardText: 'Results include FEDIAF 2025 and NIAS v3 versions, verification status, and whether values are measured or estimated. Wooaeyoung does not diagnose or prescribe.', how: <>Three small steps<br />to get started today</>, steps: [['Create a profile', 'Enter your pet’s species, age, weight, and adult size if still growing.'], ['Add what they eat', 'Combine searched products and label entries by daily serving.'], ['Save a report', 'Keep the analysis as a PDF report and daily health record.']],
    film: <>Meet Wooaeyoung<br />in 60 seconds.</>, filmText: 'No autoplay or sound. Play it whenever you like.', videoFallback: 'The video could not be loaded.', retry: 'Please try again later.', cta: <>Start with what<br />your pet eats today.</>, ctaText: 'Analysis can continue as a daily health record.', analyze: 'Start nutrition analysis', records: 'View health records', imageAlt: 'A dog and cat running together outdoors', imageCaption: <>May a well-fed today<br />be a tomorrow together.</>
  },
  ja: {
    hero: <>情報を増やすより、<br /><em>もっと分かりやすく。</em></>, intro: 'フードとサプリメントが重なると、小さな数値も大切なサインになります。分かっていることと不明なことを分け、今日の選択を理解できるようお手伝いします。', start: 'うちの子を分析する', principles: '私たちが大切にする三つの原則', quote: <>情報は多ければよいのではなく、<br />判断に役立つときに価値があります。</>,
    principle: [['根拠を示します', '適用した基準のバージョンとデータの検証状況を表示します。'], ['不明な値は不明のままにします', '記載のない成分や推定できない値をゼロとみなしません。'], ['毎日のケアにつなげます', '栄養分析を日々の健康記録と次のケアにつなげます。']],
    service: <>プロフィールからレポートまで、<br />ひとつのケアの流れに。</>, features: [['まず、うちの子を知る', '種類・年齢・体重・成長段階を保存して分析を始めます。'], ['食べているものを一緒に確認', 'フードとサプリの一日量を合算し、18項目の栄養素を確認します。'], ['毎日の記録につなげる', '分析レポートと給餌・食欲・活力・体重の記録を続けられます。']],
    standard: <>基準を明示し、<br />不明な値もそのまま表示します。</>, standardText: 'FEDIAF 2025・NIAS v3の基準バージョン、検証状況、実測値と推定値を表示します。診断や治療の代わりにはなりません。', how: <>今日から始める<br />三つの小さなステップ</>, steps: [['プロフィールを作成', '種類・年齢・体重、成長期の場合は成犬・成猫時のサイズを入力します。'], ['食べているものを追加', '検索した商品やラベルの情報を一日量で登録します。'], ['レポートに保存', '分析結果をPDFと毎日の健康記録に保存します。']],
    film: <>60秒で知る<br />ウエヨン。</>, filmText: '自動再生や音声はありません。お好きなときに再生できます。', videoFallback: '動画を読み込めませんでした。', retry: 'しばらくしてからもう一度お試しください。', cta: <>今日食べたものから、<br />一緒に確認しましょう。</>, ctaText: '一度の分析を毎日の健康記録につなげます。', analyze: '栄養分析を始める', records: '健康記録を見る', imageAlt: '芝生の上を一緒に走る犬と猫', imageCaption: <>今日の健やかな食事が、<br />明日も一緒に過ごす力に。</>
  }
} as const

export default function AboutPage({ go, language = 'ko' }: AboutPageProps) {
  const [videoFailed, setVideoFailed] = useState(false)
  const asset = import.meta.env.BASE_URL
  const t = language === 'ko' ? null : COPY[language]
  const principleCopy = t?.principle
  const featureCopy = t?.features
  const stepCopy = t?.steps

  return <div className="about-page">
    <section className="about-hero">
      <div className="w about-hero-grid">
        <div className="about-copy">
          <span className="about-kicker">OUR POINT OF VIEW · 2026</span>
          <h1>{t ? t.hero : <>더 많이<br />알려주기보다,<br /><em>더 분명하게.</em></>}</h1>
          <p>{t?.intro ?? '사료와 영양제가 겹치면 작은 숫자도 중요한 신호가 됩니다. 우애영은 확인할 수 있는 것과 아직 모르는 것을 구분해, 보호자가 오늘의 선택을 이해하도록 돕습니다.'}</p>
          <div className="about-actions"><button className="about-primary" onClick={() => go('analysis')}>{t?.start ?? '우리 아이 분석 시작'} <span>→</span></button><a href="#about-principle">{t?.principles ?? '우리가 일하는 방식'}</a></div>
          <dl className="about-proof"><div><dt>18</dt><dd>{language === 'en' ? 'nutrients analyzed' : language === 'ja' ? '分析栄養素' : '분석 영양성분'}</dd></div><div><dt>2</dt><dd>{language === 'en' ? 'nutrition standards' : language === 'ja' ? '栄養基準' : '영양 기준 체계'}</dd></div><div><dt>LOCAL</dt><dd>{language === 'en' ? 'records saved in browser' : language === 'ja' ? 'ブラウザーに記録を保存' : '브라우저 기록 저장'}</dd></div></dl>
        </div>
        <div className="about-portrait" aria-label={t?.imageAlt ?? '야외에서 함께 달리는 개와 고양이'}>
          <div className="about-portrait-frame">
            <img className="about-photo-backdrop" src={`${asset}images/about-dog-cat-running.jpg`} alt="" aria-hidden="true" />
            <img className="about-photo-main" src={`${asset}images/about-dog-cat-running.jpg`} alt={t?.imageAlt ?? '잔디밭에서 함께 달리는 개와 고양이'} fetchPriority="high" />
            <div className="about-photo-shade" aria-hidden="true" />
            <span className="about-portrait-index">01 / DAILY CARE</span>
            <p>{t?.imageCaption ?? <>잘 먹는 오늘이<br />오래 함께할 내일이 되도록.</>}</p>
            <a className="about-photo-credit" href="https://unsplash.com/photos/f8QVn7EcJ1Y" target="_blank" rel="noreferrer">Photo · 拾壹 / Unsplash</a>
          </div>
        </div>
      </div>
      <div className="about-marquee" aria-hidden="true"><div className="about-marquee-track"><span>PROFILE · DAILY INTAKE · 18 NUTRIENTS · REPORT · HEALTH JOURNAL · </span><span>PROFILE · DAILY INTAKE · 18 NUTRIENTS · REPORT · HEALTH JOURNAL · </span><span>PROFILE · DAILY INTAKE · 18 NUTRIENTS · REPORT · HEALTH JOURNAL · </span><span>PROFILE · DAILY INTAKE · 18 NUTRIENTS · REPORT · HEALTH JOURNAL · </span></div></div>
    </section>

    <main className="w about-main">
      <section id="about-principle" className="about-manifesto" aria-labelledby="about-manifesto-title">
        <div><span className="about-section-label">01 · MANIFESTO</span><h2 id="about-manifesto-title">{t?.principles ?? <>우리가 믿는<br />세 가지 원칙</>}</h2></div>
        <div className="about-manifesto-copy">
          <strong className="about-manifesto-quote">{t?.quote ?? <>정보는 많을수록 좋은 것이 아니라,<br />판단할 수 있을 때 비로소 유용합니다.</>}</strong>
          <div className="about-principle-grid">{principles.map(([number, title, description], index) => <article key={number}><span>{number}</span><h3>{principleCopy?.[index]?.[0] ?? title}</h3><p>{principleCopy?.[index]?.[1] ?? description}</p></article>)}</div>
        </div>
      </section>

      <section className="about-feature-story" aria-labelledby="about-feature-title">
        <header><span className="about-section-label">02 · THE SERVICE</span><h2 id="about-feature-title">{t?.service ?? <>프로필에서 리포트까지,<br />하나의 돌봄 흐름으로.</>}</h2></header>
        <div className="about-feature-list">{features.map(([number, label, title, description], index) => <article key={number}><span>{number}</span><small>{label}</small><h3>{featureCopy?.[index]?.[0] ?? title}</h3><p>{featureCopy?.[index]?.[1] ?? description}</p></article>)}</div>
      </section>

      <section className="about-standard" aria-label="분석 기준 안내">
        <div className="about-standard-seal"><span>REFERENCE</span><b>F / N</b><small>2025 · v3</small></div>
        <div><span className="about-section-label">REFERENCE, NOT DIAGNOSIS</span><h2>{t?.standard ?? <>기준을 밝히고,<br />모르는 값은 모른다고 표시해요.</>}</h2><p>{t?.standardText ?? 'FEDIAF 2025와 NIAS v3 기준 버전, 데이터 검증 상태, 실제값과 추정 여부를 결과에 함께 표시합니다. 우애영의 결과는 건강 상태의 진단이나 처방을 대신하지 않습니다.'}</p></div>
      </section>

      <section className="about-how" aria-labelledby="about-how-title"><div className="about-how-head"><span className="about-section-label">03 · HOW IT WORKS</span><h2 id="about-how-title">{t?.how ?? <>오늘부터 시작하는<br />세 번의 작은 입력</>}</h2></div><ol>{steps.map(([number, title, description], index) => <li key={number}><b>{number}</b><div><h3>{stepCopy?.[index]?.[0] ?? title}</h3><p>{stepCopy?.[index]?.[1] ?? description}</p></div></li>)}</ol></section>

      <section className="about-film" aria-labelledby="about-film-title"><div className="about-film-copy"><span className="about-section-label">04 · A MINUTE WITH US</span><h2 id="about-film-title">{t?.film ?? <>우애영을<br />60초로 만나보세요.</>}</h2><p>{t?.filmText ?? '자동 재생과 소리 없이, 원할 때 직접 재생할 수 있습니다.'}</p></div><div className="about-video-frame">{videoFailed ? <div className="about-video-fallback"><span>WOOAEYOUNG</span><b>{t?.videoFallback ?? '영상을 불러오지 못했습니다.'}</b><p>{t?.retry ?? '잠시 후 다시 시도해 주세요.'}</p></div> : <video controls playsInline preload="metadata" poster={`${asset}pets/dog-transparent.png`} onError={() => setVideoFailed(true)} aria-label={language === 'en' ? 'Wooaeyoung service introduction video' : language === 'ja' ? 'ウエヨンのサービス紹介動画' : '우애영 서비스 소개 영상'}><source src={`${asset}videos/promo.mp4`} type="video/mp4" />{language === 'en' ? 'Your browser cannot play this video.' : language === 'ja' ? 'このブラウザーでは動画を再生できません。' : '이 브라우저에서는 영상을 재생할 수 없습니다.'}</video>}</div></section>

      <section className="about-cta"><span>START WITH TODAY</span><h2>{t?.cta ?? <>우리 아이가 오늘 먹는 것부터<br />차분히 확인해 보세요.</>}</h2><p>{t?.ctaText ?? '분석은 한 번의 판단으로 끝나지 않고, 매일의 건강 기록으로 이어집니다.'}</p><div><button onClick={() => go('analysis')}>{t?.analyze ?? '영양제 분석 시작하기'} <span>→</span></button><button className="about-cta-secondary" onClick={() => go('records')}>{t?.records ?? '건강 기록 살펴보기'}</button></div></section>
    </main>
  </div>
}
