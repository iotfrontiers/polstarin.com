# Vercel Postgres 환경 변수 설정 가이드

## 문제: POSTGRES_URL 환경 변수가 없음

에러 메시지:
```
VercelPostgresError - 'missing_connection_string': You did not supply a 'connectionString' and no 'POSTGRES_URL' env var was found.
```

## 해결 방법

### 방법 1: Vercel 대시보드에서 자동 연결 확인

1. **Vercel 대시보드 접속**
   - https://vercel.com → 프로젝트 선택

2. **Storage 탭 확인**
   - Storage → polstarin-db 클릭
   - "Connected to" 섹션에서 프로젝트가 연결되어 있는지 확인

3. **자동 연결이 안 되어 있다면**
   - Storage → polstarin-db → Settings
   - "Connect to Project" 버튼 클릭
   - 프로젝트 선택 후 연결

### 방법 2: 환경 변수 수동 설정

1. **Connection String 가져오기**
   - Vercel 대시보드 → Storage → polstarin-db
   - "Connection String" 또는 "Connection URL" 복사
   - 형식: `postgres://user:password@host:port/database?sslmode=require`

2. **환경 변수 추가**
   - Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
   - "Add New" 클릭
   - 다음 변수 추가:
     ```
     Key: POSTGRES_URL
     Value: (복사한 Connection String)
     ```
   - Environment: Production, Preview, Development 모두 선택
   - "Save" 클릭

3. **재배포**
   - Deployments → 최신 배포 → "Redeploy" 클릭
   - 또는 GitHub에 푸시하여 자동 재배포

### 방법 3: Neon 대시보드에서 확인

1. **Neon 대시보드 접속**
   - Vercel Storage → polstarin-db → "Open in Neon" 클릭
   - 또는 https://console.neon.tech 접속

2. **Connection String 확인**
   - Dashboard → Connection Details
   - "Connection string" 복사

3. **Vercel에 환경 변수로 추가**
   - 위의 "방법 2" 참고

## 확인 방법

### 1. 환경 변수 확인
```
Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
→ POSTGRES_URL 확인
```

### 2. 배포 후 로그 확인
```
Vercel 대시보드 → Deployments → 최신 배포 → Functions 탭
→ 다음 로그 확인:
[postgres-init] Postgres 테이블 자동 초기화 시작
[postgres] ask_posts 테이블 초기화 완료
```

### 3. 테스트
- 사이트 → `/ask/write`에서 글 작성
- Postgres에 저장되는지 확인

## 임시 해결책 (폴백)

현재 코드는 Postgres가 없을 때 자동으로 Notion으로 폴백합니다.
- Postgres 연결 실패 시 → Notion API 사용
- 사이트는 정상 동작하지만 속도는 느릴 수 있음

## 주의사항

- 환경 변수 추가 후 **반드시 재배포** 필요
- Production, Preview, Development 환경 모두에 추가 권장
- Connection String은 민감한 정보이므로 공개하지 마세요
