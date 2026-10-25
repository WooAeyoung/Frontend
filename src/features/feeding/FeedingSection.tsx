// 담당: B. 사료 급여량 + 영양제 카드(추가·삭제) + 성분 행(추가·삭제). 제어 컴포넌트.
// 성분 목록(nutrients)은 통합 페이지가 getNutrients() 로 받아 넘겨 준다.
import { useEffect, useMemo, useState } from 'react';
import { convertUnit, USE_MOCK } from '../../api/client';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { a11y, Field, FieldMessages, fieldId } from '../../components/Field';
import { formatNumber } from '../../format/number';
import type { NutrientId, NutrientOption } from '../../types/api';
import { FEED_GRAMS_PATH, ingredientPath, SUPPLEMENTS_PATH, supplementPath } from '../../validation/paths';
import { parseNumber } from '../../validation/rules';
import { errorsUnder } from '../../validation/types';
import type { SectionProps } from '../sectionProps';
import { changeNutrient, newIngredient, newSupplement, normalizeUnit } from './feeding';
import type { FeedingForm, IngredientForm, SupplementForm } from './types';

export interface FeedingSectionProps extends SectionProps<FeedingForm> {
  nutrients: NutrientOption[];
}

export function FeedingSection({ value, onChange, errors, disabled, nutrients }: FeedingSectionProps) {
  const groups = useMemo(() => groupByCategory(nutrients), [nutrients]);

  const setSupplements = (supplements: SupplementForm[], path: string) => onChange({ ...value, supplements }, path);
  const updateSupplement = (i: number, next: SupplementForm, path: string) =>
    setSupplements(value.supplements.map((s, k) => (k === i ? next : s)), path);

  return (
    <>
      <Card step={2} title="사료" labelledBy="sec-feed">
        <Field
          path={FEED_GRAMS_PATH} label="하루 사료 급여량" error={errors[FEED_GRAMS_PATH]}
          hint="비워 두면 필요 열량만큼 먹는다고 계산합니다."
        >
          <div className="input-affix">
            <input
              className="input num" inputMode="decimal" autoComplete="off" placeholder="예: 120" disabled={disabled}
              value={value.feedGrams}
              onChange={(e) => onChange({ ...value, feedGrams: e.target.value }, FEED_GRAMS_PATH)}
              {...a11y(FEED_GRAMS_PATH, errors[FEED_GRAMS_PATH])}
            />
            <span className="input-affix__suffix">g/일</span>
          </div>
        </Field>
      </Card>

      <Card
        step={3} title="영양제" labelledBy="sec-supp"
        desc="제품 라벨의 1회 함량을 성분별로 입력하세요. 영양제가 없으면 비워 두어도 됩니다."
      >
        <div className="stack">
          {value.supplements.map((s, i) => (
            <SupplementCard
              key={s.key} index={i} value={s} errors={errors} disabled={disabled} nutrients={nutrients} groups={groups}
              onChange={(next, path) => updateSupplement(i, next, path)}
              onRemove={() => setSupplements(value.supplements.filter((_, k) => k !== i), SUPPLEMENTS_PATH)}
            />
          ))}
          <Button variant="dashed" disabled={disabled} onClick={() => setSupplements([...value.supplements, newSupplement()], SUPPLEMENTS_PATH)}>
            ＋ 영양제 추가
          </Button>
        </div>
      </Card>
    </>
  );
}

type Groups = { category: string; items: NutrientOption[] }[];

function groupByCategory(nutrients: NutrientOption[]): Groups {
  const out: Groups = [];
  for (const n of [...nutrients].sort((a, b) => a.index - b.index)) {
    const g = out.find((x) => x.category === n.category);
    if (g) g.items.push(n);
    else out.push({ category: n.category, items: [n] });
  }
  return out;
}

interface SupplementCardProps {
  index: number;
  value: SupplementForm;
  errors: FeedingSectionProps['errors'];
  disabled?: boolean;
  nutrients: NutrientOption[];
  groups: Groups;
  onChange: (next: SupplementForm, path: string) => void;
  onRemove: () => void;
}

function SupplementCard({ index: i, value: s, errors, disabled, nutrients, groups, onChange, onRemove }: SupplementCardProps) {
  const labelPath = supplementPath(i, 'label');
  const servPath = supplementPath(i, 'servingsPerDay');
  const ingPath = supplementPath(i, 'ingredients');
  const invalid = Object.keys(errorsUnder(errors, supplementPath(i) + '.')).length > 0;

  const setRow = (j: number, row: IngredientForm, key: 'nutrientId' | 'amount' | 'unit') =>
    onChange({ ...s, ingredients: s.ingredients.map((r, k) => (k === j ? row : r)) }, ingredientPath(i, j, key));

  return (
    <div className="supp" data-invalid={invalid || undefined} data-path={supplementPath(i)}>
      <div className="supp__head">
        <span className="supp__index">영양제 {i + 1}</span>
        <Button variant="danger-ghost" size="sm" disabled={disabled} onClick={onRemove} aria-label={`영양제 ${i + 1} 삭제`}>삭제</Button>
      </div>

      <div className="supp__top">
        <Field path={labelPath} label="제품 이름" error={errors[labelPath]}>
          <input
            className="input" maxLength={60} placeholder="예: 종합 영양제" disabled={disabled}
            value={s.label} onChange={(e) => onChange({ ...s, label: e.target.value }, labelPath)}
            {...a11y(labelPath, errors[labelPath])}
          />
        </Field>
        <Field path={servPath} label="하루 횟수" error={errors[servPath]}>
          <div className="input-affix">
            <input
              className="input num" inputMode="decimal" autoComplete="off" disabled={disabled}
              value={s.servingsPerDay} onChange={(e) => onChange({ ...s, servingsPerDay: e.target.value }, servPath)}
              {...a11y(servPath, errors[servPath])}
            />
            <span className="input-affix__suffix">회</span>
          </div>
        </Field>
      </div>

      <div className="ing-list" data-path={ingPath}>
        <span className="ing-list__label" id={fieldId(ingPath)} tabIndex={-1}>성분 (1회 함량)</span>
        {s.ingredients.map((row, j) => (
          <IngredientRow
            key={row.key} i={i} j={j} row={row} errors={errors} disabled={disabled} nutrients={nutrients} groups={groups}
            onChange={(next, key) => setRow(j, next, key)}
            onRemove={() => onChange({ ...s, ingredients: s.ingredients.filter((_, k) => k !== j) }, SUPPLEMENTS_PATH)}
          />
        ))}
        <FieldMessages id={fieldId(ingPath)} error={errors[ingPath]} />
        <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onChange({ ...s, ingredients: [...s.ingredients, newIngredient()] }, SUPPLEMENTS_PATH)}>
          ＋ 성분 추가
        </Button>
      </div>
    </div>
  );
}

