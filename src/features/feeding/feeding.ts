// 담당: B. 사료·영양제 검증·변환. 통합 페이지(C)가 이 함수들을 부른다 — 이름과 인자를 바꾸지 않는다.
// 규칙: 구현계획서 5.3, 프론트엔드 구현계획 3.2
import type { FeedingInput, IngredientInput, NutrientId, NutrientOption, SupplementInput } from '../../types/api';
import { FEED_GRAMS_PATH, ingredientPath, supplementPath } from '../../validation/paths';
import { LABEL_MAX_LENGTH, parseNumber } from '../../validation/rules';
import type { FieldErrors } from '../../validation/types';
import type { FeedingForm, IngredientForm, SupplementForm } from './types';

/** 단위 표기 정규화: μ(U+03BC)·mcg·ug → µg(U+00B5), iu → IU. 서버와 같은 규칙. */
export function normalizeUnit(unit: string): string {
  const u = unit.trim();
  const lower = u.toLowerCase();
  if (lower === 'mcg' || lower === 'ug' || u === 'μg' || u === 'µg') return 'µg';
  if (lower === 'iu') return 'IU';
  if (lower === 'mg') return 'mg';
  if (lower === 'g') return 'g';
  return u;
}

function findNutrient(nutrients: NutrientOption[], id: string): NutrientOption | undefined {
  return nutrients.find((n) => n.id === id);
}

/** 그 성분이 받을 수 있는 단위인지 (정규화 후 비교) */
export function isUnitAllowed(nutrient: NutrientOption | undefined, unit: string): boolean {
  if (!nutrient) return true; // 성분 목록을 아직 못 받았으면 서버 판단에 맡긴다
  const u = normalizeUnit(unit);
  return nutrient.units.some((x) => normalizeUnit(x) === u);
}

/**
 * 막는 오류: FEED_RANGE(급여량 < 0), LABEL_LENGTH(1~30자), SERVINGS_RANGE(≤0), INGREDIENTS_EMPTY,
 * REQUIRED(성분·함량 빈칸), AMOUNT_RANGE(< 0), UNSUPPORTED_UNIT(그 성분의 units 에 없음).
 * 영양제가 0개인 것은 오류가 아니다.
 */
export function validateFeeding(form: FeedingForm, nutrients: NutrientOption[]): FieldErrors {
  const errors: FieldErrors = {};

  if (form.feedGrams.trim() !== '') {
    const feed = parseNumber(form.feedGrams);
    if (feed === null || feed < 0) errors[FEED_GRAMS_PATH] = 'FEED_RANGE';
  }

  form.supplements.forEach((s, i) => {
    const label = s.label.trim();
    if (label.length < 1 || label.length > LABEL_MAX_LENGTH) errors[supplementPath(i, 'label')] = 'LABEL_LENGTH';

    const servings = parseNumber(s.servingsPerDay);
    if (servings === null) errors[supplementPath(i, 'servingsPerDay')] = 'REQUIRED';
    else if (servings <= 0) errors[supplementPath(i, 'servingsPerDay')] = 'SERVINGS_RANGE';

    if (s.ingredients.length === 0) errors[supplementPath(i, 'ingredients')] = 'INGREDIENTS_EMPTY';

    s.ingredients.forEach((row, j) => {
      if (row.nutrientId === '') errors[ingredientPath(i, j, 'nutrientId')] = 'REQUIRED';

      const amount = parseNumber(row.amount);
      if (amount === null) errors[ingredientPath(i, j, 'amount')] = 'REQUIRED';
      else if (amount < 0) errors[ingredientPath(i, j, 'amount')] = 'AMOUNT_RANGE';

      if (row.nutrientId !== '') {
        if (!isUnitAllowed(findNutrient(nutrients, row.nutrientId), row.unit)) {
          errors[ingredientPath(i, j, 'unit')] = 'UNSUPPORTED_UNIT';
        }
      }
    });
  });

  return errors;
}

/** validateFeeding 통과 후에만 부른다. 급여량 빈칸 → null. 단위의 μ/mcg 는 µg 로 바꿔 보낸다. */
export function toFeedingInput(form: FeedingForm, nutrients: NutrientOption[]): FeedingInput {
  void nutrients; // 형식 변환에는 쓰지 않는다 (함수 계약 유지)
  const feed = form.feedGrams.trim() === '' ? null : parseNumber(form.feedGrams);
  const supplements: SupplementInput[] = form.supplements.map((s) => ({
    label: s.label.trim(),
    servingsPerDay: mustNumber(s.servingsPerDay),
    ingredients: s.ingredients.map((row): IngredientInput => {
      if (row.nutrientId === '') throw new Error('toFeedingInput: validateFeeding 을 먼저 통과해야 합니다.');
      return { nutrientId: row.nutrientId, amount: mustNumber(row.amount), unit: normalizeUnit(row.unit) };
    }),
  }));
  return { feedGramsPerDay: feed, supplements };
}

function mustNumber(text: string): number {
  const n = parseNumber(text);
  if (n === null) throw new Error('toFeedingInput: validateFeeding 을 먼저 통과해야 합니다.');
  return n;
}

/** 저장된 프로필(요청 형식) → 입력 상태 */
export function fromFeedingInput(input: FeedingInput): FeedingForm {
  return {
    feedGrams: input.feedGramsPerDay === null || input.feedGramsPerDay === undefined ? '' : String(input.feedGramsPerDay),
    supplements: (input.supplements ?? []).map((s) => ({
      key: newKey(),
      label: s.label,
      servingsPerDay: String(s.servingsPerDay),
      ingredients: s.ingredients.map((row) => ({
        key: newKey(),
        nutrientId: row.nutrientId,
        amount: String(row.amount),
        unit: normalizeUnit(row.unit),
      })),
    })),
  };
}

let keySeq = 0;
/** React 목록용 고유 key (요청에는 보내지 않는다) */
function newKey(): string {
  keySeq += 1;
  return `k${Date.now().toString(36)}-${keySeq}`;
}

/** 빈 영양제 카드 (성분 행 1개 포함) */
export function newSupplement(): SupplementForm {
  return { key: newKey(), label: '', servingsPerDay: '1', ingredients: [newIngredient()] };
}

/** 빈 성분 행 */
export function newIngredient(): IngredientForm {
  return { key: newKey(), nutrientId: '', amount: '', unit: '' };
}

/** 성분을 바꾸면 단위를 그 성분의 첫 번째(기본) 단위로 바꾼다 */
export function changeNutrient(row: IngredientForm, nutrientId: IngredientForm['nutrientId'], nutrients: NutrientOption[]): IngredientForm {
  if (nutrientId === '') return { ...row, nutrientId: '', unit: '' };
  const n = findNutrient(nutrients, nutrientId as NutrientId);
  return { ...row, nutrientId, unit: n?.units[0] ?? '' };
}
