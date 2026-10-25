// 담당: C. enum → 화면 문구. 2차 화면도 이 표를 쓴다.
import type { JudgeStatus, LifeStage, RatioStatus } from '../../types/api';
import type { StatusTone } from './resultView';

export const JUDGE_STATUS_LABEL: Record<JudgeStatus, string> = {
  UNSUPPORTED: '미지원',
  NO_STANDARD: '기준 없음',
  DEFICIENT: '부족',
  EXCESS: '과다',
  CAUTION: '주의',
  ADEQUATE: '적정',
  ADEQUATE_NO_UPPER: '적정(상한 기준 없음)',
};

export const JUDGE_STATUS_TONE: Record<JudgeStatus, StatusTone> = {
  UNSUPPORTED: 'neutral',
  NO_STANDARD: 'neutral',
  DEFICIENT: 'deficient',
  EXCESS: 'excess',
  CAUTION: 'caution',
  ADEQUATE: 'adequate',
  ADEQUATE_NO_UPPER: 'adequate',
};

export const LIFE_STAGE_LABEL: Record<LifeStage, string> = {
  UNSUPPORTED: '미지원 (8주 미만)',
  DOG_EARLY_GROWTH: '강아지 초기 성장기',
  DOG_LATE_GROWTH: '강아지 후기 성장기',
  DOG_ADULT: '성견',
  CAT_GROWTH_1: '고양이 성장기 (4개월 이하)',
  CAT_GROWTH_2: '고양이 성장기 (4~9개월)',
  CAT_GROWTH_3: '고양이 성장기 (9~12개월)',
  CAT_ADULT: '성묘',
};

export const RATIO_STATUS_LABEL: Record<RatioStatus, string> = {
  LOW: '비율 낮음',
  ADEQUATE: '적정',
  HIGH: '비율 높음',
  NOT_APPLICABLE: '해당 없음',
};
