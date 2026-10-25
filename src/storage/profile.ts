// 프로필 저장 (구현계획서 6.5). 브라우저 localStorage 에만 저장하고 서버는 저장하지 않는다.
// 사생활 보호 모드 등에서 저장소가 막혀도 화면은 정상 동작해야 하므로 모든 접근을 try/catch 로 감싼다.
import type { FeedingInput, PetInput } from '../types/api';

export const PROFILE_KEY = 'wooaeyoung.profile.v1';
export const PROFILE_SCHEMA_VERSION = 1;

export interface SavedProfile {
  schemaVersion: number;
  pet: PetInput;
  feeding: FeedingInput;
  savedAt: string;
}

/** 테스트에서 가짜 저장소를 넣을 수 있게 저장소를 인자로 받는다. */
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function saveProfile(pet: PetInput, feeding: FeedingInput, storage = defaultStorage()): boolean {
  if (!storage) return false;
  const data: SavedProfile = { schemaVersion: PROFILE_SCHEMA_VERSION, pet, feeding, savedAt: new Date().toISOString() };
  try {
    storage.setItem(PROFILE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** 없거나, 깨졌거나, 버전이 다르면 null (빈 폼으로 시작). */
export function loadProfile(storage = defaultStorage()): SavedProfile | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedProfile;
    return data?.schemaVersion === PROFILE_SCHEMA_VERSION ? data : null;
  } catch {
    return null;
  }
}

export function clearProfile(storage = defaultStorage()): void {
  try {
    storage?.removeItem(PROFILE_KEY);
  } catch {
    /* 저장소를 쓸 수 없어도 무시 */
  }
}
