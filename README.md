# WorkFlow AI Fullstack

Flow/Slack 스타일의 협업툴 MVP입니다.

## 포함 기능

- React + Tailwind 프론트
- Node/Express 백엔드
- Supabase Auth 로그인/회원가입
- Supabase Postgres DB 저장
- 엑셀/xlsx/csv 업로드 후 프로젝트/업무 자동 생성
- 담당자/마감일/상태/진행률 대시보드
- 프로젝트별 실시간 채팅
- OpenAI API가 있으면 AI 업무 생성, 없으면 규칙 기반 자동 생성

## 폴더 구조

```txt
workflow-ai-fullstack/
  client/       # React + Tailwind
  server/       # Node/Express API
  supabase/     # DB schema SQL
  sample/       # 테스트용 CSV
```

## 1. Supabase 준비

1. Supabase 프로젝트 생성
2. SQL Editor 열기
3. `supabase/schema.sql` 전체 실행
4. Project Settings > API에서 아래 값 확인
   - Project URL
   - anon public key
   - service_role key

주의:
- `service_role key`는 절대 프론트에 넣으면 안 됩니다.
- `service_role key`는 `server/.env`에만 넣으세요.

## 2. 서버 실행

```bash
cd server
npm install
copy .env.example .env
npm run dev
```

Mac/Linux는 아래처럼 복사합니다.

```bash
cp .env.example .env
```

`server/.env`를 본인 값으로 수정하세요.

```env
PORT=4000
CLIENT_URL=http://localhost:5173

SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

OpenAI 키가 없어도 실행됩니다. 이 경우 규칙 기반으로 프로젝트/업무를 생성합니다.

## 3. 프론트 실행

```bash
cd client
npm install
copy .env.example .env
npm run dev
```

Mac/Linux:

```bash
cp .env.example .env
```

`client/.env`를 수정하세요.

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## 4. 테스트 순서

1. 프론트 접속: http://localhost:5173
2. 회원가입 또는 로그인
3. `sample/sample_tasks.csv` 업로드
4. 프로젝트/업무가 자동 생성되는지 확인
5. 프로젝트 선택 후 오른쪽 채팅에서 메시지 전송
6. 다른 브라우저 창으로 같은 계정 접속 후 실시간 반영 확인

## 5. 엑셀 컬럼명

아래 컬럼명을 권장합니다.

```txt
프로젝트명, 업무명, 담당자, 마감일, 상태, 우선순위, 진행률
```

영문 컬럼도 일부 인식합니다.

```txt
project, task, assignee, dueDate, status, priority, progress
```

## 6. 주의사항

- Supabase Realtime이 안 보이면 SQL에서 `alter publication supabase_realtime add table ...` 부분이 실행됐는지 확인하세요.
- 이미 publication에 추가된 테이블은 중복 추가 시 에러가 날 수 있습니다. 그 경우 해당 줄은 무시해도 됩니다.
- 로컬 개발에서는 CORS가 `CLIENT_URL` 기준으로 열립니다.
