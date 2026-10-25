// 담당: C. API 응답 → 화면에 바로 쓰는 데이터. 2차 화면(그래프·안내)은 이것만 보고 그린다.
// 계산(판정·기준선)은 하지 않는다. 표시용 정리만 한다 (프론트엔드 구현계획 3.3).
import { formatNumber } from '../../format/number';
import type { AnalysisResponse, CaPRatio, ChartBar, EnergyInfo, GuideItem, JudgeStatus, NutrientId } from '../../types/api';
import { JUDGE_STATUS_LABEL, JUDGE_STATUS_TONE, LIFE_STAGE_LABEL } from './labels';

/** 상태 → 배지 색 계열. 색만으로 구분하지 않도록 label 도 함께 쓴다. */
export type StatusTone = 'deficient' | 'adequate' | 'caution' | 'excess' | 'neutral';

export interface BarView {
  id: NutrientId;
  name: string;
  unit: string;
  feed: number;          // null → 0 으로 그린다 (막대 길이용). 숫자 표시는 feedText
  supplement: number;
  feedText: string;      // formatNumber 결과
  supplementText: string;
  totalText: string;
  lower: number | null;  // 선은 null 이면 그리지 않는다
  caution: number | null;
  upper: number | null;
  axisMax: number;       // max(upper, caution, lower, total) × 1.15, 모두 없으면 1
  status: JudgeStatus;
  statusLabel: string;   // '부족', '적정(상한 기준 없음)' …
  tone: StatusTone;
  showNoUpperLabel: boolean; // 주의선·상한 모두 없음 → "상한 기준 없음"
}

export interface ResultView {
  supported: boolean;            // lifeStage !== 'UNSUPPORTED'
  lifeStageLabel: string;        // '성견', '고양이 성장기 1' …
  energyText: string | null;
  bars: BarView[];
  guide: GuideItem[];            // 서버 순서 그대로
  caPText: string | null;        // 개만
  notices: string[];
  warnings: string[];
  /** 2차 화면용 추가 정보 (응답 값 그대로) */
  energy: EnergyInfo;
  caPRatio: CaPRatio;
}

export const AXIS_PADDING = 1.15;

export function buildBarView(bar: ChartBar): BarView {
  const candidates = [bar.upper, bar.caution, bar.lower, bar.total].filter((v): v is number => v !== null && Number.isFinite(v));
  const max = candidates.length > 0 ? Math.max(...candidates) : 0;
  return {
    id: bar.nutrientId,
    name: bar.nutrientName,
    unit: bar.unit,
    feed: bar.feedValue ?? 0,
    supplement: bar.supplementValue ?? 0,
    feedText: formatNumber(bar.feedValue),
    supplementText: formatNumber(bar.supplementValue),
    totalText: formatNumber(bar.total),
    lower: bar.lower,
    caution: bar.caution,
    upper: bar.upper,
    axisMax: max > 0 ? max * AXIS_PADDING : 1,
    status: bar.status,
    statusLabel: JUDGE_STATUS_LABEL[bar.status],
    tone: JUDGE_STATUS_TONE[bar.status],
    showNoUpperLabel: bar.caution === null && bar.upper === null,
  };
}

export function buildResultView(response: AnalysisResponse): ResultView {
  return {
    supported: response.lifeStage !== 'UNSUPPORTED',
    lifeStageLabel: LIFE_STAGE_LABEL[response.lifeStage],
    energyText: response.energyRatioText,
    bars: (response.bars ?? []).map(buildBarView),
    guide: response.guide ?? [],
    caPText: response.caPRatioText,
    notices: (response.notices ?? []).map((n) => n.message),
    warnings: (response.warnings ?? []).map((w) => w.message),
    energy: response.energy,
    caPRatio: response.caPRatio,
  };
}
