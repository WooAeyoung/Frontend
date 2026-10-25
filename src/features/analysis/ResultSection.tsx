// 담당: C. 결과 화면 (구현계획서 6.1): 열량 요약, 성분 막대 목록, 칼슘:인, 보충량 안내, 고지.
// ResultView 만 보고 그린다. 판정·기준선은 서버 값 그대로 (INV-03).
import { useMemo, useState } from 'react';
import { Banner } from '../../components/Banner';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { formatNumber } from '../../format/number';
import type { JudgeStatus } from '../../types/api';
import { RATIO_STATUS_LABEL } from './labels';
import { BarLegend, NutrientBar } from './NutrientBar';
import type { BarView, ResultView } from './resultView';

type Filter = 'all' | 'attention' | 'ok';
const ATTENTION: JudgeStatus[] = ['DEFICIENT', 'CAUTION', 'EXCESS'];
const OK: JudgeStatus[] = ['ADEQUATE', 'ADEQUATE_NO_UPPER'];

export function ResultSection({ view, onBackToInput }: { view: ResultView | null; onBackToInput?: () => void }) {
  if (!view) return null;
  return (
    <div className="stack" id="result" tabIndex={-1} aria-live="polite">
      {!view.supported ? <UnsupportedResult view={view} /> : <SupportedResult view={view} />}
      <Notices notices={view.notices} />
      {onBackToInput && (
        <div className="only-mobile">
          <Button variant="secondary" block onClick={onBackToInput}>↑ 입력으로 돌아가기</Button>
        </div>
      )}
    </div>
  );
}

function UnsupportedResult({ view }: { view: ResultView }) {
  return (
    <Card title="분석 결과" labelledBy="res-unsupported">
      <div className="stack">
        <Banner tone="warn" role="status">
          <strong>{view.lifeStageLabel}</strong>
          {view.warnings.length > 0 ? view.warnings.map((w) => <span key={w}>{w}</span>) : <span>이 나이는 계산하지 않습니다.</span>}
        </Banner>
        <p className="card__desc">8주 이상이 되면 다시 확인해 주세요.</p>
      </div>
    </Card>
  );
}

function SupportedResult({ view }: { view: ResultView }) {
  const [filter, setFilter] = useState<Filter>('all');
  const counts = useMemo(() => countStatuses(view.bars), [view.bars]);
  const bars = view.bars.filter((b) => filter === 'all' || (filter === 'attention' ? ATTENTION : OK).includes(b.status));

  return (
    <>
      {view.warnings.length > 0 && (
        <Banner tone="warn" role="status">
          {view.warnings.map((w) => <span key={w}>{w}</span>)}
        </Banner>
      )}

      <EnergySummary view={view} counts={counts} />

      <Card
        title="성분별 하루 섭취량" labelledBy="res-bars"
        desc="막대는 하루 총 섭취량(사료 추정 + 영양제)이고, 세로선은 이 아이의 기준선입니다."
      >
        <div className="stack">
          <BarLegend />
          <div className="filter-row" role="group" aria-label="성분 거르기">
            <button type="button" className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>전체 {view.bars.length}</button>
            <button type="button" className="chip" aria-pressed={filter === 'attention'} onClick={() => setFilter('attention')}>
              확인 필요 {counts.attention}
            </button>
            <button type="button" className="chip" aria-pressed={filter === 'ok'} onClick={() => setFilter('ok')}>적정 {counts.ok}</button>
          </div>
          <div className="bar-list">
            {bars.length === 0 ? <p className="card__desc" style={{ padding: '12px 0' }}>해당하는 성분이 없습니다.</p> : bars.map((b) => <NutrientBar key={b.id} bar={b} />)}
          </div>
          <ResultTable bars={view.bars} />
        </div>
      </Card>

      <CaPCard view={view} />
      <GuideList view={view} />
    </>
  );
}

function countStatuses(bars: BarView[]) {
  const by = (s: JudgeStatus[]) => bars.filter((b) => s.includes(b.status)).length;
  return {
    attention: by(ATTENTION),
    ok: by(OK),
    deficient: by(['DEFICIENT']),
    caution: by(['CAUTION']),
    excess: by(['EXCESS']),
  };
}

