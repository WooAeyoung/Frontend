// 담당: C. 성분 막대 그래프 (구현계획서 6.2). BarView 만 보고 그린다 — 계산하지 않는다 (INV-03).
// 사료(추정) + 영양제 누적 막대, 하한 실선 · 주의 점선 · 상한 굵은 실선. null 선은 그리지 않는다.
import { StatusBadge } from '../../components/StatusBadge';
import { formatNumber } from '../../format/number';
import type { BarView } from './resultView';

const W = 600;
const H = 36;
const BAR_Y = 9;
const BAR_H = 18;

function x(v: number, max: number): number {
  if (!Number.isFinite(v) || max <= 0) return 0;
  return Math.max(0, Math.min(W, (v / max) * W));
}

export function NutrientBar({ bar }: { bar: BarView }) {
  const hasAnyLine = bar.lower !== null || bar.caution !== null || bar.upper !== null;
  const noData = !hasAnyLine && bar.totalText === '–' && bar.supplement === 0;
  const feedW = x(bar.feed, bar.axisMax);
  const suppW = Math.min(W - feedW, x(bar.supplement, bar.axisMax));
  const summary = `${bar.name}: 총 ${bar.totalText} ${bar.unit}, 최소 권장량 ${formatNumber(bar.lower)}, 주의 ${formatNumber(bar.caution)}, 상한 ${formatNumber(bar.upper)}, 상태 ${bar.statusLabel}`;

  return (
    <div className="nbar">
      <div className="nbar__head">
        <span className="nbar__name">{bar.name}</span>
        <span className="nbar__unit">{bar.unit}/일</span>
        <StatusBadge status={bar.status} />
      </div>

      {noData ? (
        <p className="nbar__empty">이 생애주기에는 기준값이 없어 판정하지 않습니다.</p>
      ) : (
        <div style={{ position: 'relative' }}>
          <svg className="nbar__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={summary} height={H}>
            <rect x={0} y={BAR_Y} width={W} height={BAR_H} rx={4} fill="var(--surface-2)" />
            {feedW > 0 && <rect x={0} y={BAR_Y} width={feedW} height={BAR_H} fill="var(--feed)" />}
            {suppW > 0 && <rect x={feedW} y={BAR_Y} width={suppW} height={BAR_H} fill="var(--supp)" />}
            {bar.lower !== null && (
              <line x1={x(bar.lower, bar.axisMax)} x2={x(bar.lower, bar.axisMax)} y1={2} y2={H - 2} stroke="var(--text)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            )}
            {bar.caution !== null && (
              <line x1={x(bar.caution, bar.axisMax)} x2={x(bar.caution, bar.axisMax)} y1={2} y2={H - 2} stroke="var(--caution)" strokeWidth={2} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
            )}
            {bar.upper !== null && (
              <line x1={x(bar.upper, bar.axisMax)} x2={x(bar.upper, bar.axisMax)} y1={0} y2={H} stroke="var(--excess)" strokeWidth={4} vectorEffect="non-scaling-stroke" />
            )}
          </svg>
          {bar.showNoUpperLabel && (
            <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)', background: 'rgba(255,255,255,.85)', padding: '0 4px', borderRadius: 4 }}>
              상한 기준 없음
            </span>
          )}
        </div>
      )}

      <div className="nbar__nums num">
        <span>총 <b>{bar.totalText}</b></span>
        <span>사료(추정) {bar.feedText}</span>
        <span>영양제 {bar.supplementText}</span>
        {bar.lower !== null && <span>최소 권장량 {formatNumber(bar.lower)}</span>}
        {bar.caution !== null && <span>주의 {formatNumber(bar.caution)}</span>}
        {bar.upper !== null && <span>상한 {formatNumber(bar.upper)}</span>}
      </div>
    </div>
  );
}

export function BarLegend() {
  return (
    <div className="legend" aria-hidden="true">
      <span className="legend__item"><span className="legend__swatch" style={{ background: 'var(--feed)' }} />사료(추정)</span>
      <span className="legend__item"><span className="legend__swatch" style={{ background: 'var(--supp)' }} />영양제</span>
      <span className="legend__item"><span className="legend__line" />최소 권장량</span>
      <span className="legend__item"><span className="legend__line legend__line--dash" />주의</span>
      <span className="legend__item"><span className="legend__line legend__line--bold" />상한</span>
    </div>
  );
}
