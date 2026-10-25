import { describe, expect, it } from 'vitest';
import { FIELD_ERROR_CODES, ERROR_CODES, WARNING_CODES } from '../types/api';
import { ERROR_MESSAGES, FIELD_ERROR_MESSAGES, WARNING_MESSAGES } from './messages';
import { ingredientPath, petPath, supplementPath } from './paths';
import { parseNumber } from './rules';
import { clearPath, errorsUnder, fromServerErrors, mergeErrors } from './types';
import sizeClassRequired from '@contract/examples/error-response.size-class-required.json';
import unsupportedUnit from '@contract/examples/error-response.unsupported-unit.json';
import type { ErrorResponse } from '../types/api';

describe('경로 함수는 서버 오류 field 와 같은 문자열을 만든다', () => {
  it('예시 오류 응답의 field 와 일치', () => {
    expect((sizeClassRequired as unknown as ErrorResponse).fieldErrors[0].field).toBe(petPath('sizeClass'));
    expect((unsupportedUnit as unknown as ErrorResponse).fieldErrors[0].field).toBe(ingredientPath(0, 0, 'unit'));
    expect(supplementPath(2, 'servingsPerDay')).toBe('feeding.supplements[2].servingsPerDay');
  });
});

describe('FieldErrors 도우미', () => {
  const e = fromServerErrors([
    { field: 'pet.weightKg', code: 'WEIGHT_RANGE', message: '' },
    { field: 'feeding.supplements[0].ingredients[1].unit', code: 'UNSUPPORTED_UNIT', message: '' },
    { field: 'feeding.supplements[10].label', code: 'LABEL_LENGTH', message: '' },
  ]);
  it('prefix 로 고르기', () => {
    expect(Object.keys(errorsUnder(e, 'feeding.supplements[0]'))).toEqual(['feeding.supplements[0].ingredients[1].unit']);
  });
  it('칸을 고치면 그 칸과 하위 경로만 지움 ([1] 이 [10] 을 지우지 않음)', () => {
    expect(Object.keys(clearPath(e, 'feeding.supplements[1]'))).toHaveLength(3);
    expect(Object.keys(clearPath(e, 'feeding.supplements'))).toEqual(['pet.weightKg']);
    expect(Object.keys(clearPath(e, 'pet.weightKg'))).toHaveLength(2);
  });
  it('합칠 때 앞의 것이 남음', () => {
    expect(mergeErrors({ a: 'REQUIRED' }, { a: 'WEIGHT_RANGE', b: 'AGE_RANGE' })).toEqual({ a: 'REQUIRED', b: 'AGE_RANGE' });
  });
});

describe('문구 표에 빠진 코드가 없다', () => {
  it('모든 코드에 문구', () => {
    for (const c of FIELD_ERROR_CODES) expect(FIELD_ERROR_MESSAGES[c]).toBeTruthy();
    for (const c of ERROR_CODES) expect(ERROR_MESSAGES[c]).toBeTruthy();
    for (const c of WARNING_CODES) expect(WARNING_MESSAGES[c]).toBeTruthy();
  });
});

describe('parseNumber', () => {
  it.each([['10', 10], [' 1,000 ', 1000], ['', null], ['abc', null], ['0', 0], ['-1', -1], ['1e3', 1000]])('%s → %s', (t, n) => {
    expect(parseNumber(t)).toBe(n);
  });
});
