import { useEffect, useMemo, useRef, useState } from 'react'
import NearestVets from './NearestVets'
import PetCompanion from './PetCompanion'
import './support.css'

const GUIDES = [
  { category: '분석 결과 읽기', title: '‘정보 부족’은 무슨 뜻인가요?', summary: '값이 확인되지 않은 성분을 실제 0과 구분하는 방법', answer: '제품 라벨이나 데이터에 값이 없는 성분은 실제 0으로 단정하지 않고 ‘정보 부족’으로 표시합니다. 정확한 판단을 위해 제품 라벨의 해당 성분을 직접 입력해 주세요.' },
  { category: '분석 결과 읽기', title: 'FEDIAF와 NIAS 기준은 어떻게 다른가요?', summary: '분석 화면의 기준 버전과 검증 상태 이해하기', answer: '분석 화면에서 선택한 기준과 버전을 함께 표시합니다. 결과를 볼 때에는 기준 이름뿐 아니라 검증 상태와 실제값·추정값 여부도 같이 확인해 주세요.' },
  { category: '분석 결과 읽기', title: '부족·주의·과다 판정은 어떻게 정해지나요?', summary: '하한, 주의선, 상한을 읽는 방법', answer: '입력한 하루 섭취량을 선택한 기준의 하한·주의선·상한과 비교합니다. 상한이 없는 성분은 과다 안전성을 확정하지 않고 기준 없음 또는 판단 제한으로 안내합니다.' },
  { category: '제품 입력하기', title: '직접 입력한 제품은 어떻게 계산되나요?', summary: '1회 제공량과 하루 횟수가 합계에 반영되는 방식', answer: '제품 라벨의 1회 제공량 기준 영양성분에 하루 급여 횟수를 곱해 하루 섭취량에 더합니다.' },
  { category: '프로필과 기록', title: '프로필과 기록은 어디에 저장되나요?', summary: '브라우저 저장과 다른 기기 동기화 여부', answer: '현재 버전에서는 사용 중인 브라우저에 저장됩니다. 다른 기기나 브라우저와 자동으로 동기화되지 않습니다.' },
  { category: '프로필과 기록', title: '분석 결과를 PDF로 저장하고 싶어요', summary: '기록 화면에서 리포트를 열고 보관하는 방법', answer: '분석 결과를 기록으로 저장한 뒤 반려동물 기록에서 리포트 보기를 선택하면 PDF로 인쇄하거나 저장할 수 있습니다.' },
  { category: '기준과 안전 안내', title: '분석 결과는 진단인가요?', summary: '정보 제공과 수의학적 진단의 차이', answer: '아니요. 우애영은 입력한 급여량과 영양성분을 비교하는 정보 제공 도구이며 질병 진단이나 처방을 제공하지 않습니다.' },
]

const CATEGORIES = ['분석 결과 읽기', '제품 입력하기', '프로필과 기록', '기준과 안전 안내']

