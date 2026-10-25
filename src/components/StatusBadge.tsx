// 공통 UI (담당 A, 2차). 상태 배지: 색 + 글자 (색만으로 구분하지 않는다, FE-05)
import type { JudgeStatus } from '../types/api';
import { JUDGE_STATUS_LABEL, JUDGE_STATUS_TONE } from '../features/analysis/labels';

export function StatusBadge({ status }: { status: JudgeStatus }) {
  const tone = status === 'ADEQUATE_NO_UPPER' ? 'adequate-outline' : JUDGE_STATUS_TONE[status];
  return (
    <span className={`badge badge--${tone}`}>
      <span className="badge__dot" aria-hidden="true" />
      {JUDGE_STATUS_LABEL[status]}
    </span>
  );
}
