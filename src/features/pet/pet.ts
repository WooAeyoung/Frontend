// 담당: A. 반려동물 정보 검증·변환. 통합 페이지(C)가 이 네 함수를 부른다 — 이름과 인자를 바꾸지 않는다.
// 규칙: 구현계획서 5.3, 프론트엔드 구현계획 3.1
import type { PetInput } from '../../types/api';
import { petPath } from '../../validation/paths';
import {
  parseNumber, SIZE_CLASS_REQUIRED_BELOW_WEEKS, UNUSUAL_AGE_YEARS, UNUSUAL_WEIGHT_KG, WEEKS_PER_MONTH,
} from '../../validation/rules';
import type { ClientWarnings, FieldErrors } from '../../validation/types';
import type { PetForm } from './types';

/** 나이 → 주령. 나이를 숫자로 읽을 수 없으면 null */
export function ageInWeeks(form: Pick<PetForm, 'ageValue' | 'ageUnit'>): number | null {
  const age = parseNumber(form.ageValue);
  if (age === null) return null;
  return form.ageUnit === 'WEEK' ? age : age * WEEKS_PER_MONTH;
}

/** 막는 오류: REQUIRED, WEIGHT_RANGE(≤0), AGE_RANGE(≤0), SIZE_CLASS_REQUIRED(12개월 미만 개). 상한은 막지 않는다. */
export function validatePet(form: PetForm): FieldErrors {
  const errors: FieldErrors = {};

  const weight = parseNumber(form.weightKg);
  if (weight === null) errors[petPath('weightKg')] = 'REQUIRED';
  else if (weight <= 0) errors[petPath('weightKg')] = 'WEIGHT_RANGE';

  const age = parseNumber(form.ageValue);
  if (age === null) errors[petPath('ageValue')] = 'REQUIRED';
  else if (age <= 0) errors[petPath('ageValue')] = 'AGE_RANGE';

  if (needsSizeClass(form) && form.sizeClass === '') errors[petPath('sizeClass')] = 'SIZE_CLASS_REQUIRED';

  return errors;
}

/** 막지 않는 경고: WEIGHT_UNUSUAL(개 > 100 kg, 고양이 > 15 kg), AGE_UNUSUAL(> 25년) */
export function petWarnings(form: PetForm): ClientWarnings {
  const warnings: ClientWarnings = {};
  const weight = parseNumber(form.weightKg);
  if (weight !== null && weight > UNUSUAL_WEIGHT_KG[form.species]) warnings[petPath('weightKg')] = 'WEIGHT_UNUSUAL';

  const age = parseNumber(form.ageValue);
  if (age !== null) {
    const years = form.ageUnit === 'WEEK' ? age / (12 * WEEKS_PER_MONTH) : age / 12;
    if (years > UNUSUAL_AGE_YEARS) warnings[petPath('ageValue')] = 'AGE_UNUSUAL';
  }
  return warnings;
}

/** 체급 칸을 보여 줄지: 개 && 나이(주) < 52.14 */
export function needsSizeClass(form: PetForm): boolean {
  if (form.species !== 'DOG') return false;
  const weeks = ageInWeeks(form);
  return weeks !== null && weeks < SIZE_CLASS_REQUIRED_BELOW_WEEKS;
}

/** validatePet 통과 후에만 부른다. 체급이 필요 없으면 sizeClass 는 null 로 보낸다. */
export function toPetInput(form: PetForm): PetInput {
  const weightKg = parseNumber(form.weightKg);
  const ageValue = parseNumber(form.ageValue);
  if (weightKg === null || ageValue === null) throw new Error('toPetInput: validatePet 을 먼저 통과해야 합니다.');
  return {
    species: form.species,
    weightKg,
    ageValue,
    ageUnit: form.ageUnit,
    sizeClass: needsSizeClass(form) && form.sizeClass !== '' ? form.sizeClass : null,
  };
}

/** 저장된 프로필(요청 형식) → 입력 상태 (localStorage 복원용) */
export function fromPetInput(input: PetInput): PetForm {
  return {
    species: input.species,
    weightKg: input.weightKg === null || input.weightKg === undefined ? '' : String(input.weightKg),
    ageValue: input.ageValue === null || input.ageValue === undefined ? '' : String(input.ageValue),
    ageUnit: input.ageUnit,
    sizeClass: input.sizeClass ?? '',
  };
}