const TRANSLATIONS = {
  en: {
    categories: ['Reading results', 'Adding products', 'Profiles & records', 'Standards & safety'],
    guides: [
      ['What does “insufficient information” mean?', 'How unknown nutrient values differ from zero', 'Nutrients without a value on the label or in the data are marked “insufficient information,” not assumed to be zero. For a more accurate result, enter the nutrient value from the product label.'],
      ['How are FEDIAF and NIAS different?', 'Understanding the standard version and verification status', 'The selected standard and version are shown in the analysis. Check the verification status and whether each value is measured or estimated as well as the standard name.'],
      ['How are low, caution, and high results determined?', 'How to read minimums, caution thresholds, and upper limits', 'Daily intake is compared with the minimum, caution threshold, and upper limit in the selected standard. If a nutrient has no upper limit, excess safety is not confirmed; the result will say that no limit is available or that assessment is limited.'],
      ['How are manually entered products calculated?', 'How serving size and daily frequency affect totals', 'The nutrient amount per serving on the product label is multiplied by the number of daily servings and added to the daily intake.'],
      ['Where are profiles and records saved?', 'Browser storage and syncing across devices', 'In the current version, data is saved in the browser you are using. It does not sync automatically to other devices or browsers.'],
      ['How can I save an analysis as a PDF?', 'Opening and saving a report from Pet records', 'Save the analysis as a record, then choose View report in Pet records to print or save it as a PDF.'],
      ['Is an analysis a diagnosis?', 'The difference between information and veterinary diagnosis', 'No. Wooaeyoung compares the intake and nutrient values you enter. It does not diagnose conditions or provide treatment.'],
    ],
    hero: 'Care guide', intro: 'Find clear, step-by-step answers to your questions.', searchLabel: 'Search Support', placeholder: 'Search for a topic', search: 'Search', helpCategories: 'Help topics', quick: 'QUICK GUIDE', noTopic: 'Can’t find what you need?', quickText: 'These guides focus on how to use the service.', searchResult: 'Search results for', selectedTopic: 'SELECTED TOPIC', articles: 'ARTICLES', noResults: 'No results found.', tryOther: 'Try another word or choose a topic on the left.', answer: 'GUIDE ANSWER', first: 'FIRST ANALYSIS', firstTitle: 'A guide for your first analysis', firstText: 'Follow the on-screen steps to create a profile, choose or enter products, and save your results. An analysis is not a diagnosis or prescription.', nearby: 'NEARBY CARE', healthConcern: 'Concerned about your pet’s health?', medicalText: 'If your pet has reduced appetite, repeated vomiting, or pain, please consult a veterinarian first.', findVet: 'Find a nearby vet', companion: 'Shall we take a look together?', nearbyTitle: 'Veterinarians near me', nearbyText: 'Find nearby clinics based on your current location and view them on a map.', locate: 'Use my current location', locating: 'Checking location…', mapTitle: 'Map of nearby veterinary clinics', openMap: 'Open map ↗', noPhone: 'Phone number unavailable', unsupported: 'This browser does not support location. Search for nearby veterinarians in your map app.', denied: 'Location access is off. Allow location in this site’s settings, then try again.', timeout: 'Location check timed out. Check your GPS or network and try again.', unavailable: 'Could not get your location. Check that location services are turned on.', failed: 'Could not load veterinary information.'
  },
  ja: {
    categories: ['分析結果の見方', '製品を入力する', 'プロフィールと記録', '基準と安全について'],
    guides: [
      ['「情報不足」とは何ですか？', '値が不明な成分とゼロの違い', 'ラベルやデータに値がない成分は、実際にゼロとは断定せず「情報不足」と表示します。より正確に確認するには、製品ラベルに記載された成分値を入力してください。'],
      ['FEDIAFとNIASの基準はどう違いますか？', '分析画面の基準バージョンと検証状況について', '分析画面には選択した基準とバージョンが表示されます。基準名だけでなく、検証状況や実測値・推定値の区別も確認してください。'],
      ['不足・注意・過剰はどのように判定されますか？', '下限・注意ライン・上限の見方', '入力された一日の摂取量を、選択した基準の下限・注意ライン・上限と比較します。上限がない成分は過剰時の安全性を断定せず、上限なしまたは判定制限として案内します。'],
      ['手入力した製品はどのように計算されますか？', '1回量と一日の回数が合計に反映される仕組み', '製品ラベルに記載された1回分の栄養成分に、一日の給餌回数を掛けて摂取量に加算します。'],
      ['プロフィールや記録はどこに保存されますか？', 'ブラウザー保存と他の端末との同期について', '現在のバージョンでは、使用中のブラウザーに保存されます。他の端末やブラウザーには自動同期されません。'],
      ['分析結果をPDFで保存するには？', 'ペットの記録からレポートを開いて保存する方法', '分析結果を記録として保存し、ペットの記録画面で「レポートを見る」を選ぶと、印刷またはPDF保存ができます。'],
      ['分析結果は診断ですか？', '情報提供と獣医師による診断の違い', 'いいえ。ウエヨンは入力された給餌量と栄養成分を比較する情報提供ツールです。病気の診断や処方は行いません。'],
    ],
    hero: 'ケアガイド', intro: '分からないことを、ひとつずつ確認してみましょう。', searchLabel: 'サポートを検索', placeholder: '知りたい内容を検索', search: '検索', helpCategories: 'ヘルプの分類', quick: 'QUICK GUIDE', noTopic: 'お探しの内容が見つかりませんか？', quickText: 'サービスの使い方を中心にご案内しています。', searchResult: 'の検索結果', selectedTopic: '選択中のトピック', articles: '件の記事', noResults: '検索結果がありません。', tryOther: '別の言葉で検索するか、左側のトピックを選んでください。', answer: 'ガイドの回答', first: '初めての分析', firstTitle: '初めて分析する方へのご案内', firstText: '画面の順にプロフィールを作成し、製品を選択または入力して、結果を保存できます。分析結果は診断や処方に代わるものではありません。', nearby: 'NEARBY CARE', healthConcern: '体調に気になる点がありますか？', medicalText: '食欲低下、繰り返す嘔吐、痛みがある場合は、サービスの案内より先に獣医師へご相談ください。', findVet: '近くの動物病院を探す', companion: '一緒に見てみましょうか？', nearbyTitle: '近くの動物病院', nearbyText: '現在地をもとに近くの病院を探し、地図で確認できます。', locate: '現在地から探す', locating: '位置を確認中…', mapTitle: '近くの動物病院の地図', openMap: '地図を開く ↗', noPhone: '電話番号の情報がありません', unsupported: 'このブラウザーでは位置情報を利用できません。地図アプリで近くの動物病院を検索してください。', denied: '位置情報へのアクセスがオフです。サイト設定で位置情報を許可してから、もう一度お試しください。', timeout: '位置情報の確認がタイムアウトしました。GPSやネットワークを確認して再度お試しください。', unavailable: '現在地を取得できません。端末の位置情報サービスが有効か確認してください。', failed: '動物病院の情報を読み込めませんでした。'
  }
} as const

