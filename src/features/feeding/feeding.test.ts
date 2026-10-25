import { describe, expect, it } from 'vitest';
import dogReq from '@contract/examples/analysis-request.dog-adult-feed120-vitd.json';
import kittenReq from '@contract/examples/analysis-request.kitten-no-feed.json';
import puppyReq from '@contract/examples/analysis-request.puppy-clipped-excess.json';
import { mockNutrients as nutrients } from '../../api/mocks';
import type { FeedingInput } from '../../types/api';
import { FEED_GRAMS_PATH, ingredientPath, supplementPath } from '../../validation/paths';
import { changeNutrient, fromFeedingInput, newIngredient, newSupplement, normalizeUnit, toFeedingInput, validateFeeding } from './feeding';
import type { FeedingForm, IngredientForm, SupplementForm } from './types';

const ing = (p: Partial<IngredientForm> = {}): IngredientForm => ({ key: 'i', nutrientId: 'CA', amount: '100', unit: 'mg', ...p });
const supp = (p: Partial<SupplementForm> = {}): SupplementForm => ({ key: 's', label: '칼슘', servingsPerDay: '1', ingredients: [ing()], ...p });
const form = (p: Partial<FeedingForm> = {}): FeedingForm => ({ feedGrams: '', supplements: [supp()], ...p });

describe('validateFeeding', () => {
  it('정상 입력과 영양제 0개는 오류 없음', () => {
    expect(validateFeeding(form(), nutrients)).toEqual({});
    expect(validateFeeding({ feedGrams: '', supplements: [] }, nutrients)).toEqual({});
  });
  it.each([['', undefined], ['0', undefined], ['120', undefined], ['-1', 'FEED_RANGE'], ['abc', 'FEED_RANGE']])('급여량 %s → %s', (g, code) => {
    expect(validateFeeding(form({ feedGrams: g }), nutrients)[FEED_GRAMS_PATH]).toBe(code);
  });
  it('이름 1~30자 (앞뒤 공백 제거)', () => {
    expect(validateFeeding(form({ supplements: [supp({ label: '   ' })] }), nutrients)[supplementPath(0, 'label')]).toBe('LABEL_LENGTH');
    expect(validateFeeding(form({ supplements: [supp({ label: 'a'.repeat(31) })] }), nutrients)[supplementPath(0, 'label')]).toBe('LABEL_LENGTH');
    expect(validateFeeding(form({ supplements: [supp({ label: ` ${'a'.repeat(30)} ` })] }), nutrients)).toEqual({});
  });
  it.each([['', 'REQUIRED'], ['x', 'REQUIRED'], ['0', 'SERVINGS_RANGE'], ['-1', 'SERVINGS_RANGE']])('횟수 %s → %s', (v, code) => {
    expect(validateFeeding(form({ supplements: [supp({ servingsPerDay: v })] }), nutrients)[supplementPath(0, 'servingsPerDay')]).toBe(code);
  });
  it('성분 없음 → INGREDIENTS_EMPTY', () => {
    expect(validateFeeding(form({ supplements: [supp({ ingredients: [] })] }), nutrients)[supplementPath(0, 'ingredients')]).toBe('INGREDIENTS_EMPTY');
  });
  it('성분 미선택 → REQUIRED', () => {
    expect(validateFeeding(form({ supplements: [supp({ ingredients: [ing({ nutrientId: '', unit: '' })] })] }), nutrients)[ingredientPath(0, 0, 'nutrientId')]).toBe('REQUIRED');
  });
  it.each([['', 'REQUIRED'], ['x', 'REQUIRED'], ['-0.1', 'AMOUNT_RANGE'], ['0', undefined]])('함량 %s → %s', (v, code) => {
    expect(validateFeeding(form({ supplements: [supp({ ingredients: [ing({ amount: v })] })] }), nutrients)[ingredientPath(0, 0, 'amount')]).toBe(code);
  });
  it('칼슘에 IU → UNSUPPORTED_UNIT, 비타민 D 에 mcg 는 통과', () => {
    expect(validateFeeding(form({ supplements: [supp({ ingredients: [ing({ unit: 'IU' })] })] }), nutrients)[ingredientPath(0, 0, 'unit')]).toBe('UNSUPPORTED_UNIT');
    expect(validateFeeding(form({ supplements: [supp({ ingredients: [ing({ nutrientId: 'VIT_D', unit: 'mcg', amount: '10' })] })] }), nutrients)).toEqual({});
  });
  it('같은 성분 두 번은 오류 아님', () => {
    expect(validateFeeding(form({ supplements: [supp({ ingredients: [ing({ key: 'a' }), ing({ key: 'b' })] })] }), nutrients)).toEqual({});
  });
  it('두 번째 영양제 두 번째 성분 경로', () => {
    const f = form({ supplements: [supp(), supp({ ingredients: [ing(), ing({ amount: '' })] })] });
    expect(Object.keys(validateFeeding(f, nutrients))).toEqual(['feeding.supplements[1].ingredients[1].amount']);
  });
});

