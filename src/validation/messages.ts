// 오류·경고 코드 → 화면 문구 (프론트엔드 구현계획 2.3). 담당: C. 문구를 바꿀 때 A·B에게 알린다.
// 코드는 contract/openapi.yaml 의 FieldErrorCode, ErrorCode, WarningCode 와 같다.
import type { ErrorCode, FieldErrorCode, WarningCode } from '../types/api';

export const FIELD_ERROR_MESSAGES: Record<FieldErrorCode, string> = {
  REQUIRED: '값을 입력하세요.',
  WEIGHT_RANGE: '체중은 0보다 커야 합니다.',
  AGE_RANGE: '나이는 0보다 커야 합니다.',
  SIZE_CLASS_REQUIRED: '12개월 미만 강아지는 예상 성체 체급을 골라 주세요.',
  SERVINGS_RANGE: '하루 급여 횟수는 0보다 커야 합니다.',
  AMOUNT_RANGE: '함량은 0 이상이어야 합니다.',
  FEED_RANGE: '사료 급여량은 0 이상이어야 합니다.',
  INGREDIENTS_EMPTY: '성분을 하나 이상 추가하세요.',
  UNSUPPORTED_UNIT: '이 성분에 쓸 수 없는 단위입니다.',
  NUTRIENT_NOT_IMPLEMENTED: '지원하지 않는 성분입니다.',
  LABEL_LENGTH: '영양제 이름은 1~30자로 입력하세요.',
};

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: '입력값을 확인하세요.',
  UNSUPPORTED_UNIT: '단위를 확인하세요.',
  NUTRIENT_NOT_IMPLEMENTED: '지원하지 않는 성분이 있습니다.',
  NUTRIENT_NOT_FOUND: '성분 정보를 찾을 수 없습니다.',
  INTERNAL_ERROR: '서버에 문제가 생겼습니다. 잠시 후 다시 시도하세요.',
};

/** 화면에서 먼저 띄우는 확인 경고. 서버 warnings 문구와 같게 맞춘다 (구현계획서 6.3). */
export const WARNING_MESSAGES: Record<WarningCode, string> = {
  WEIGHT_CLIPPED: '체급 또는 체중을 확인하세요.',
  UNSUPPORTED_AGE: '8주 미만은 계산하지 않습니다.',
  FEED_ASSUMED: '사료 급여량을 입력하지 않아 필요 열량만큼 먹는다고 보고 계산했습니다.',
  WEIGHT_UNUSUAL: '입력한 체중이 일반적인 범위보다 큽니다. 단위(kg)와 숫자를 확인하세요.',
  AGE_UNUSUAL: '입력한 나이가 일반적인 범위보다 많습니다. 나이와 단위(주/개월)를 확인하세요.',
};

/** 네트워크 오류 등 응답 본문이 없을 때 */
export const NETWORK_ERROR_MESSAGE = '서버에 연결할 수 없습니다. 인터넷 연결을 확인하세요.';
