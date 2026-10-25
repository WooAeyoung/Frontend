// contract/examples 가 api.ts 의 enum 값만 쓰는지 확인한다 (형식 전체 검사는 tools/contract/check_contract.py).
import { describe, expect, it } from 'vitest';
import {
  JUDGE_STATUSES, LIFE_STAGES, NOTICE_CODES, NUTRIENT_IDS, RATIO_STATUSES, WARNING_CODES, BASE_UNITS,
} from './api';
import { mockResponses, mockNutrients } from '../api/mocks';

describe('contract examples', () => {
  for (const [name, r] of Object.entries(mockResponses)) {
    it(`${name}: enum 값이 api.ts 와 일치`, () => {
      expect(LIFE_STAGES).toContain(r.lifeStage);
      expect(RATIO_STATUSES).toContain(r.caPRatio.status);
      for (const b of r.bars) {
        expect(NUTRIENT_IDS).toContain(b.nutrientId);
        expect(JUDGE_STATUSES).toContain(b.status);
        expect(BASE_UNITS).toContain(b.unit);
      }
      for (const g of r.guide) expect(JUDGE_STATUSES).toContain(g.status);
      for (const n of r.notices) expect(NOTICE_CODES).toContain(n.code);
      for (const w of r.warnings) expect(WARNING_CODES).toContain(w.code);
    });
  }
  it('성분 목록은 18개, 단위 목록이 비어 있지 않음', () => {
    expect(mockNutrients).toHaveLength(18);
    for (const n of mockNutrients) expect(n.units.length).toBeGreaterThan(0);
  });
});