interface IngredientRowProps {
  i: number;
  j: number;
  row: IngredientForm;
  errors: FeedingSectionProps['errors'];
  disabled?: boolean;
  nutrients: NutrientOption[];
  groups: Groups;
  onChange: (next: IngredientForm, key: 'nutrientId' | 'amount' | 'unit') => void;
  onRemove: () => void;
}

function IngredientRow({ i, j, row, errors, disabled, nutrients, groups, onChange, onRemove }: IngredientRowProps) {
  const nPath = ingredientPath(i, j, 'nutrientId');
  const aPath = ingredientPath(i, j, 'amount');
  const uPath = ingredientPath(i, j, 'unit');
  const nutrient = nutrients.find((n) => n.id === row.nutrientId);
  const units = nutrient ? [...nutrient.units] : [];
  if (row.unit && !units.some((u) => normalizeUnit(u) === normalizeUnit(row.unit))) units.push(row.unit);
  const preview = useConvertPreview(row, nutrient);

  return (
    <div className="ing" data-path={ingredientPath(i, j)}>
      <div className="ing__nut">
        <label className="sr-only" htmlFor={a11y(nPath).id}>성분</label>
        <select
          className="select" disabled={disabled || nutrients.length === 0} value={row.nutrientId}
          onChange={(e) => onChange(changeNutrient(row, e.target.value as NutrientId | '', nutrients), 'nutrientId')}
          {...a11y(nPath, errors[nPath])}
        >
          <option value="">{nutrients.length === 0 ? '성분 목록을 불러오는 중…' : '성분 선택'}</option>
          {groups.map((g) => (
            <optgroup label={g.category} key={g.category}>
              {g.items.map((n) => <option value={n.id} key={n.id}>{n.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="ing__amt">
        <label className="sr-only" htmlFor={a11y(aPath).id}>1회 함량</label>
        <input
          className="input num" inputMode="decimal" autoComplete="off" placeholder="함량" disabled={disabled}
          value={row.amount} onChange={(e) => onChange({ ...row, amount: e.target.value }, 'amount')}
          {...a11y(aPath, errors[aPath])}
        />
      </div>
      <div className="ing__unit">
        <label className="sr-only" htmlFor={a11y(uPath).id}>단위</label>
        <select
          className="select" disabled={disabled || !nutrient} value={row.unit}
          onChange={(e) => onChange({ ...row, unit: e.target.value }, 'unit')}
          {...a11y(uPath, errors[uPath])}
        >
          {!nutrient && <option value="">단위</option>}
          {units.map((u) => <option value={u} key={u}>{u}</option>)}
        </select>
      </div>
      <button type="button" className="icon-btn ing__del" disabled={disabled} onClick={onRemove} aria-label={`성분 ${j + 1} 삭제`}>✕</button>
      <div className="ing__msgs">
        <FieldMessages id={fieldId(nPath)} error={errors[nPath]} />
        <FieldMessages id={fieldId(aPath)} error={errors[aPath]} />
        <FieldMessages id={fieldId(uPath)} error={errors[uPath]} />
        {preview && <span className="ing__preview num">= {preview}</span>}
      </div>
    </div>
  );
}

/** 환산 미리보기 (선택 기능). 실제 백엔드에서만, 기준 단위와 다를 때만. */
function useConvertPreview(row: IngredientForm, nutrient: NutrientOption | undefined): string | null {
  const [text, setText] = useState<string | null>(null);
  const amount = parseNumber(row.amount);
  const unit = normalizeUnit(row.unit);
  const skip = USE_MOCK || !nutrient || amount === null || amount < 0 || unit === '' || unit === nutrient.baseUnit
    || !nutrient.units.some((u) => normalizeUnit(u) === unit);

  useEffect(() => {
    if (skip || !nutrient || amount === null) { setText(null); return; }
    let alive = true;
    const t = setTimeout(() => {
      convertUnit({ nutrientId: nutrient.id, amount, unit })
        .then((r) => alive && setText(`${formatNumber(r.baseAmount)} ${r.baseUnit}`))
        .catch(() => alive && setText(null));
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [skip, nutrient, amount, unit]);

  return skip ? null : text;
}
