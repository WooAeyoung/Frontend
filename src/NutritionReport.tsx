import type { Analysis, Profile } from './api'
import { summarizeNutritionReport } from './api'
import { useState } from 'react'
import type { SavedRecord } from './Records'
import { formatNumber } from './format/number'
import { createPortal } from 'react-dom'
import { nutritionOneLine } from './nutritionInsight'

const STATUS: Record<string, string> = {
  DEFICIENT: '부족', ADEQUATE: '적정', ADEQUATE_NO_UPPER_LIMIT: '적정 · 상한 없음',
  CAUTION: '주의', EXCESS: '과다', NO_STANDARD: '기준 없음', UNSUPPORTED: '분석 불가',
  UNVERIFIED_STANDARD: '기준 검증 대기', INSUFFICIENT_DATA: '정보 부족', UNIT_CONVERSION_UNSUPPORTED: '단위 환산 불가',
}

const ratioLabel = (status?: string) => ({ LOW: '낮음', HIGH: '높음', ADEQUATE: '적정', UNAVAILABLE: '계산 불가' }[status ?? ''] ?? status ?? '—')

export default function NutritionReport({ record, onClose, language = 'ko' }: { record: SavedRecord; onClose: () => void; language?: 'ko' | 'en' | 'ja' }) {
  const t = (ko: string, en: string, ja: string) => language === 'en' ? en : language === 'ja' ? ja : ko
  const [geminiSummary, setGeminiSummary] = useState('')
  const [generating, setGenerating] = useState(false)
  const [summaryError, setSummaryError] = useState('')
  async function generateSummary() {
    setGenerating(true)
    setSummaryError('')
    try {
      const answer = await summarizeNutritionReport(record.summary)
      if (answer) setGeminiSummary(answer)
      else setSummaryError('Gemini 요약을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.')
    } catch {
      setSummaryError('Gemini 요약을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setGenerating(false)
    }
  }
  const analysis = record.analysisSnapshot
  const profile = record.profileSnapshot
  const created = new Date(record.date).toLocaleString(language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'ko-KR')
  const ratio = analysis?.ratios.calciumPhosphorus
  const print = () => window.print()
  return createPortal(<div className="report-overlay" role="dialog" aria-modal="true" aria-label={t(`${record.name} 영양 분석 리포트`, `${record.name} nutrition report`, `${record.name}の栄養分析レポート`)}>
    <div className="report-toolbar"><button className="btn ghost" onClick={onClose}>{t('닫기', 'Close', '閉じる')}</button><button className="btn ghost" onClick={generateSummary} disabled={generating || Boolean(geminiSummary)}>{generating ? t('Gemini 요약 중…', 'Generating summary…', 'Geminiで要約中…') : t('Gemini 한 줄 요약 만들기', 'Generate a Gemini summary', 'Geminiで一言要約を作成')}</button>{summaryError && <span role="status">{summaryError}</span>}<button className="btn" onClick={print} disabled={generating}>{t('PDF로 저장', 'Save as PDF', 'PDFで保存')}</button></div>
    <article className="nutrition-report" id={`report-${record.id}`}>
      <section className="report-section report-ai-insight"><div className="report-section-title"><div><h2>{geminiSummary ? t('Gemini 한 줄 요약', 'Gemini summary', 'Geminiの一言要約') : t('영양 한 줄 요약', 'Nutrition summary', '栄養の一言まとめ')}</h2></div></div><p>{geminiSummary || (language === 'ko' ? record.oneLineInsight ?? (analysis ? nutritionOneLine(analysis) : '이전 형식의 기록으로 한줄 요약이 없습니다.') : analysis?.summary.deficient ? t(`개선 방향: 부족 성분 ${analysis.summary.deficient}개를 중심으로 사료·영양제 구성과 급여량을 검토해 주세요.`, `Next step: Review food, supplements, and serving sizes for ${analysis.summary.deficient} low nutrient(s).`, `改善案：不足成分${analysis.summary.deficient}項目を中心にフード・サプリの構成と量を確認してください。`) : t('확인된 영양성분은 기준 범위에 있어요.', 'Confirmed nutrients are within range.', '確認できた栄養成分は基準範囲内です。'))}</p></section>
      <header className="report-cover"><div><span>WOOAEYOUNG NUTRITION JOURNAL</span><h1>{t(`${record.name}의 하루를 영양으로 읽습니다.`, `A nutrition snapshot of ${record.name}’s day.`, `${record.name}の一日を栄養から読み解きます。`)}</h1><p>{t('사료와 영양제의 하루 섭취량을 분석 당시 기준과 비교한 리포트입니다.', 'This report compares daily food and supplement intake with the standards used during analysis.', 'このレポートは一日のフード・サプリ摂取量を分析時の基準と比較したものです。')}</p></div><aside><b>{analysis ? analysis.summary.adequate ?? 0 : record.summary.adequate ?? 0}</b><small>{t('적정 성분', 'Adequate nutrients', '適正な成分')}</small></aside></header>
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
