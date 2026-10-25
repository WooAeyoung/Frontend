import { describe, expect, it } from 'vitest';
import { fromPetInput, needsSizeClass, petWarnings, toPetInput, validatePet } from './pet';
import { emptyPetForm, type PetForm } from './types';
import { petPath } from '../../validation/paths';

const dog = (p: Partial<PetForm> = {}): PetForm => ({ ...emptyPetForm, species: 'DOG', weightKg: '10', ageValue: '36', ageUnit: 'MONTH', ...p });
const cat = (p: Partial<PetForm> = {}): PetForm => ({ ...dog(p), species: 'CAT', ...p });

describe('validatePet — 체중', () => {
  it.each([['', 'REQUIRED'], ['abc', 'REQUIRED'], ['0', 'WEIGHT_RANGE'], ['-1', 'WEIGHT_RANGE']])('%s → %s', (w, code) => {
    expect(validatePet(dog({ weightKg: w }))[petPath('weightKg')]).toBe(code);
  });
  it('0.5 는 통과', () => expect(validatePet(dog({ weightKg: '0.5' }))).toEqual({}));
});

describe('validatePet — 나이·체급', () => {
  it.each([['', 'REQUIRED'], ['x', 'REQUIRED'], ['0', 'AGE_RANGE'], ['-3', 'AGE_RANGE']])('나이 %s → %s', (a, code) => {
    expect(validatePet(dog({ ageValue: a }))[petPath('ageValue')]).toBe(code);
  });
  it('개 11개월 체급 없음 → SIZE_CLASS_REQUIRED (S5)', () => {
    expect(validatePet(dog({ ageValue: '11', sizeClass: '' }))[petPath('sizeClass')]).toBe('SIZE_CLASS_REQUIRED');
  });
  it('체급 고르면 통과', () => expect(validatePet(dog({ ageValue: '11', sizeClass: 'M' }))).toEqual({}));
});

describe('needsSizeClass 경계', () => {
  it.each([
    ['52.13', 'WEEK', true], ['52.14', 'WEEK', false], ['11.99', 'MONTH', true], ['12', 'MONTH', false],
  ] as const)('%s %s → %s', (age, unit, need) => {
    expect(needsSizeClass(dog({ ageValue: age, ageUnit: unit }))).toBe(need);
  });
  it('고양이는 항상 불필요', () => expect(needsSizeClass(cat({ ageValue: '3', ageUnit: 'WEEK' }))).toBe(false));
  it('나이를 못 읽으면 불필요', () => expect(needsSizeClass(dog({ ageValue: '' }))).toBe(false));
});

describe('petWarnings', () => {
  it('개 100 → 없음, 100.1 → 경고', () => {
    expect(petWarnings(dog({ weightKg: '100' }))).toEqual({});
    expect(petWarnings(dog({ weightKg: '100.1' }))[petPath('weightKg')]).toBe('WEIGHT_UNUSUAL');
  });
  it('고양이 15 → 없음, 15.1 → 경고', () => {
    expect(petWarnings(cat({ weightKg: '15' }))).toEqual({});
    expect(petWarnings(cat({ weightKg: '15.1' }))[petPath('weightKg')]).toBe('WEIGHT_UNUSUAL');
  });
  it('나이 > 25년 → AGE_UNUSUAL', () => {
    expect(petWarnings(dog({ ageValue: '300' }))).toEqual({});
    expect(petWarnings(dog({ ageValue: '301' }))[petPath('ageValue')]).toBe('AGE_UNUSUAL');
  });
  it('150 kg 은 경고만, 막지 않음 (S9)', () => {
    expect(validatePet(dog({ weightKg: '150' }))).toEqual({});
  });
});

describe('toPetInput / fromPetInput', () => {
  it('고양이로 바꾸면 남은 체급을 보내지 않음', () => {
    expect(toPetInput(cat({ ageValue: '3', sizeClass: 'S' })).sizeClass).toBeNull();
  });
  it('성견은 sizeClass null, 강아지는 그대로', () => {
    expect(toPetInput(dog({ sizeClass: 'L' })).sizeClass).toBeNull();
    expect(toPetInput(dog({ ageValue: '12', ageUnit: 'WEEK', sizeClass: 'S' }))).toEqual({
      species: 'DOG', weightKg: 10, ageValue: 12, ageUnit: 'WEEK', sizeClass: 'S',
    });
  });
  it('왕복', () => {
    const f = dog({ weightKg: '4.5', ageValue: '10', ageUnit: 'WEEK', sizeClass: 'XL' });
    expect(fromPetInput(toPetInput(f))).toEqual(f);
    expect(fromPetInput({ species: 'CAT', weightKg: 4, ageValue: 3, ageUnit: 'MONTH', sizeClass: null }).sizeClass).toBe('');
  });
});
