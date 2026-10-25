// 가짜 응답 (VITE_USE_MOCK=true). contract/examples 의 예시 JSON 을 그대로 쓴다.
// 예시 값은 형식 확인용이며 검산 정답은 tests/golden/cases.json 이다.
import dogAdult from '@contract/examples/analysis-response.dog-adult-feed120-vitd.json';
import kitten from '@contract/examples/analysis-response.kitten-no-feed.json';
import puppy from '@contract/examples/analysis-response.puppy-clipped-excess.json';
import unsupported from '@contract/examples/analysis-response.cat-7weeks-unsupported.json';
import sizeClassRequired from '@contract/examples/error-response.size-class-required.json';
import unsupportedUnit from '@contract/examples/error-response.unsupported-unit.json';
import nutrients from '@contract/examples/nutrients-response.implemented.json';
import sizeClasses from '@contract/examples/size-classes-response.json';
import type {
  AnalysisRequest, AnalysisResponse, ErrorResponse, NutrientOption, SizeClassOption,
} from '../types/api';

export const mockNutrients = nutrients as unknown as NutrientOption[];
export const mockSizeClasses = sizeClasses as unknown as SizeClassOption[];

export const mockResponses = {
  dogAdult: dogAdult as unknown as AnalysisResponse,
  kitten: kitten as unknown as AnalysisResponse,
  puppy: puppy as unknown as AnalysisResponse,
  unsupported: unsupported as unknown as AnalysisResponse,
};
export const mockErrors = {
  sizeClassRequired: sizeClassRequired as unknown as ErrorResponse,
  unsupportedUnit: unsupportedUnit as unknown as ErrorResponse,
};

/** 개발용 오류 스위치: 영양제 이름을 이 값으로 하면 400 UNSUPPORTED_UNIT 예시를 돌려준다 (시나리오 S7). */
export const MOCK_UNIT_ERROR_LABEL = '#unit-error';

/** 로딩 표시를 확인할 수 있게 조금 기다린다 (테스트에서는 0) */
export function mockDelay(ms = import.meta.env.MODE === 'test' ? 0 : 400): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** 요청 모양에 따라 비슷한 예시를 고른다 (계산하지 않음). */
export function pickMockAnalysis(req: AnalysisRequest): { status: number; body: AnalysisResponse | ErrorResponse } {
  const { pet } = req;
  if (req.feeding.supplements.some((s) => s.label === MOCK_UNIT_ERROR_LABEL)) {
    return { status: 400, body: mockErrors.unsupportedUnit };
  }
  const weeks = pet.ageUnit === 'WEEK' ? pet.ageValue : pet.ageValue * 4.345;
  if (weeks < 8) return { status: 200, body: mockResponses.unsupported };
  if (pet.species === 'CAT') return { status: 200, body: mockResponses.kitten };
  if (weeks < 52.14) {
    if (!pet.sizeClass) return { status: 400, body: mockErrors.sizeClassRequired };
    return { status: 200, body: mockResponses.puppy };
  }
  return { status: 200, body: mockResponses.dogAdult };
}
