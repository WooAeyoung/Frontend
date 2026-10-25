import { describe, expect, it } from 'vitest';
import { loadProfile, PROFILE_KEY, saveProfile } from './profile';
import type { FeedingInput, PetInput } from '../types/api';

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}
const throwing = {
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('blocked'); },
  removeItem: () => { throw new Error('blocked'); },
};
const pet: PetInput = { species: 'DOG', weightKg: 10, ageValue: 36, ageUnit: 'MONTH', sizeClass: null };
const feeding: FeedingInput = { feedGramsPerDay: 120, supplements: [] };

describe('profile storage', () => {
  it('저장 후 그대로 복원', () => {
    const s = memoryStorage();
    expect(saveProfile(pet, feeding, s)).toBe(true);
    expect(loadProfile(s)?.pet).toEqual(pet);
  });
  it('저장소가 막혀도 예외 없이 false / null', () => {
    expect(saveProfile(pet, feeding, throwing)).toBe(false);
    expect(loadProfile(throwing)).toBeNull();
  });
  it('버전이 다르거나 깨진 값이면 null', () => {
    const s = memoryStorage();
    s.setItem(PROFILE_KEY, JSON.stringify({ schemaVersion: 99, pet, feeding }));
    expect(loadProfile(s)).toBeNull();
    s.setItem(PROFILE_KEY, '{broken');
    expect(loadProfile(s)).toBeNull();
  });
});
