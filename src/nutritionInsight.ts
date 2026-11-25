import type { Analysis } from './api'

export function nutritionOneLine(analysis: Analysis): string {
  const s = analysis.summary
  const ratio = analysis.ratios.calciumPhosphorus
  if (s.excess) return `개선 방향: 과다 판정 ${s.excess}개 성분의 급여량을 먼저 줄이거나 제외한 뒤 다시 확인해 주세요.`
  if (ratio && ['LOW', 'HIGH'].includes(ratio.status)) return '개선 방향: 칼슘·인 비율을 조정할 수 있도록 해당 성분이 포함된 제품의 급여량을 확인해 주세요.'
  if (s.caution) return `개선 방향: 주의 성분 ${s.caution}개는 다음 급여 전 라벨과 급여량을 한 번 더 확인해 주세요.`
  if (s.deficient) return `개선 방향: 부족 성분 ${s.deficient}개를 중심으로 사료·영양제 구성과 급여량을 검토해 주세요.`
  if (s.noStandard) return '잘된 점: 확인 가능한 성분은 기준 범위에 있으며, 기준이 없는 성분은 라벨 정보를 보완해 주세요.'
  return '잘된 점: 확인된 영양성분이 모두 기준 범위에 있어 현재 급여 조합을 안정적으로 유지하고 있어요.'
}