export default function Support({ language = 'ko' }: { language?: 'ko' | 'en' | 'ja' }) {
  const t = language === 'ko' ? null : TRANSLATIONS[language]
  const [category, setCategory] = useState(CATEGORIES[0])
  const [query, setQuery] = useState('')
  const queryRef = useRef(query)
  queryRef.current = query
  const [selected, setSelected] = useState(GUIDES[0])

  const getGuideIndex = (guide: typeof GUIDES[number]) => GUIDES.findIndex(item => item.title === guide.title)
  const displayCategory = (item: string) => t ? t.categories[CATEGORIES.indexOf(item)] : item
  const displayGuide = (guide: typeof GUIDES[number], field: 0 | 1 | 2) => {
    const translation = t?.guides[getGuideIndex(guide)]
    return translation?.[field] ?? guide[['title', 'summary', 'answer'][field] as 'title' | 'summary' | 'answer']
  }

  const guides = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return GUIDES.filter(guide => keyword
      ? `${guide.title} ${guide.summary} ${guide.category} ${displayGuide(guide, 0)} ${displayGuide(guide, 1)} ${displayCategory(guide.category)}`.toLowerCase().includes(keyword)
      : guide.category === category)
  }, [category, query, language])

  useEffect(() => {
    let timers: number[] = []
    let typing = 0
    let original = ''
    let running = false
    const stop = () => {
      if (!running) return
      running = false
      window.clearInterval(typing)
      timers.forEach(window.clearTimeout)
      timers = []
      setQuery(original)
    }
    const demo = () => {
      stop()
      running = true
      original = queryRef.current
      const phrase = language === 'en' ? 'analysis results' : language === 'ja' ? '分析結果' : '분석 결과'
      const runCycle = (): void => {
        if (!running) return
        let length = 0
        setQuery('')
        typing = window.setInterval(() => {
          length += 1
          setQuery(phrase.slice(0, length))
          if (length >= phrase.length) {
            window.clearInterval(typing)
            timers.push(window.setTimeout(runCycle, 2_200))
          }
        }, 180)
      }
      runCycle()
    }
    const pauseDemo = () => {
      running = false
      window.clearInterval(typing)
      timers.forEach(window.clearTimeout)
      timers = []
    }
    window.addEventListener('wooaeyoung:pause-tour-demos', pauseDemo)
    window.addEventListener('wooaeyoung:demo-support-search', demo)
    window.addEventListener('wooaeyoung:cancel-support-search', stop)
    return () => { stop(); window.removeEventListener('wooaeyoung:pause-tour-demos', pauseDemo); window.removeEventListener('wooaeyoung:demo-support-search', demo); window.removeEventListener('wooaeyoung:cancel-support-search', stop) }
  }, [language])

  return <div className="support-page support-library-page">
    <main className="w support-library-main">
      <section className="support-library-head">
        <div><span>WOOAEYOUNG · HELP LIBRARY</span><h1>{t?.hero ?? '돌봄 가이드'}</h1><p>{t?.intro ?? '잘 모르겠는 부분부터 차근히 살펴보세요.'}</p></div>
        <label className="support-library-search"><span className="sr-only">{t?.searchLabel ?? '고객센터 검색'}</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t?.placeholder ?? '궁금한 내용을 검색하세요'} /><b>{t?.search ?? '검색'}</b></label>
      </section>

      <div className="support-library-layout">
        <aside className="support-library-categories" aria-label={t?.helpCategories ?? '도움말 분류'}>
          {CATEGORIES.map(item => <button className={category === item && !query ? 'active' : ''} key={item} onClick={() => { setCategory(item); setQuery('') }}><span>{displayCategory(item)}</span><b>{String(GUIDES.filter(guide => guide.category === item).length).padStart(2, '0')}</b></button>)}
          <div className="support-library-beta"><small>{t?.quick ?? 'QUICK GUIDE'}</small><b>{t?.noTopic ?? '찾는 내용이 없나요?'}</b><p>{t?.quickText ?? '현재 안내는 서비스 이용 방법을 중심으로 제공해요.'}</p></div>
        </aside>

        <section className="support-library-articles" aria-labelledby="support-guide-title">
          <div className="support-library-title"><div><span>{query ? (language === 'en' ? 'SEARCH RESULTS' : language === 'ja' ? '検索結果' : 'SEARCH RESULT') : (t?.selectedTopic ?? 'SELECTED TOPIC')}</span><h2 id="support-guide-title">{query ? language === 'en' ? `Results for “${query}”` : language === 'ja' ? `「${query}」${t?.searchResult}` : `“${query}” 검색 결과` : displayCategory(category)}</h2></div><small>{guides.length} {t?.articles ?? 'ARTICLES'}</small></div>
          <div className="support-guide-list">
            {guides.map((guide, index) => <button key={guide.title} className={selected.title === guide.title ? 'selected' : ''} onClick={() => setSelected(guide)}><i>{String(index + 1).padStart(2, '0')}</i><div><b>{displayGuide(guide, 0)}</b><p>{displayGuide(guide, 1)}</p></div><span>→</span></button>)}
            {guides.length === 0 && <div className="support-empty"><b>{t?.noResults ?? '검색 결과가 없어요.'}</b><p>{t?.tryOther ?? '다른 단어로 검색하거나 왼쪽 주제를 선택해 주세요.'}</p></div>}
          </div>

          <article className="support-guide-answer" aria-live="polite"><span>{t?.answer ?? 'GUIDE ANSWER'}</span><h3>{displayGuide(selected, 0)}</h3><p>{displayGuide(selected, 2)}</p></article>

          <article className="support-library-featured"><div><small>{t?.first ?? 'FIRST ANALYSIS'}</small><h3>{t?.firstTitle ?? '처음 분석하는 보호자를 위한 안내'}</h3></div><p>{t?.firstText ?? '프로필 작성부터 제품 선택, 직접 입력, 결과 저장까지 실제 화면의 순서대로 확인하세요. 분석 결과는 진단이나 처방을 대신하지 않습니다.'}</p></article>
        </section>
      </div>

      <section className="support-medical-guide"><div><span>{t?.nearby ?? 'NEARBY CARE'}</span><b>{t?.healthConcern ?? '건강 이상이 의심되나요?'}</b><p>{t?.medicalText ?? '식욕 저하, 반복적인 구토, 통증이 있다면 서비스 안내보다 수의사 상담을 먼저 권해요.'}</p></div><button onClick={() => document.querySelector('#nearby-vets')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{t?.findVet ?? '내 주변 동물병원 찾기'}</button></section>
      <div id="nearby-vets" className="support-vets-anchor"><NearestVets language={language} /></div>
      <PetCompanion language={language} />
    </main>
  </div>
}
