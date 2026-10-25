import { describe, expect, it } from 'vitest';
import cases from '@contract/display-number-cases.json';
import { formatNumber } from './number';

describe('formatNumber (백엔드 DisplayNumber 와 공통 케이스)', () => {
  for (const [input, expected] of cases as [number | null, string][]) {
    it(`${input} → ${expected}`, () => {
      expect(formatNumber(input)).toBe(expected);
    });
  }
});