function EnergySummary({ view, counts }: { view: ResultView; counts: ReturnType<typeof countStatuses> }) {
  const e = view.energy;
  const ratioPct = e.energyRatio !== null ? Math.max(0, Math.min(100, e.energyRatio * 100)) : null;
  return (
    <Card title="요약" labelledBy="res-summary" desc={view.energyText ?? undefined}>
      <div className="stack">
        <div className="summary">
          <div className="stat">
            <div className="stat__label">생애주기</div>
            <div className="stat__value" style={{ fontSize: 17 }}>{view.lifeStageLabel}</div>
            {e.weightClipped && e.estimatedAdultKgClipped !== null && (
              <div className="stat__sub">예상 성체 체중 {formatNumber(e.estimatedAdultKgClipped)} kg 기준</div>
            )}
          </div>
          <div className="stat">
            <div className="stat__label">필요 열량</div>
            <div className="stat__value num">{formatNumber(e.energyKcal)}<span className="stat__unit">kcal</span></div>
          </div>
          <div className="stat">
            <div className="stat__label">섭취 열량</div>
            <div className="stat__value num">{formatNumber(e.intakeKcal)}<span className="stat__unit">kcal</span></div>
            {ratioPct !== null && (
              <>
                <div className="energy-meter" aria-hidden="true"><div className="energy-meter__fill" style={{ width: `${ratioPct}%` }} /></div>
                <div className="stat__sub num">필요 열량의 {formatNumber(e.energyRatio! * 100)}%</div>
              </>
            )}
          </div>
        </div>
        <div className="count-row">
          {counts.deficient > 0 && <span className="badge badge--deficient">부족 {counts.deficient}</span>}
          {counts.caution > 0 && <span className="badge badge--caution">주의 {counts.caution}</span>}
          {counts.excess > 0 && <span className="badge badge--excess">과다 {counts.excess}</span>}
          <span className="badge badge--adequate">적정 {counts.ok}</span>
        </div>
      </div>
    </Card>
  );
}

function CaPCard({ view }: { view: ResultView }) {
  const r = view.caPRatio;
  if (r.status === 'NOT_APPLICABLE' || r.value === null) {
    if (!view.caPText) return null;
    return <Card title="칼슘 : 인" labelledBy="res-cap"><p className="card__desc">{view.caPText}</p></Card>;
  }
  const pos = Math.max(0, Math.min(100, (r.value / 3) * 100));
  const tone = r.status === 'ADEQUATE' ? 'adequate' : r.status === 'LOW' ? 'deficient' : 'caution';
  return (
    <Card title="칼슘 : 인" labelledBy="res-cap">
      <div className="stack stack--sm">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="cap-card__value num">{formatNumber(r.value)} : 1</span>
          <span className={`badge badge--${tone}`}><span className="badge__dot" aria-hidden="true" />{RATIO_STATUS_LABEL[r.status]}</span>
        </div>
        <div className="cap-scale" aria-hidden="true">
          <span className="cap-scale__mark" style={{ left: `${pos}%` }} />
          <div className="cap-scale__ticks"><span style={{ left: '0%' }}>0</span><span style={{ left: '33.3%' }}>1</span><span style={{ left: '66.6%' }}>2</span><span style={{ left: '100%' }}>3</span></div>
        </div>
        {view.caPText && <p className="card__desc" style={{ whiteSpace: 'pre-line' }}>{view.caPText}</p>}
      </div>
    </Card>
  );
}

function GuideList({ view }: { view: ResultView }) {
  if (view.guide.length === 0) return null;
  return (
    <Card title="보충량 안내" labelledBy="res-guide" desc="확인이 필요한 순서대로 보여 줍니다.">
      <ol className="guide-list">
        {view.guide.map((g, k) => (
          <li className="guide" key={g.nutrientId}>
            <span className="guide__rank">{k + 1}</span>
            <div>
              <div className="guide__head">
                <span className="guide__name">{g.nutrientName}</span>
                <StatusBadge status={g.status} />
              </div>
              <p className="guide__text">{g.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function ResultTable({ bars }: { bars: BarView[] }) {
  return (
    <details className="details">
      <summary>숫자 표로 보기</summary>
      <div className="table-wrap" style={{ marginTop: 8 }}>
        <table className="table num">
          <thead>
            <tr><th>성분</th><th>사료</th><th>영양제</th><th>총량</th><th>최소 권장량</th><th>주의</th><th>상한</th><th>상태</th></tr>
          </thead>
          <tbody>
            {bars.map((b) => (
              <tr key={b.id}>
                <td>{b.name} <span style={{ color: 'var(--text-3)' }}>({b.unit})</span></td>
                <td>{b.feedText}</td>
                <td>{b.supplementText}</td>
                <td>{b.totalText}</td>
                <td>{formatNumber(b.lower)}</td>
                <td>{formatNumber(b.caution)}</td>
                <td>{b.upper === null && b.caution === null ? '상한 기준 없음' : formatNumber(b.upper)}</td>
                <td>{b.statusLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function Notices({ notices }: { notices: string[] }) {
  if (notices.length === 0) return null;
  return (
    <Card as="div" className="card--flat">
      <ul className="notice-list">{notices.map((n) => <li key={n}>{n}</li>)}</ul>
    </Card>
  );
}
