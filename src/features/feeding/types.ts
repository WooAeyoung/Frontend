// 담당: B. 사료·영양제 입력 상태. key 는 React 목록용 고유값 (행 삭제 시 입력 내용이 섞이지 않게).
import type { NutrientId } from '../../types/api';

export interface IngredientForm {
  key: string;
  /** '' = 선택 안 함 */
  nutrientId: NutrientId | '';
  amount: string;
  unit: string;
}

export interface SupplementForm {
  key: string;
  label: string;
  servingsPerDay: string;
  ingredients: IngredientForm[];
}

export interface FeedingForm {
  /** '' = 모름 (필요 열량만큼 먹는다고 계산) */
  feedGrams: string;
  supplements: SupplementForm[];
}

export const emptyFeedingForm: FeedingForm = { feedGrams: '', supplements: [] };
