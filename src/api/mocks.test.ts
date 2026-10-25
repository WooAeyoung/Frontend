import { describe, expect, it } from 'vitest';
import { MOCK_UNIT_ERROR_LABEL, mockResponses, pickMockAnalysis } from './mocks';
import type { AnalysisRequest } from '../types/api';

const base: AnalysisRequest = {
  pet: { species: 'DOG', weightKg: 10, ageValue: 36, ageUnit: 'MONTH', sizeClass: null },
  feeding: { feedGramsPerDay: 120, supplements: [] },
};

describe('가짜 응답 고르기 (데모 시나리오)', () => {
  it('S1 성견 / S3 고양이 / S4 7주 / S2 강아지', () => {
    expect(pickMockAnalysis(base).body).toBe(mockResponses.dogAdult);
    expect(pickMockAnalysis({ ...base, pet: { ...base.pet, species: 'CAT', ageValue: 3 } }).body).toBe(mockResponses.kitten);
    expect(pickMockAnalysis({ ...base, pet: { ...base.pet, species: 'CAT', ageValue: 7, ageUnit: 'WEEK' } }).body).toBe(mockResponses.unsupported);
    expect(pickMockAnalysis({ ...base, pet: { ...base.pet, ageValue: 12, ageUnit: 'WEEK', sizeClass: 'S' } }).body).toBe(mockResponses.puppy);
  });
  it('S7 개발용 단위 오류 스위치', () => {
    const r = pickMockAnalysis({ ...base, feeding: { feedGramsPerDay: null, supplements: [{ label: MOCK_UNIT_ERROR_LABEL, servingsPerDay: 1, ingredients: [] }] } });
    expect(r.status).toBe(400);
  });
});
