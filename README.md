# 우애영 Frontend (React · TypeScript · Vite)

`프론트엔드_구현계획_v1.md` 의 1차(검증·요청·응답) + 2차(최종 화면)를 구현한 것입니다.
API 형식은 `contract/openapi.yaml` (= `src/types/api.ts`) 을 그대로 따릅니다.

## 실행

```bash
npm ci
npm run dev          # http://localhost:5173  (기본: 가짜 응답 모드)
npm test             # 단위 테스트 116개
npm run build        # dist/ 생성
```

## 백엔드(Spring) 연결

1. 백엔드를 `http://localhost:8080` 에서 실행
2. 이 폴더에 `.env.local` 파일을 만들고:
   ```
   VITE_USE_MOCK=false
   # 백엔드가 다른 PC에 있으면 (선택)
   # VITE_PROXY_TARGET=http://192.168.0.10:8080
   ```
3. `npm run dev` 다시 실행 → 화면 오른쪽 위가 "서버 연결" 로 바뀝니다.

- `.env.development` 가 없어도 기본은 가짜 응답 모드입니다 (`env.development.example` 참고).
- 화면은 `/api/v1/...` 로 요청하고 Vite proxy 가 백엔드로 넘깁니다 (CORS 설정 불필요).
- 쓰는 API: `GET /nutrients`, `GET /size-classes`, `POST /units/convert`(환산 미리보기), `POST /analyses`
- 요청 JSON 에는 계약에 있는 필드만 들어갑니다 (백엔드 `fail-on-unknown-properties: true` 대응, 테스트로 확인).
- 400 의 `fieldErrors[].field` 경로가 그대로 해당 입력칸에 표시됩니다. 501(백엔드 미구현)은 "개발 중" 배너로 표시됩니다.

## 배포 (jar 하나로)

`npm run build` 후 `dist/` 안의 내용을 `backend/src/main/resources/static/` 에 복사하면 Spring 이 화면까지 제공합니다 (같은 주소이므로 추가 설정 없음).

## contract 폴더

`@contract/...` 로 가져옵니다. 저장소 구조(`wooaeyoung/frontend` 옆에 `wooaeyoung/contract`)에 넣으면 그쪽을, 아니면 이 폴더의 `contract/` 사본을 씁니다 (`vite.config.ts`, `tsconfig.json` paths).

## 가짜 응답 모드에서 시나리오 확인

- S7 서버 단위 오류: 영양제 이름을 `#unit-error` 로 하고 분석
- 결과 숫자는 `contract/examples` 예시이며 입력값으로 계산한 것이 아닙니다.

## 폴더 (담당 구분 유지)

| 경로 | 내용 |
|---|---|
| `src/features/pet/` (A) | 반려동물 검증·변환·입력 화면 |
| `src/features/feeding/` (B) | 사료·영양제 검증·변환·단위 정규화·입력 화면 |
| `src/features/analysis/` (C) | 요청 흐름(`useAnalysis`, `analysisFlow`), 결과 정리(`resultView`), `NutrientBar`, 결과 화면 |
| `src/pages/AnalysisPage.tsx` (C) | 통합 페이지 |
| `src/components/` (A) | 공통 UI |
| `src/styles/global.css` | 색·글꼴·간격 공통 값 |
