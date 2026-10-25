import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api/client';
import { mockErrors, mockResponses } from '../../api/mocks';
import type { AnalysisRequest, AnalysisResponse } from '../../types/api';
import { ERROR_MESSAGES, NETWORK_ERROR_MESSAGE } from '../../validation/messages';
import { createAnalysisRunner, failureState, NOT_IMPLEMENTED_SUFFIX } from './analysisFlow';
import { initialAnalysisState, type AnalysisState } from './useAnalysis';

const req = {} as AnalysisRequest;

function harness(analyzeFn: (r: AnalysisRequest) => Promise<AnalysisResponse>) {
  let state: AnalysisState = initialAnalysisState;
  const runner = createAnalysisRunner(analyzeFn, (u) => { state = u(state); });
  return { runner, get state() { return state; } };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}

describe('failureState 분기', () => {
  it('400 + fieldErrors → 입력칸', () => {
    const s = failureState(new ApiError(400, mockErrors.unsupportedUnit));
    expect(s.serverFieldErrors).toEqual({ 'feeding.supplements[0].ingredients[0].unit': 'UNSUPPORTED_UNIT' });
  });
  it('400 fieldErrors 없음 → 배너', () => {
    const s = failureState(new ApiError(400, { code: 'VALIDATION_ERROR', message: '', fieldErrors: [] }));
    expect(s.serverFieldErrors).toEqual({});
    expect(s.errorMessage).toBe(ERROR_MESSAGES.VALIDATION_ERROR);
  });
  it('404 / 500 / 501', () => {
    expect(failureState(new ApiError(404, { code: 'NUTRIENT_NOT_FOUND', message: '', fieldErrors: [] })).errorMessage).toBe(ERROR_MESSAGES.NUTRIENT_NOT_FOUND);
    expect(failureState(new ApiError(500, { code: 'INTERNAL_ERROR', message: '', fieldErrors: [] })).errorMessage).toBe(ERROR_MESSAGES.INTERNAL_ERROR);
    expect(failureState(new ApiError(501, { code: 'INTERNAL_ERROR', message: '', fieldErrors: [] })).errorMessage).toBe(ERROR_MESSAGES.INTERNAL_ERROR + NOT_IMPLEMENTED_SUFFIX);
  });
  it('네트워크 오류', () => {
    expect(failureState(new TypeError('Failed to fetch')).errorMessage).toBe(NETWORK_ERROR_MESSAGE);
    expect(failureState(new ApiError(0, { code: 'INTERNAL_ERROR', message: '', fieldErrors: [] }, true)).errorMessage).toBe(NETWORK_ERROR_MESSAGE);
  });
});

describe('createAnalysisRunner', () => {
  it('성공 → success + view', async () => {
    const h = harness(async () => mockResponses.dogAdult);
    await h.runner.submit(req);
    expect(h.state.status).toBe('success');
    expect(h.state.view?.supported).toBe(true);
  });

  it('요청 중 다시 제출하면 무시', async () => {
    let calls = 0;
    const d = deferred<AnalysisResponse>();
    const h = harness(() => { calls += 1; return d.promise; });
    const first = h.runner.submit(req);
    expect(h.state.status).toBe('loading');
    expect(await h.runner.submit(req)).toBeNull();
    d.resolve(mockResponses.kitten);
    await first;
    expect(calls).toBe(1);
    expect(h.state.response).toBe(mockResponses.kitten);
  });

  it('reset 뒤 늦게 온 이전 응답은 버림', async () => {
    const d1 = deferred<AnalysisResponse>();
    const queue = [d1.promise, Promise.resolve(mockResponses.puppy)];
    const h = harness(() => queue.shift()!);
    const p1 = h.runner.submit(req);
    h.runner.invalidate();
    await h.runner.submit(req);
    expect(h.state.response).toBe(mockResponses.puppy);
    d1.resolve(mockResponses.dogAdult);
    expect(await p1).toBeNull();
    expect(h.state.response).toBe(mockResponses.puppy);
  });

  it('실패 → error, 이전 결과 지움', async () => {
    const queue: Array<() => Promise<AnalysisResponse>> = [
      async () => mockResponses.dogAdult,
      async () => { throw new ApiError(400, mockErrors.sizeClassRequired); },
    ];
    const h = harness(() => queue.shift()!());
    await h.runner.submit(req);
    await h.runner.submit(req);
    expect(h.state.status).toBe('error');
    expect(h.state.view).toBeNull();
    expect(h.state.serverFieldErrors['pet.sizeClass']).toBe('SIZE_CLASS_REQUIRED');
  });
});
