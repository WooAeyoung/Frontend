// 입력칸 경로 만드는 함수 (프론트엔드 구현계획 2.1). 담당: 공용.
// 경로 문자열을 직접 쓰지 말고 이 함수만 쓴다. 서버 오류 field 와 글자 하나까지 같아야 하기 때문.
import type { IngredientInput, PetInput, SupplementInput } from '../types/api';

export const petPath = (key: keyof PetInput) => `pet.${key}`;

export const FEED_GRAMS_PATH = 'feeding.feedGramsPerDay';
export const SUPPLEMENTS_PATH = 'feeding.supplements';

export const supplementPath = (i: number, key?: keyof SupplementInput) =>
  key ? `${SUPPLEMENTS_PATH}[${i}].${key}` : `${SUPPLEMENTS_PATH}[${i}]`;

export const ingredientPath = (i: number, j: number, key?: keyof IngredientInput) =>
  key ? `${SUPPLEMENTS_PATH}[${i}].ingredients[${j}].${key}` : `${SUPPLEMENTS_PATH}[${i}].ingredients[${j}]`;
