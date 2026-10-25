// 담당: C. useAnalysis 의 판단 부분을 React 없이 테스트할 수 있게 떼어 낸 것.
import { ApiError } from '../../api/client';
import type { AnalysisRequest, AnalysisResponse } from '../../types/api';
import { ERROR_MESSAGES, NETWORK_ERROR_MESSAGE } from '../../validation/messages';
import { fromServerErrors, hasErrors } from '../../validation/types';
import { buildResultView } from './resultView';
import type { AnalysisState } from './useAnalysis';

export const NOT_IMPLEMENTED_SUFFIX = ' (개발 중: 백엔드에 아직 구현되지 않은 기능입니다)';

export function successState(response: AnalysisResponse): AnalysisState {
  return { status: 'success', response, view: buildResultView(response), serverFieldErrors: {}, errorMessage: null };
}

/** 실패 → 상태. 400 + fieldErrors 는 입력칸으로, 나머지는 배너 문구로. 이전 결과는 지운다. */
export function failureState(error: unknown): AnalysisState {
  const base: AnalysisState = { status: 'error', response: null, view: null, serverFieldErrors: {}, errorMessage: null };
  if (!(error instanceof ApiError)) return { ...base, errorMessage: NETWORK_ERROR_MESSAGE };
  if (error.network) return { ...base, errorMessage: NETWORK_ERROR_MESSAGE };

  const code = error.body.code;
  const message = ERROR_MESSAGES[code] ?? ERROR_MESSAGES.INTERNAL_ERROR;
  if (error.status === 400) {
    const fieldErrors = fromServerErrors(error.body.fieldErrors ?? []);
    // 입력칸 오류가 있어도 버튼 옆에 짧은 안내를 함께 띄운다
    return { ...base, serverFieldErrors: fieldErrors, errorMessage: hasErrors(fieldErrors) ? ERROR_MESSAGES.VALIDATION_ERROR : message };
  }
  if (error.status === 501) return { ...base, errorMessage: message + NOT_IMPLEMENTED_SUFFIX };
  return { ...base, errorMessage: message };
}

/**
 * 요청 순서 관리: 요청 중 재제출은 무시하고, 늦게 온 이전 응답은 버린다.
 * reset() 하면 진행 중이던 요청의 응답도 버린다.
 */
export function createAnalysisRunner(
  analyzeFn: (req: AnalysisRequest) => Promise<AnalysisResponse>,
  onState: (update: (prev: AnalysisState) => AnalysisState) => void,
) {
  let seq = 0;
  let inFlight = false;

  async function submit(request: AnalysisRequest): Promise<AnalysisState | null> {
    if (inFlight) return null;
    inFlight = true;
    const my = ++seq;
    onState((s) => ({ ...s, status: 'loading', errorMessage: null, serverFieldErrors: {} }));
    let next: AnalysisState;
    try {
      next = successState(await analyzeFn(request));
    } catch (e) {
      next = failureState(e);
    }
    if (my !== seq) return null; // 그 사이 reset 등으로 무효가 된 요청
    inFlight = false;
    onState(() => next);
    return next;
  }

  function invalidate() {
    seq += 1;
    inFlight = false;
  }

  return { submit, invalidate, isInFlight: () => inFlight };
}