describe('단위 정규화', () => {
  it.each([['μg', 'µg'], ['mcg', 'µg'], ['MCG', 'µg'], ['ug', 'µg'], ['µg', 'µg'], ['iu', 'IU'], ['IU', 'IU'], ['mg', 'mg']])('%s → %s', (a, b) => {
    expect(normalizeUnit(a)).toBe(b);
  });
  it('요청에도 정규화한 값을 보냄', () => {
    const out = toFeedingInput(form({ supplements: [supp({ ingredients: [ing({ nutrientId: 'VIT_D', unit: 'μg', amount: '10' })] })] }), nutrients);
    expect(out.supplements[0].ingredients[0].unit).toBe('µg');
  });
});

describe('행 만들기 · changeNutrient', () => {
  it('새 영양제는 성분 행 1개, key 는 서로 다름', () => {
    const a = newSupplement();
    const b = newSupplement();
    expect(a.ingredients).toHaveLength(1);
    expect(a.key).not.toBe(b.key);
    expect(newIngredient().nutrientId).toBe('');
  });
  it('성분을 바꾸면 단위가 그 성분의 첫 단위', () => {
    const vitD = nutrients.find((n) => n.id === 'VIT_D')!;
    expect(changeNutrient(ing({ unit: 'mg' }), 'VIT_D', nutrients).unit).toBe(vitD.units[0]);
    expect(changeNutrient(ing(), '', nutrients)).toMatchObject({ nutrientId: '', unit: '' });
  });
});

/** 예시 요청 JSON 의 feeding 과 같은 입력 상태 */
function formFrom(input: FeedingInput): FeedingForm {
  return fromFeedingInput(input);
}

describe('요청 형식 = contract/examples', () => {
  it.each([
    ['성견 사료 120 g + 비타민 D', dogReq],
    ['아기 고양이 급여량 미입력', kittenReq],
    ['강아지 칼슘·비타민 A', puppyReq],
  ])('%s', (_, req) => {
    const expected = (req as unknown as { feeding: FeedingInput }).feeding;
    expect(toFeedingInput(formFrom(expected), nutrients)).toEqual(expected);
  });
  it('손으로 만든 입력 상태도 같음 (성견 예시)', () => {
    const f: FeedingForm = {
      feedGrams: '120',
      supplements: [{ key: 'x', label: ' 비타민D 츄 ', servingsPerDay: '1', ingredients: [{ key: 'y', nutrientId: 'VIT_D', amount: '10', unit: 'mcg' }] }],
    };
    expect(toFeedingInput(f, nutrients)).toEqual((dogReq as unknown as { feeding: FeedingInput }).feeding);
  });
  it('요청에 key 같은 화면용 값이 섞이지 않음 (서버 fail-on-unknown-properties)', () => {
    const out = toFeedingInput(form(), nutrients);
    expect(Object.keys(out.supplements[0]).sort()).toEqual(['ingredients', 'label', 'servingsPerDay']);
    expect(Object.keys(out.supplements[0].ingredients[0]).sort()).toEqual(['amount', 'nutrientId', 'unit']);
  });
  it('급여량 0 은 0, 빈칸은 null', () => {
    expect(toFeedingInput(form({ feedGrams: '0' }), nutrients).feedGramsPerDay).toBe(0);
    expect(toFeedingInput(form({ feedGrams: '' }), nutrients).feedGramsPerDay).toBeNull();
  });
  it('fromFeedingInput → toFeedingInput 왕복', () => {
    const input: FeedingInput = { feedGramsPerDay: 85.5, supplements: [{ label: 'A', servingsPerDay: 0.5, ingredients: [{ nutrientId: 'ZN', amount: 3, unit: 'mg' }] }] };
    expect(toFeedingInput(fromFeedingInput(input), nutrients)).toEqual(input);
  });
});
