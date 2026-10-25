// 검증 결과 공통 형태 (프론트엔드 구현계획 2장). 담당: 공용 — 바꿀 때는 A·B·C 모두 동의.
//
// 입력칸 이름(경로)은 API 오류 응답의 field 와 똑같이 쓴다.
//   pet.weightKg, feeding.feedGramsPerDay, feeding.supplements[0].ingredients[1].unit
// 이렇게 하면 화면 검증 오류와 서버 오류(400 fieldErrors)를 같은 방법으로 입력칸에 붙일 수 있다.
import type { FieldError, FieldErrorCode, WarningCode } from '../types/api';

/** 입력칸 경로. paths.ts 의 함수로만 만든다 (손으로 문자열을 쓰지 않는다). */
export type FieldPath = string;

/** 경로 → 오류 코드. 오류가 없는 칸은 키가 없다. */
export type FieldErrors = Partial<Record<FieldPath, FieldErrorCode>>;

/** 막지 않는 확인 경고 (체중·나이가 일반 범위보다 큼). 서버 warnings 와 같은 코드. */
export type ClientWarnings = Partial<Record<FieldPath, Extract<WarningCode, 'WEIGHT_UNUSUAL' | 'AGE_UNUSUAL'>>>;

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** 여러 검증 결과를 합친다. 같은 경로면 앞의 것이 남는다. */
export function mergeErrors(...all: FieldErrors[]): FieldErrors {
  const out: FieldErrors = {};
  for (const e of all) {
    for (const [path, code] of Object.entries(e)) {
      if (code && !(path in out)) out[path] = code;
    }
  }
  return out;
}

/** 서버 400 응답의 fieldErrors → FieldErrors */
export function fromServerErrors(fieldErrors: FieldError[]): FieldErrors {
  const out: FieldErrors = {};
  for (const fe of fieldErrors) {
    if (!(fe.field in out)) out[fe.field] = fe.code;
  }
  return out;
}

/** 경로가 prefix 로 시작하는 오류만 (예: 'pet.' 또는 'feeding.supplements[2].') */
export function errorsUnder(errors: FieldErrors, prefix: string): FieldErrors {
  const out: FieldErrors = {};
  for (const [path, code] of Object.entries(errors)) {
    if (path.startsWith(prefix) && code) out[path] = code;
  }
  return out;
}

/**
 * 사용자가 칸을 고치면 그 칸(과 그 아래 경로)의 서버 오류를 지운다.
 * 영양제·성분 행을 삭제하면 인덱스가 밀리므로 'feeding.supplements' 아래 서버 오류는 통째로 지운다.
 */
export function clearPath(errors: FieldErrors, path: FieldPath): FieldErrors {
  const out: FieldErrors = {};
  for (const [p, code] of Object.entries(errors)) {
    if (p !== path && !p.startsWith(path + '.') && !p.startsWith(path + '[') && code) out[p] = code;
  }
  return out;
}
