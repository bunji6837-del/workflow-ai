# WorkFlow AI PWA 적용 안내

이 버전은 기존 v3 기능에 설치형 웹앱(PWA) 설정을 추가한 버전입니다.

## 추가/변경된 파일

- `client/package.json`
- `client/vite.config.js`
- `client/index.html`
- `client/src/components/PwaInstallButton.jsx`
- `client/src/layout/AppShell.jsx`
- `client/src/App.jsx`
- `client/public/pwa-192x192.png`
- `client/public/pwa-512x512.png`
- `client/public/apple-touch-icon.png`

## 실행

```powershell
cd client
npm install
npm run dev
```

개발 중에는 일반 웹처럼 `http://localhost:5173`에서 확인합니다.
설치 버튼은 브라우저가 PWA 설치 조건을 만족했다고 판단할 때만 표시됩니다.

## 빌드 테스트

```powershell
npm run build
npm run preview
```

브라우저에서 preview 주소로 들어간 뒤 주소창 오른쪽 설치 아이콘 또는 화면의 `앱 설치` 버튼을 확인하세요.
