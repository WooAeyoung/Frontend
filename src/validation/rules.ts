// 화면 검증에 쓰는 기준값 (구현계획서 5.3, D-04). 담당: 공용.
// 서버와 같은 규칙. 화면 검증은 편의용이고 최종 판단은 서버가 한다.
export const WEEKS_PER_MONTH = 4.345;
/** 이 주령 미만의 개는 체급 필수 (12개월 × 4.345) */
export const SIZE_CLASS_REQUIRED_BELOW_WEEKS = 12 * WEEKS_PER_MONTH;
/** 막지 않는 확인 경고 기준 */
export const UNUSUAL_WEIGHT_KG = { DOG: 100, CAT: 15 } as const;
export const UNUSUAL_AGE_YEARS = 25;
export const LABEL_MAX_LENGTH = 30;

/** 입력칸 문자열 → 숫자. 빈칸·숫자 아님은 null. 쉼표는 지운다 ("1,000" → 1000). */
export function parseNumber(text: string): number | null {
  const t = text.replace(/,/g, '').trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
