// A·B 의 입력 영역 컴포넌트가 따르는 공통 props (프론트엔드 구현계획 2.4). 담당: 공용.
// 입력 상태는 통합 페이지(C)가 갖고, 각 영역은 값과 변경 함수만 받는다 (제어 컴포넌트).
import type { ClientWarnings, FieldErrors, FieldPath } from '../validation/types';

export interface SectionProps<F> {
  value: F;
  onChange: (next: F, changedPath: FieldPath) => void;
  /** 화면 검증 오류 + 서버 오류를 합친 것. 경로로 자기 칸의 오류를 찾는다. */
  errors: FieldErrors;
  warnings?: ClientWarnings;
  disabled?: boolean;
}
