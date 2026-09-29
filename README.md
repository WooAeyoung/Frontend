# 우애영 Frontend

반려동물 프로필과 급여 제품을 입력하고 백엔드 계산 결과·영양제 추천을 확인하는 React/Vite MVP입니다.

```powershell
cd C:\Users\yeoh0\wooaeyoung1\Frontend
npm install
npm run dev
```

백엔드는 `http://localhost:8000`에서 실행합니다. 다른 주소라면 `.env.example`을 `.env`로 복사해 `VITE_API_URL`을 수정하세요.

공개 GitHub Pages 빌드는 별도 서버 없이 브라우저 계산 엔진을 사용하므로 분석과 추천까지 동작합니다. `main`에 푸시하면 GitHub Actions가 자동 배포합니다.

## 구현 화면

- 조건부 검증이 있는 반려동물 프로필
- 제품 검색·추가·급여량 편집
- 영양상태 요약, 성분별 누적 막대와 기준선
- 추정값 및 경고 안내
- 칼슘:인 비율
- 추천과 제외 후보 사유

