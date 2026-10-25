// 담당: A. 반려동물 정보 입력 (제어 컴포넌트). 로직은 pet.ts, 모양은 공통 UI(src/components).
// 체급 목록은 getSizeClasses() 로 받아 대표 품종과 함께 보여 준다.
import { useEffect, useState } from 'react';
import { getSizeClasses } from '../../api/client';
import { a11y, Field, FieldMessages, fieldId } from '../../components/Field';
import { Card } from '../../components/Card';
import { SIZE_CLASSES, type AgeUnit, type SizeClass, type SizeClassOption, type Species } from '../../types/api';
import { petPath } from '../../validation/paths';
import type { SectionProps } from '../sectionProps';
import { needsSizeClass } from './pet';
import type { PetForm } from './types';

/** 체급 목록을 못 받았을 때 보여 줄 최소 정보 (openapi SizeClass 설명과 같음) */
const FALLBACK_SIZE_LABELS: Record<SizeClass, string> = {
  S: '7 kg 이하', M: '7~15 kg', L: '15~27.5 kg', XL: '27.5~47.5 kg', XXL: '47.5 kg 초과',
};

const SPECIES_OPTIONS: { value: Species; label: string }[] = [
  { value: 'DOG', label: '🐶 개' },
  { value: 'CAT', label: '🐱 고양이' },
];
const AGE_UNIT_OPTIONS: { value: AgeUnit; label: string }[] = [
  { value: 'MONTH', label: '개월' },
  { value: 'WEEK', label: '주' },
];

export function useSizeClasses(): SizeClassOption[] | null {
  const [list, setList] = useState<SizeClassOption[] | null>(null);
  useEffect(() => {
    let alive = true;
    getSizeClasses().then((l) => alive && setList(l)).catch(() => alive && setList(null));
    return () => { alive = false; };
  }, []);
  return list;
}

export function PetSection({ value, onChange, errors, warnings = {}, disabled }: SectionProps<PetForm>) {
  const sizeClasses = useSizeClasses();
  const showSize = needsSizeClass(value);
  const set = <K extends keyof PetForm>(key: K, v: PetForm[K]) => onChange({ ...value, [key]: v }, petPath(key));

  const wPath = petPath('weightKg');
  const aPath = petPath('ageValue');
  const sPath = petPath('sizeClass');
  const sizeOptions: SizeClassOption[] = sizeClasses ?? SIZE_CLASSES.map((code) => ({
    code, label: FALLBACK_SIZE_LABELS[code], minKg: 0, maxKg: null, exampleBreeds: [],
  }));

  return (
    <Card step={1} title="반려동물 정보" labelledBy="sec-pet">
      <div className="stack">
        <Field path={petPath('species')} label="종" asGroup error={errors[petPath('species')]}>
          <div className="segment segment--full" role="radiogroup" aria-labelledby={fieldId(petPath('species')) + '-label'}>
            {SPECIES_OPTIONS.map((o) => (
              <label className="segment__item" key={o.value}>
                <input
                  type="radio" name="species" value={o.value} checked={value.species === o.value} disabled={disabled}
                  id={o.value === value.species ? fieldId(petPath('species')) : undefined}
                  onChange={() => set('species', o.value)}
                />
                <span className="segment__label">{o.label}</span>
              </label>
            ))}
          </div>
        </Field>

        <div className="field-grid">
          <Field path={wPath} label="체중" error={errors[wPath]} warning={warnings[wPath]}>
            <div className="input-affix">
              <input
                className="input num" inputMode="decimal" autoComplete="off" placeholder="예: 10" disabled={disabled}
                value={value.weightKg} onChange={(e) => set('weightKg', e.target.value)}
                {...a11y(wPath, errors[wPath], warnings[wPath])}
              />
              <span className="input-affix__suffix">kg</span>
            </div>
          </Field>

          <Field path={aPath} label="나이" error={errors[aPath] ?? errors[petPath('ageUnit')]} warning={warnings[aPath]}>
            <div className="field__row">
              <input
                className="input num" inputMode="decimal" autoComplete="off" placeholder="예: 36" disabled={disabled}
                value={value.ageValue} onChange={(e) => set('ageValue', e.target.value)}
                {...a11y(aPath, errors[aPath], warnings[aPath])}
              />
              <div className="segment" role="radiogroup" aria-label="나이 단위">
                {AGE_UNIT_OPTIONS.map((o) => (
                  <label className="segment__item" key={o.value}>
                    <input
                      type="radio" name="ageUnit" value={o.value} checked={value.ageUnit === o.value} disabled={disabled}
                      onChange={() => set('ageUnit', o.value)}
                    />
                    <span className="segment__label">{o.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </Field>
        </div>

        {showSize && (
          <div className="field" data-path={sPath}>
            <span className="field__label" id={fieldId(sPath) + '-label'}>예상 성체 체급</span>
            <span className="field__hint">12개월 미만 강아지는 다 자랐을 때의 체급으로 필요 열량을 계산합니다.</span>
            <div className="size-list" role="radiogroup" aria-labelledby={fieldId(sPath) + '-label'} aria-invalid={errors[sPath] ? true : undefined}>
              {sizeOptions.map((o, idx) => (
                <label className="size-opt" key={o.code}>
                  <input
                    type="radio" name="sizeClass" value={o.code} checked={value.sizeClass === o.code} disabled={disabled}
                    id={idx === 0 ? fieldId(sPath) : undefined}
                    onChange={() => set('sizeClass', o.code)}
                  />
                  <span className="size-opt__code">{o.code}</span>
                  <span className="size-opt__body">
                    <span className="size-opt__label">{o.label}</span>
                    {o.exampleBreeds.length > 0 && <span className="size-opt__breeds"> · {o.exampleBreeds.join(', ')}</span>}
                  </span>
                </label>
              ))}
            </div>
            <FieldMessages id={fieldId(sPath)} error={errors[sPath]} />
          </div>
        )}
      </div>
    </Card>
  );
}
