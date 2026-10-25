# features/pet — 담당 A

반려동물 정보(종·체중·나이·단위·체급) 입력, 검증, 요청 변환, 프로필 복원.
할 일과 완료 기준: `프론트엔드 구현계획` 3.1, 이슈 FE-A1~A6.

- 고치는 파일: 이 폴더만. `pet.ts`의 함수 이름·인자는 C가 쓰므로 바꾸지 않는다.
- 쓰는 API: `getSizeClasses()` (`src/api/client.ts`)
- 경로: `petPath('weightKg')` 처럼 `src/validation/paths.ts` 함수로만
