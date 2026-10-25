// 담당: C. 분석 요청·응답 상태. 통합 페이지와 2차 결과 화면이 쓴다.
import { useCallback, useRef, useState } from 'react';
import { analyze } from '../../api/client';
import type { AnalysisRequest, AnalysisResponse } from '../../types/api';
import { clearPath, type FieldErrors } from '../../validation/types';
import { createAnalysisRunner } from './analysisFlow';
import type { ResultView } from './resultView';

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AnalysisState {
  status: AnalysisStatus;
  response: AnalysisResponse | null;
  view: ResultView | null;
  /** 400 응답의 fieldErrors (경로 → 코드). 입력칸에 붙인다. */
  serverFieldErrors: FieldErrors;
  /** 입력칸에 붙지 않는 오류 문구 (네트워크, 500 등) */
  errorMessage: string | null;
}

export const initialAnalysisState: AnalysisState = {
  status: 'idle', response: null, view: null, serverFieldErrors: {}, errorMessage: null,
};

/**
 * - submit: analyze() 호출 → 성공 시 buildResultView, ApiError 400 → fromServerErrors, 그 외 → 문구.
 *   끝난 뒤의 상태를 돌려준다 (무시된 요청이면 null).
 * - 요청 중 다시 누르면 무시 (중복 요청 방지)
 * - 늦게 도착한 이전 요청의 응답이 새 결과를 덮어쓰지 않게
 */
export function useAnalysis(analyzeFn: (req: AnalysisRequest) => Promise<AnalysisResponse> = analyze) {
  const [state, setState] = useState<AnalysisState>(initialAnalysisState);
  const runner = useRef<ReturnType<typeof createAnalysisRunner> | null>(null);
  if (runner.current === null) runner.current = createAnalysisRunner(analyzeFn, (u) => setState(u));

  const submit = useCallback((request: AnalysisRequest) => runner.current!.submit(request), []);

  const clearServerError = useCallback((path: string) => {
    setState((s) => {
      const next = clearPath(s.serverFieldErrors, path);
      if (Object.keys(next).length === Object.keys(s.serverFieldErrors).length) return s;
      return { ...s, serverFieldErrors: next };
    });
  }, []);

  const reset = useCallback(() => {
    runner.current!.invalidate();
    setState(initialAnalysisState);
  }, []);

  return { ...state, submit, clearServerError, reset };
}
