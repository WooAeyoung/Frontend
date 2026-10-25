// API 형식 (contract/openapi.yaml 과 1:1). 바꿀 때는 docs/CONTRACT.md 절차를 따른다.
// 값이 없으면 null. 0으로 바꾸지 않는다.

// ---------- enums ----------
export const SPECIES = ['DOG', 'CAT'] as const;
export type Species = (typeof SPECIES)[number];

export const AGE_UNITS = ['WEEK', 'MONTH'] as const;
export type AgeUnit = (typeof AGE_UNITS)[number];

export const SIZE_CLASSES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export type SizeClass = (typeof SIZE_CLASSES)[number];

export const LIFE_STAGES = [
  'UNSUPPORTED', 'DOG_EARLY_GROWTH', 'DOG_LATE_GROWTH', 'DOG_ADULT',
  'CAT_GROWTH_1', 'CAT_GROWTH_2', 'CAT_GROWTH_3', 'CAT_ADULT',
] as const;
export type LifeStage = (typeof LIFE_STAGES)[number];

export const JUDGE_STATUSES = [
  'UNSUPPORTED', 'NO_STANDARD', 'DEFICIENT', 'EXCESS', 'CAUTION', 'ADEQUATE', 'ADEQUATE_NO_UPPER',
] as const;
export type JudgeStatus = (typeof JUDGE_STATUSES)[number];

export const RATIO_STATUSES = ['LOW', 'ADEQUATE', 'HIGH', 'NOT_APPLICABLE'] as const;
export type RatioStatus = (typeof RATIO_STATUSES)[number];

export const BASE_UNITS = ['g', 'mg', 'µg', 'IU'] as const;
export type BaseUnit = (typeof BASE_UNITS)[number];

export const NUTRIENT_IDS = [
  'PROTEIN', 'ARG', 'HIS', 'ILE', 'LEU', 'LYS', 'MET', 'MET_CYS', 'PHE', 'PHE_TYR', 'THR', 'TRP', 'VAL', 'TAURINE',
  'FAT', 'LA', 'ARA', 'ALA', 'EPA_DHA', 'CA', 'P', 'K', 'NA', 'CL', 'MG', 'CU', 'I', 'FE', 'MN', 'SE', 'ZN',
  'VIT_A', 'VIT_D', 'VIT_E', 'VIT_B1', 'VIT_B2', 'VIT_B5', 'VIT_B6', 'VIT_B12', 'VIT_B3', 'VIT_B9', 'VIT_B7', 'CHOLINE', 'VIT_K',
] as const;
export type NutrientId = (typeof NUTRIENT_IDS)[number];

export const NOTICE_CODES = ['NOTICE_NO_UPPER', 'NOTICE_FEED_ESTIMATE', 'NOTICE_UNSUPPORTED', 'NOTICE_REFERENCE'] as const;
export type NoticeCode = (typeof NOTICE_CODES)[number];

export const WARNING_CODES = ['WEIGHT_CLIPPED', 'UNSUPPORTED_AGE', 'FEED_ASSUMED', 'WEIGHT_UNUSUAL', 'AGE_UNUSUAL'] as const;
export type WarningCode = (typeof WARNING_CODES)[number];

export const ERROR_CODES = [
  'VALIDATION_ERROR', 'UNSUPPORTED_UNIT', 'NUTRIENT_NOT_IMPLEMENTED', 'NUTRIENT_NOT_FOUND', 'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const FIELD_ERROR_CODES = [
  'REQUIRED', 'WEIGHT_RANGE', 'AGE_RANGE', 'SIZE_CLASS_REQUIRED', 'SERVINGS_RANGE', 'AMOUNT_RANGE',
  'FEED_RANGE', 'INGREDIENTS_EMPTY', 'UNSUPPORTED_UNIT', 'NUTRIENT_NOT_IMPLEMENTED', 'LABEL_LENGTH',
] as const;
export type FieldErrorCode = (typeof FIELD_ERROR_CODES)[number];

// ---------- 목록 ----------
export interface NutrientOption {
  index: number;
  id: NutrientId;
  name: string;
  category: string;
  baseUnit: BaseUnit;
  /** 입력 가능 단위. 첫 번째가 기본 선택 */
  units: string[];
}

export interface UnitOptions {
  id: NutrientId;
  baseUnit: BaseUnit;
  units: string[];
}

export interface SizeClassOption {
  code: SizeClass;
  label: string;
  /** 초과 */
  minKg: number;
  /** 이하. XXL은 null */
  maxKg: number | null;
  exampleBreeds: string[];
}

export interface UnitConvertRequest {
  nutrientId: NutrientId;
  amount: number;
  unit: string;
}

export interface UnitConvertResponse {
  nutrientId: NutrientId;
  baseAmount: number;
  baseUnit: BaseUnit;
}

// ---------- 분석 요청 ----------
export interface PetInput {
  species: Species;
  weightKg: number;
  ageValue: number;
  ageUnit: AgeUnit;
  /** 12개월 미만 개만 필수. 그 외 null */
  sizeClass: SizeClass | null;
}

export interface IngredientInput {
  nutrientId: NutrientId;
  /** 1회 함량 */
  amount: number;
  unit: string;
}

export interface SupplementInput {
  label: string;
  servingsPerDay: number;
  ingredients: IngredientInput[];
}

export interface FeedingInput {
  /** 사료 1일 급여량(g). null 또는 0이면 필요 열량만큼 먹는다고 가정 */
  feedGramsPerDay: number | null;
  supplements: SupplementInput[];
}

export interface AnalysisRequest {
  pet: PetInput;
  feeding: FeedingInput;
}

// ---------- 분석 응답 ----------
export interface EnergyInfo {
  k: number | null;
  energyKcal: number | null;
  intakeKcal: number | null;
  energyRatio: number | null;
  growthRatio: number | null;
  estimatedAdultKg: number | null;
  estimatedAdultKgClipped: number | null;
  weightClipped: boolean;
}

export interface ChartBar {
  nutrientId: NutrientId;
  nutrientName: string;
  unit: BaseUnit;
  feedValue: number | null;
  supplementValue: number;
  total: number | null;
  lower: number | null;
  caution: number | null;
  upper: number | null;
  status: JudgeStatus;
}

export interface CaPRatio {
  value: number | null;
  status: RatioStatus;
}

export interface GuideItem {
  nutrientId: NutrientId;
  nutrientName: string;
  unit: BaseUnit;
  status: JudgeStatus;
  shortageRatio: number;
  cautionRatio: number | null;
  needAmount: number | null;
  addableAmount: number | null;
  reduceAmount: number | null;
  noUpper: boolean;
  text: string;
}

export interface Message {
  code: NoticeCode;
  message: string;
}

export interface Warning {
  code: WarningCode;
  message: string;
}

export interface AnalysisResponse {
  lifeStage: LifeStage;
  energy: EnergyInfo;
  energyRatioText: string | null;
  bars: ChartBar[];
  caPRatio: CaPRatio;
  caPRatioText: string | null;
  guide: GuideItem[];
  notices: Message[];
  warnings: Warning[];
}

// ---------- 오류 ----------
export interface FieldError {
  field: string;
  code: FieldErrorCode;
  message: string;
}

export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  fieldErrors: FieldError[];
}
