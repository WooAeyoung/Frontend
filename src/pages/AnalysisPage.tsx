// 통합 페이지 (담당 C). A·B·C 의 결과물을 한 화면에 모은다.
// 입력 상태는 여기 하나에 두고, 각 영역에는 값·변경 함수·오류만 내려준다.
// 넓은 화면: 왼쪽 입력 / 오른쪽 결과. 휴대폰: 위 입력 / 아래 결과.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getNutrients, USE_MOCK } from '../api/client';
import { MOCK_UNIT_ERROR_LABEL } from '../api/mocks';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { ResultSection } from '../features/analysis/ResultSection';
import { useAnalysis } from '../features/analysis/useAnalysis';
import { FeedingSection } from '../features/feeding/FeedingSection';
import { fromFeedingInput, toFeedingInput, validateFeeding } from '../features/feeding/feeding';
import { emptyFeedingForm, type FeedingForm } from '../features/feeding/types';
import { PetSection } from '../features/pet/PetSection';
import { fromPetInput, petWarnings, toPetInput, validatePet } from '../features/pet/pet';
import { emptyPetForm, type PetForm } from '../features/pet/types';
import { clearProfile, loadProfile, saveProfile } from '../storage/profile';
import type { AnalysisRequest, NutrientOption } from '../types/api';
import { hasErrors, mergeErrors, type FieldErrors, type FieldPath } from '../validation/types';

/** 구현계획서 6.3 NOTICE_UNSUPPORTED — 입력 화면에도 항상 */
const INPUT_NOTICE_UNSUPPORTED = '임신·수유 중이거나 8주 미만인 개체는 지원하지 않습니다.';

type NutrientsState = { status: 'loading' | 'ready' | 'error'; list: NutrientOption[] };

