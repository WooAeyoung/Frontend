import { describe, expect, it } from 'vitest';
import { mockResponses } from '../../api/mocks';
import { buildResultView } from './resultView';

describe('buildResultView — 예시 응답 4개', () => {
  it('미지원: bars 빈 배열, supported false', () => {
    const v = buildResultView(mockResponses.unsupported);
    expect(v.supported).toBe(false);
    expect(v.bars).toEqual([]);
    expect(v.warnings.length).toBeGreaterThan(0);
  });

  it('강아지: 칼슘 과다, 구리는 상한 없지만 주의선 있어 라벨 없음, 체급 절단 경고', () => {
    const v = buildResultView(mockResponses.puppy);
    const ca = v.bars.find((b) => b.id === 'CA')!;
    expect(ca.tone).toBe('excess');
    expect(ca.statusLabel).toBe('과다');
    expect(ca.axisMax).toBeCloseTo(Math.max(ca.upper!, 6.8) * 1.15);
    const cu = v.bars.find((b) => b.id === 'CU')!;
    expect(cu.upper).toBeNull();
    expect(cu.caution).not.toBeNull();
    expect(cu.showNoUpperLabel).toBe(false);
    expect(v.energy.weightClipped).toBe(true);
    expect(v.warnings.some((w) => w.includes('체급'))).toBe(true);
  });

  it('비타민 E 는 상한 기준 없음 라벨', () => {
    for (const r of [mockResponses.puppy, mockResponses.dogAdult, mockResponses.kitten]) {
      const e = buildResultView(r).bars.find((b) => b.id === 'VIT_E');
      if (e) expect(e.showNoUpperLabel).toBe(true);
    }
  });

  it('null 은 막대에서만 0, 숫자는 "–"; 모든 선이 없으면 axisMax 1', () => {
    const v = buildResultView(mockResponses.puppy);
    const t = v.bars.find((b) => b.id === 'TAURINE')!;
    expect(t.feed).toBe(0);
    expect(t.feedText).toBe('–');
    expect(t.totalText).toBe('–');
    expect(t.axisMax).toBe(1);
    expect(t.lower).toBeNull();
  });

  it('성견·고양이: 서버 순서·문구 그대로', () => {
    for (const r of [mockResponses.dogAdult, mockResponses.kitten]) {
      const v = buildResultView(r);
      expect(v.supported).toBe(true);
      expect(v.bars.map((b) => b.id)).toEqual(r.bars.map((b) => b.nutrientId));
      expect(v.guide).toEqual(r.guide);
      expect(v.notices).toEqual(r.notices.map((n) => n.message));
      expect(v.energyText).toBe(r.energyRatioText);
    }
  });
});
