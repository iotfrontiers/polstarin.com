# Vercel Postgres 설정 가이드

## 1. Vercel 대시보드에서 Postgres 생성

### 단계별 가이드

1. **Vercel 대시보드 접속**
   - https://vercel.com 접속
   - 프로젝트 선택

2. **Storage 탭 이동**
   - 프로젝트 페이지에서 **Storage** 탭 클릭
   - 또는 좌측 메뉴에서 **Storage** 선택

3. **데이터베이스 생성**
   - **Create Database** 버튼 클릭
   - **Neon** 선택 (Postgres)
   - **Create** 클릭

4. **환경 변수 자동 설정**
   - Vercel이 자동으로 다음 환경 변수를 설정합니다:
     - `POSTGRES_URL`
     - `POSTGRES_PRISMA_URL`
     - `POSTGRES_URL_NON_POOLING`
   - 별도 설정 불필요 ✅

## 2. 배포 및 자동 초기화

### 자동 초기화
- 서버 시작 시 자동으로 테이블이 생성됩니다
- 별도 API 호출 불필요 ✅
- `server/plugins/postgres-init.ts`가 자동으로 실행됩니다

### 수동 초기화 (필요 시)
만약 자동 초기화가 실패한 경우:

```bash
# API 호출
POST https://your-domain.com/api/ask-init
```

## 3. 확인 방법

### 환경 변수 확인
1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. 다음 변수들이 있는지 확인:
   - `POSTGRES_URL` ✅

### 테이블 확인
1. Vercel 대시보드 → Storage → 생성한 데이터베이스
2. SQL Editor에서 다음 쿼리 실행:
   ```sql
   SELECT * FROM ask_posts LIMIT 10;
   ```

## 4. 문제 해결

### "Postgres 연결 정보가 없습니다" 에러
- Vercel 대시보드에서 Postgres 데이터베이스를 생성했는지 확인
- 환경 변수 `POSTGRES_URL`이 설정되어 있는지 확인

### 테이블이 생성되지 않음
- Vercel Functions 로그 확인
- `/api/ask-init` API를 수동으로 호출

### 배포 후 동작하지 않음
1. Vercel 대시보드 → Deployments → 최신 배포 확인
2. Functions 탭에서 에러 로그 확인
3. Storage 탭에서 데이터베이스 상태 확인

## 5. 주의사항

- **무료 플랜**: 500MB 제한
- **자동 정리**: 최신 50개만 유지 (51번째 추가 시 1번째 삭제)
- **Notion 동기화**: 백그라운드에서 Notion에도 저장됨 (마스터 데이터)
