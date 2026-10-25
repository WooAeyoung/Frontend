/// <reference types="vitest" />
import { existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// contract 폴더 위치: 저장소 안(frontend/ 옆의 ../contract)이 있으면 그것을, 없으면 이 폴더의 ./contract 를 쓴다.
// tsconfig.json 의 paths 도 같은 순서로 찾는다.
const repoContract = fileURLToPath(new URL('../contract', import.meta.url));
const localContract = fileURLToPath(new URL('./contract', import.meta.url));
const contractDir = existsSync(`${repoContract}/openapi.yaml`) ? repoContract : localContract;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // 백엔드 주소. 기본 http://localhost:8080. 다른 PC 의 백엔드를 쓰려면 .env.local 에 VITE_PROXY_TARGET=http://192.168.0.10:8080
  const target = env.VITE_PROXY_TARGET || 'http://localhost:8080';
  return {
    plugins: [react()],
    resolve: { alias: { '@contract': contractDir } },
    server: {
      port: 5173,
      // /api 요청을 백엔드(Spring)로 넘긴다. VITE_USE_MOCK=false 일 때 사용. 같은 주소로 보이므로 CORS 설정이 필요 없다.
      proxy: { '/api': { target, changeOrigin: true } },
      fs: { allow: ['..'] },
    },
    preview: { proxy: { '/api': { target, changeOrigin: true } } },
    build: {
      // 시연용 단일 jar: dist 내용을 backend/src/main/resources/static 으로 복사한다
      outDir: 'dist',
    },
    test: { environment: 'node' },
  };
});