export function AnalysisPage() {
  const [pet, setPet] = useState<PetForm>(emptyPetForm);
  const [feeding, setFeeding] = useState<FeedingForm>(emptyFeedingForm);
  const [nutrients, setNutrients] = useState<NutrientsState>({ status: 'loading', list: [] });
  const [submitted, setSubmitted] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const [resultTick, setResultTick] = useState(0);
  const analysis = useAnalysis();
  const inputRef = useRef<HTMLDivElement>(null);

  const loadNutrients = useCallback(() => {
    setNutrients((s) => ({ ...s, status: 'loading' }));
    getNutrients()
      .then((list) => setNutrients({ status: 'ready', list }))
      .catch(() => setNutrients({ status: 'error', list: [] }));
  }, []);

  // 처음 열 때: 성분 목록 + 저장된 프로필 복원
  useEffect(() => {
    loadNutrients();
    const saved = loadProfile();
    if (saved) {
      try {
        setPet(fromPetInput(saved.pet));
        setFeeding(fromFeedingInput(saved.feeding));
        setRestored(true);
      } catch {
        clearProfile(); // 형식이 맞지 않으면 빈 폼
      }
    }
  }, [loadNutrients]);

  // 첫 제출 뒤에는 고칠 때마다 화면 검증을 다시 한다 (고치면 바로 사라지고, 새 오류는 바로 보임)
  const clientErrors = useMemo<FieldErrors>(
    () => (submitted ? mergeErrors(validatePet(pet), validateFeeding(feeding, nutrients.list)) : {}),
    [submitted, pet, feeding, nutrients.list],
  );
  const errors = useMemo(() => mergeErrors(clientErrors, analysis.serverFieldErrors), [clientErrors, analysis.serverFieldErrors]);
  const warnings = useMemo(() => petWarnings(pet), [pet]);
  const loading = analysis.status === 'loading';

  // 제출 후 첫 오류 칸으로 스크롤·포커스
  useEffect(() => {
    if (focusTick === 0) return;
    const firstMsg = inputRef.current?.querySelector('.msg--error');
    if (!firstMsg) return;
    const box = firstMsg.closest('.ing, .ing-list, .field, .supp') as HTMLElement | null;
    const target = (box?.querySelector('input:not([type=radio]), select, input[type=radio], [tabindex="-1"]') as HTMLElement | null) ?? box;
    box?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.focus({ preventScroll: true });
  }, [focusTick]);

  // 성공 시 결과로 스크롤 (휴대폰에서 결과가 아래에 있으므로)
  useEffect(() => {
    if (resultTick === 0) return;
    const el = document.getElementById('result');
    if (el && el.getBoundingClientRect().top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [resultTick]);

  const onEdit = (path: FieldPath) => analysis.clearServerError(path);

  const onSubmit = async () => {
    if (loading) return;
    setSubmitted(true);
    setDevError(null);
    const found = mergeErrors(validatePet(pet), validateFeeding(feeding, nutrients.list));
    if (hasErrors(found)) {
      setFocusTick((t) => t + 1);
      return;
    }
    let request: AnalysisRequest;
    try {
      request = { pet: toPetInput(pet), feeding: toFeedingInput(feeding, nutrients.list) };
    } catch (e) {
      setDevError(e instanceof Error ? e.message : String(e));
      return;
    }
    const result = await analysis.submit(request);
    if (!result) return;
    if (result.status === 'success') {
      saveProfile(request.pet, request.feeding); // 성공했을 때만 저장
      setResultTick((t) => t + 1);
    } else if (hasErrors(result.serverFieldErrors)) {
      setFocusTick((t) => t + 1);
    }
  };

  const onResetAll = () => {
    clearProfile();
    setPet(emptyPetForm);
    setFeeding(emptyFeedingForm);
    setSubmitted(false);
    setRestored(false);
    setDevError(null);
    analysis.reset();
  };

  const backToInput = () => {
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <div className="brand">
            <span className="brand__name">우애영</span>
            <span className="brand__sub">사료·영양제 조합 영양성분 확인</span>
          </div>
          <span className={`mode-chip ${USE_MOCK ? 'mode-chip--mock' : ''}`} title={USE_MOCK ? 'contract/examples 의 예시 응답을 씁니다' : '백엔드 API 에 연결합니다'}>
            {USE_MOCK ? '가짜 응답 모드' : '서버 연결'}
          </span>
        </div>
      </header>

      <main className="layout">
        <div className="layout__input" ref={inputRef}>
          <form className="stack" noValidate onSubmit={(e) => { e.preventDefault(); void onSubmit(); }}>
            {restored && (
              <Banner tone="info" role="status">
                <span>마지막으로 분석한 입력을 불러왔습니다.</span>
              </Banner>
            )}
            {nutrients.status === 'error' && (
              <Banner tone="error" role="alert">
                <span>성분 목록을 불러오지 못했습니다. 서버 연결을 확인하세요.</span>
                <span><Button size="sm" onClick={loadNutrients}>다시 시도</Button></span>
              </Banner>
            )}

            <PetSection value={pet} onChange={(v, p) => { setPet(v); onEdit(p); }} errors={errors} warnings={warnings} disabled={loading} />
            <FeedingSection value={feeding} onChange={(v, p) => { setFeeding(v); onEdit(p); }} errors={errors} nutrients={nutrients.list} disabled={loading} />

            <div className="submit-bar">
              {devError && (
                <Banner tone="dev" role="alert">
                  <strong>개발용: 요청을 만들지 못했습니다</strong>
                  <span>{devError}</span>
                </Banner>
              )}
              {analysis.errorMessage && <Banner tone="error" role="alert"><span>{analysis.errorMessage}</span></Banner>}
              <Button type="submit" variant="primary" size="lg" block loading={loading}>
                {loading ? '분석 중…' : '분석하기'}
              </Button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="field__hint">{INPUT_NOTICE_UNSUPPORTED}</span>
                <Button variant="ghost" size="sm" onClick={onResetAll} disabled={loading}>새로 입력</Button>
              </div>
              {USE_MOCK && (
                <span className="field__hint">
                  가짜 응답 모드: 입력과 비슷한 예시 결과를 보여 줍니다. 영양제 이름을 <code>{MOCK_UNIT_ERROR_LABEL}</code> 로 하면 서버 단위 오류를 재현합니다.
                </span>
              )}
            </div>
          </form>
        </div>

        <div className="layout__result">
          {analysis.view ? (
            <>
              {USE_MOCK && <div style={{ marginBottom: 12 }}><Banner tone="dev"><span>가짜 응답(contract/examples)입니다. 숫자는 입력값으로 계산한 것이 아닙니다.</span></Banner></div>}
              <ResultSection view={analysis.view} onBackToInput={backToInput} />
            </>
          ) : (
            <div className="card result-empty" id="result" aria-live="polite">
              {loading ? (
                <><div className="result-empty__icon" aria-hidden="true">⏳</div><p className="result-empty__title">분석 중입니다…</p></>
              ) : (
                <>
                  <div className="result-empty__icon" aria-hidden="true">🐾</div>
                  <p className="result-empty__title">결과가 여기에 표시됩니다</p>
                  <p>반려동물 정보와 사료·영양제를 입력하고 ‘분석하기’를 누르세요.</p>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        결과는 참고용이며 수의학적 진단·처방을 대신하지 않습니다. 입력한 내용은 이 브라우저에만 저장됩니다.
      </footer>
    </>
  );
}
