// API 클라이언트. 형식은 src/types/api.ts (= contract/openapi.yaml).
// 기본 주소는 같은 출처의 /api/v1 (개발: Vite proxy → 8080, 배포: Spring 정적 폴더에서 같은 서버).
// 백엔드를 다른 주소에 둘 때만 VITE_API_BASE=http://host:8080/api/v1 (이때는 백엔드 CORS 설정 필요).
import type {
  AnalysisRequest, AnalysisResponse, ErrorResponse, NutrientOption, SizeClassOption,
  UnitConvertRequest, UnitConvertResponse,
} from '../types/api';
import { mockDelay, mockNutrients, mockSizeClasses, pickMockAnalysis } from './mocks';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') || '/api/v1';
// VITE_USE_MOCK 이 'false' 일 때만 실제 백엔드. 값이 없으면 가짜 응답 (env 파일이 없어도 동작)
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const TIMEOUT_MS = 15000;

/**
 * 400/404/500/501 응답. 화면은 fieldErrors 의 field 경로로 입력 칸에 오류를 붙인다.
 * network = true 면 서버에 닿지 못했거나 ErrorResponse 형식이 아닌 응답 (프록시 502/504 등).
 */
export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: ErrorResponse, public readonly network = false) {
    super(body.message);
  }
}

function isErrorResponse(x: unknown): x is ErrorResponse {
  return typeof x === 'object' && x !== null && typeof (x as ErrorResponse).code === 'string';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      signal: ctrl.signal,
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, { code: 'INTERNAL_ERROR', message: '서버에 연결할 수 없습니다.', fieldErrors: [] }, true);
  } finally {
    clearTimeout(timer);
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    if (isErrorResponse(body)) throw new ApiError(res.status, { ...body, fieldErrors: body.fieldErrors ?? [] });
    throw new ApiError(res.status, { code: 'INTERNAL_ERROR', message: '서버에 연결할 수 없습니다.', fieldErrors: [] }, true);
  }
  return body as T;
}

export async function getNutrients(): Promise<NutrientOption[]> {
  if (USE_MOCK) return mockNutrients;
  return request<NutrientOption[]>('/nutrients');
}

export async function getSizeClasses(): Promise<SizeClassOption[]> {
  if (USE_MOCK) return mockSizeClasses;
  return request<SizeClassOption[]>('/size-classes');
}

export async function convertUnit(req: UnitConvertRequest): Promise<UnitConvertResponse> {
  // 가짜 응답 모드에는 환산표가 없으므로 미리보기를 쓰지 않는다 (화면에서 숨김)
  if (USE_MOCK) throw new ApiError(501, { code: 'INTERNAL_ERROR', message: '가짜 응답 모드에서는 환산 미리보기를 쓰지 않습니다.', fieldErrors: [] });
  return request<UnitConvertResponse>('/units/convert', { method: 'POST', body: JSON.stringify(req) });
}

export async function analyze(req: AnalysisRequest): Promise<AnalysisResponse> {
  if (USE_MOCK) {
    await mockDelay();
    const { status, body } = pickMockAnalysis(req);
    if (status !== 200) throw new ApiError(status, body as ErrorResponse);
    return body as AnalysisResponse;
  }
  return request<AnalysisResponse>('/analyses', { method: 'POST', body: JSON.stringify(req) });
}
