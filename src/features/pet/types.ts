// 담당: A. 반려동물 정보 입력 상태. 입력칸은 문자열로 들고 있다가 제출할 때 숫자로 바꾼다.
import type { AgeUnit, SizeClass, Species } from '../../types/api';

export interface PetForm {
  species: Species;
  weightKg: string;
  ageValue: string;
  ageUnit: AgeUnit;
  /** '' = 선택 안 함 */
  sizeClass: SizeClass | '';
}

export const emptyPetForm: PetForm = {
  species: 'DOG',
  weightKg: '',
  ageValue: '',
  ageUnit: 'MONTH',
  sizeClass: '',
};
