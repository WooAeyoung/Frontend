# features/feeding — 담당 B

사료 급여량, 영양제 카드·성분 행 입력, 검증, 요청 변환, 프로필 복원.
할 일과 완료 기준: `프론트엔드 구현계획` 3.2, 이슈 FE-B1~B7.

- 고치는 파일: 이 폴더만. `feeding.ts`의 함수 이름·인자는 C가 쓰므로 바꾸지 않는다.
- 쓰는 API: `getNutrients()`, `convertUnit()` (`src/api/client.ts`)
- 경로: `ingredientPath(i, j, 'unit')` 처럼 `src/validation/paths.ts` 함수로만
- 요청 형식 확인: `toFeedingInput` 결과가 `contract/examples/analysis-request.*.json` 의 feeding 과 같아야 한다 (테스트로)
