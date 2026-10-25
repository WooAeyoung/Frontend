# features/analysis — 담당 C

분석 요청·응답 흐름, 서버 오류 → 입력칸 연결, 결과 화면용 데이터, 통합 페이지(`src/pages/AnalysisPage.tsx`).
할 일과 완료 기준: `프론트엔드 구현계획` 3.3, 이슈 FE-C1~C7.

- 고치는 파일: 이 폴더, `src/pages/AnalysisPage.tsx`, `src/validation/messages.ts`, `src/api/` (가짜·실제 전환)
- 쓰는 API: `analyze()` (`src/api/client.ts`)
- A·B의 함수(`pet.ts`, `feeding.ts`)는 부르기만 하고 고치지 않는다
