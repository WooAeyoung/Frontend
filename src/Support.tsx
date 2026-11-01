import { useState } from 'react'
import NearestVets from './NearestVets'
import PetCompanion from './PetCompanion'
import './support.css'

const FAQ = [
  { q: '분석 결과는 진단인가요?', a: '아니요. 우애영은 입력한 급여량과 영양성분을 비교하는 정보 제공 도구이며, 질병 진단이나 처방을 제공하지 않습니다.' },
  { q: '직접 입력한 제품은 어떻게 계산되나요?', a: '제품 라벨의 1회 제공량 기준 영양성분과 하루 급여량을 곱해 하루 섭취량에 더합니다.' },
  { q: '프로필과 기록은 어디에 저장되나요?', a: '현재 버전에서는 이 기기의 브라우저에만 저장됩니다. 다른 기기나 브라우저와 자동 동기화되지 않습니다.' },
]

const TOPICS = [
  { number: '01', label: '분석 결과', question: '분석 결과는 진단인가요?' },
  { number: '02', label: '제품 직접 입력', question: '직접 입력한 제품은 어떻게 계산되나요?' },
  { number: '03', label: '기록과 저장', question: '프로필과 기록은 어디에 저장되나요?' },
  { number: '04', label: '건강 이상', question: '건강 이상이 의심되면 어떻게 해야 하나요?' },
]

function answerFor(question: string) {
  const q = question.toLowerCase()
  if (q.includes('진단') || q.includes('병') || q.includes('증상') || q.includes('수의사') || q.includes('건강 이상')) return '우애영은 진단·처방 서비스를 제공하지 않습니다. 식욕 저하, 구토, 통증 등 건강 이상이 의심되면 수의사와 상담해 주세요.'
  if (q.includes('저장') || q.includes('기록') || q.includes('프로필')) return '프로필과 분석 기록은 현재 사용 중인 브라우저에 저장됩니다. 반려동물 기록 메뉴에서 확인하거나 삭제할 수 있어요.'
  if (q.includes('급여') || q.includes('성분') || q.includes('제품')) return '등록 제품을 선택하거나 라벨 기준으로 직접 입력할 수 있어요. 직접 입력은 1회 제공량당 성분과 하루 총 급여량을 기준으로 계산합니다.'
  return 'Beta 자동 답변은 분석 이용 방법과 저장 방식만 안내합니다. 의료적 판단이 필요한 질문은 수의사에게 상담해 주세요.'
}

export default function Support() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const showAnswer = (nextQuestion: string, nextAnswer?: string) => {
    setQuestion(nextQuestion)
    setAnswer(nextAnswer ?? answerFor(nextQuestion))
  }

  return <div className="support-page support-desk-page">
    <section className="support-desk-hero">
      <div className="w support-desk-heading">
        <div><span className="support-desk-eyebrow">CARE DESK · WOOAEYOUNG</span><h1>무엇을 도와드릴까요?</h1><p>분석부터 기록까지, 궁금한 내용을 빠르게 찾을 수 있도록 안내해 드려요.</p></div>
        <div className="support-desk-status"><small>GUIDE STATUS</small><b>서비스 이용 안내</b><span>24시간 바로 확인 가능</span></div>
      </div>
      <div className="w support-topic-grid">{TOPICS.map(topic => <button key={topic.number} onClick={() => showAnswer(topic.question)}><i>{topic.number}</i><b>{topic.label}</b><span>→</span></button>)}</div>
    </section>

    <main className="w support-desk-main">
      <div className="support-desk-grid">
        <section className="support-desk-card support-desk-chat" aria-labelledby="quick-answer-title">
          <span className="support-card-kicker">QUICK ANSWER</span><h2 id="quick-answer-title">궁금한 점을 입력해 주세요</h2><p>FAQ에 등록된 서비스 이용 방법을 바로 찾아드려요.</p>
          <label className="support-question-label" htmlFor="support-question">궁금한 점</label>
          <div className="support-ask-row"><input id="support-question" value={question} onChange={event => setQuestion(event.target.value)} placeholder="예: 정보 부족은 무슨 뜻인가요?" onKeyDown={event => { if (event.key === 'Enter' && question.trim()) setAnswer(answerFor(question)) }} /><button onClick={() => setAnswer(answerFor(question))} disabled={!question.trim()}>답변 확인</button></div>
          {answer && <div className="support-desk-answer" role="status"><b>우애영 안내</b><p>{answer}</p></div>}
        </section>
        <section className="support-desk-card support-desk-faq" aria-labelledby="popular-help-title">
          <span className="support-card-kicker">MOST ASKED</span><h2 id="popular-help-title">자주 찾는 안내</h2><p>보호자들이 많이 확인한 질문이에요.</p>
          <div className="support-faq-list">{FAQ.map(item => <button key={item.q} onClick={() => showAnswer(item.q, item.a)}><b>{item.q}</b><span>→</span></button>)}</div>
        </section>
      </div>
      <section className="support-medical-banner"><div><b>건강 이상이 의심되나요?</b><p>식욕 저하, 반복적인 구토, 통증이 있다면 자동 안내보다 수의사 상담을 먼저 권해요.</p></div><button onClick={() => document.querySelector('#nearby-vets')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>내 주변 동물병원 찾기</button></section>
      <p className="support-desk-note">자동 답변은 미리 정의된 FAQ를 바탕으로 안내합니다. 수의학적 진단·치료·처방을 대체하지 않습니다.</p>
      <div id="nearby-vets" className="support-vets-anchor"><NearestVets /></div>
      <PetCompanion />
    </main>
  </div>
}
