import { useMemo, useState } from 'react'
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

export default function Support() {
  const [category, setCategory] = useState(CATEGORIES[0])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(GUIDES[0])

  const guides = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return GUIDES.filter(guide => keyword
      ? `${guide.title} ${guide.summary} ${guide.category}`.toLowerCase().includes(keyword)
      : guide.category === category)
  }, [category, query])

  return <div className="support-page support-library-page">
    <main className="w support-library-main">
      <section className="support-library-head">
        <div><span>WOOAEYOUNG · HELP LIBRARY</span><h1>돌봄 가이드</h1><p>잘 모르겠는 부분부터 차근히 살펴보세요.</p></div>
        <label className="support-library-search"><span className="sr-only">고객센터 검색</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="궁금한 내용을 검색하세요" /><b>검색</b></label>
      </section>

      <div className="support-library-layout">
        <aside className="support-library-categories" aria-label="도움말 분류">
          {CATEGORIES.map(item => <button className={category === item && !query ? 'active' : ''} key={item} onClick={() => { setCategory(item); setQuery('') }}><span>{item}</span><b>{String(GUIDES.filter(guide => guide.category === item).length).padStart(2, '0')}</b></button>)}
          <div className="support-library-beta"><small>QUICK GUIDE</small><b>찾는 내용이 없나요?</b><p>현재 안내는 서비스 이용 방법을 중심으로 제공해요.</p></div>
        </aside>

        <section className="support-library-articles" aria-labelledby="support-guide-title">
          <div className="support-library-title"><div><span>{query ? 'SEARCH RESULT' : 'SELECTED TOPIC'}</span><h2 id="support-guide-title">{query ? `“${query}” 검색 결과` : category}</h2></div><small>{guides.length} ARTICLES</small></div>
          <div className="support-guide-list">
            {guides.map((guide, index) => <button key={guide.title} className={selected.title === guide.title ? 'selected' : ''} onClick={() => setSelected(guide)}><i>{String(index + 1).padStart(2, '0')}</i><div><b>{guide.title}</b><p>{guide.summary}</p></div><span>→</span></button>)}
            {guides.length === 0 && <div className="support-empty"><b>검색 결과가 없어요.</b><p>다른 단어로 검색하거나 왼쪽 주제를 선택해 주세요.</p></div>}
          </div>

          <article className="support-guide-answer" aria-live="polite"><span>GUIDE ANSWER</span><h3>{selected.title}</h3><p>{selected.answer}</p></article>

          <article className="support-library-featured"><div><small>FIRST ANALYSIS</small><h3>처음 분석하는 보호자를 위한 안내</h3></div><p>프로필 작성부터 제품 선택, 직접 입력, 결과 저장까지 실제 화면의 순서대로 확인하세요. 분석 결과는 진단이나 처방을 대신하지 않습니다.</p></article>
        </section>
      </div>

      <section className="support-medical-guide"><div><span>NEARBY CARE</span><b>건강 이상이 의심되나요?</b><p>식욕 저하, 반복적인 구토, 통증이 있다면 서비스 안내보다 수의사 상담을 먼저 권해요.</p></div><button onClick={() => document.querySelector('#nearby-vets')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>내 주변 동물병원 찾기</button></section>
      <div id="nearby-vets" className="support-vets-anchor"><NearestVets /></div>
      <PetCompanion />
    </main>
  </div>
}
