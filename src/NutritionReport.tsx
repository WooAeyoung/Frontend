import type { Analysis, Profile } from './api'
import type { SavedRecord } from './Records'
import { formatNumber } from './format/number'
import { createPortal } from 'react-dom'

const STATUS: Record<string, string> = {
  DEFICIENT: '부족', ADEQUATE: '적정', ADEQUATE_NO_UPPER_LIMIT: '적정 · 상한 없음',
  CAUTION: '주의', EXCESS: '과다', NO_STANDARD: '기준 없음', UNSUPPORTED: '분석 불가',
  UNVERIFIED_STANDARD: '기준 검증 대기', INSUFFICIENT_DATA: '정보 부족', UNIT_CONVERSION_UNSUPPORTED: '단위 환산 불가',
}

const ratioLabel = (status?: string) => ({ LOW: '낮음', HIGH: '높음', ADEQUATE: '적정', UNAVAILABLE: '계산 불가' }[status ?? ''] ?? status ?? '—')

export default function NutritionReport({ record, onClose }: { record: SavedRecord; onClose: () => void }) {
  const analysis = record.analysisSnapshot
  const profile = record.profileSnapshot
  const created = new Date(record.date).toLocaleString('ko-KR')
  const ratio = analysis?.ratios.calciumPhosphorus
  const print = () => window.print()
  return createPortal(<div className="report-overlay" role="dialog" aria-modal="true" aria-label={`${record.name} 영양 분석 리포트`}>
    <div className="report-toolbar"><button className="btn ghost" onClick={onClose}>닫기</button><span>인쇄 화면에서 대상을 ‘PDF로 저장’으로 선택하세요.</span><button className="btn" onClick={print}>PDF로 저장</button></div>
    <article className="nutrition-report" id={`report-${record.id}`}>
      <header className="report-cover"><div><span>WOOAEYOUNG NUTRITION JOURNAL</span><h1>{record.name}의 하루를<br />영양으로 읽습니다.</h1><p>사료와 영양제의 하루 섭취량을 분석 당시 기준과 비교한 리포트입니다.</p></div><aside><b>{analysis ? analysis.summary.adequate ?? 0 : record.summary.adequate ?? 0}</b><small>적정 성분</small></aside></header>
      <section className="report-meta"><div><small>REPORT DATE</small><b>{created}</b></div><div><small>PROFILE</small><b>{profile ? `${profile.species === 'DOG' ? '강아지' : '고양이'} · ${profile.weightKg}kg · ${profile.age.value}${profile.age.unit === 'MONTH' ? '개월' : '주'}` : record.species === 'DOG' ? '강아지' : '고양이'}</b></div><div><small>STANDARD</small><b>{record.standardVersion ?? '저장 당시 기준'}</b></div></section>
      <section className="report-section"><div className="report-section-title"><span>01</span><div><h2>분석 요약</h2><p>분석 당시 판정 결과를 그대로 보존했습니다.</p></div></div><div className="report-summary"><div><b>{record.summary.deficient ?? 0}</b><span>부족</span></div><div><b>{record.summary.adequate ?? 0}</b><span>적정</span></div><div><b>{record.summary.caution ?? 0}</b><span>주의</span></div><div><b>{record.summary.excess ?? 0}</b><span>과다</span></div><div><b>{record.summary.noStandard ?? 0}</b><span>기준 없음</span></div></div>{ratio && <p className={`report-ratio ${ratio.status.toLowerCase()}`}><span>칼슘 : 인 비율</span><b>{formatNumber(ratio.value)} : 1 · {ratioLabel(ratio.status)}</b></p>}</section>
      <section className="report-section"><div className="report-section-title"><span>02</span><div><h2>급여 제품</h2><p>분석에 포함된 하루 급여 조합입니다.</p></div></div><ul className="report-products">{record.items.map((item, index) => <li key={`${item}-${index}`}><i>{String(index + 1).padStart(2, '0')}</i><span>{item}</span></li>)}</ul></section>
      <section className="report-section report-nutrients"><div className="report-section-title"><span>03</span><div><h2>영양성분 상세</h2><p>{analysis ? `${analysis.nutrients.length}개 성분의 실제 저장값` : '이전 형식으로 저장되어 요약만 제공합니다.'}</p></div></div>{analysis ? <table><thead><tr><th>영양성분</th><th>사료</th><th>영양제</th><th>합계</th><th>하한</th><th>상한</th><th>판정</th></tr></thead><tbody>{analysis.nutrients.map(nutrient => <tr key={nutrient.nutrientId}><th>{nutrient.name}<small>{nutrient.unit.toLowerCase()}</small></th><td>{formatNumber(nutrient.fromFeed)}</td><td>{formatNumber(nutrient.fromSupplements)}</td><td><b>{formatNumber(nutrient.total)}</b></td><td>{formatNumber(nutrient.minimum)}</td><td>{formatNumber(nutrient.upper)}</td><td><span className={`report-status ${nutrient.status.toLowerCase()}`}>{STATUS[nutrient.status] ?? nutrient.status}</span></td></tr>)}</tbody></table> : <p className="report-legacy">이 기록은 PDF 리포트 기능 도입 전에 저장되었습니다. 부족 {record.summary.deficient ?? 0} · 적정 {record.summary.adequate ?? 0} · 주의 {record.summary.caution ?? 0} · 과다 {record.summary.excess ?? 0}</p>}</section>
      {analysis?.warnings.length ? <section className="report-section report-cautions"><div className="report-section-title"><span>04</span><div><h2>판정 및 기준 안내</h2><p>결과를 해석할 때 함께 확인하세요.</p></div></div><ul>{analysis.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></section> : null}
      <footer className="report-footer"><b>우애영</b><span>분석 ID {record.id}</span><p>이 리포트는 건강 상태의 진단·처방 또는 확정 급여 권고가 아닙니다. 반려동물의 질환·복용약·임신 및 수유 상태는 담당 수의사와 상담하세요.</p></footer>
    </article>
  </div>, document.body)
}

export type ReportSnapshot = { analysisSnapshot?: Analysis; profileSnapshot?: Profile }
