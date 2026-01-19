/**
 * Postgres 테이블 자동 초기화 플러그인
 * 서버 시작 시 테이블이 없으면 자동으로 생성
 */
export default defineNitroPlugin(async nitroApp => {
  // Postgres 환경 변수 확인
  const hasPostgresEnv = !!(
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING
  )
  
  // Vercel 환경이거나 Postgres 환경 변수가 있을 때만 실행
  if (process.env.VERCEL || hasPostgresEnv) {
    try {
      const { initAskTable } = await import('~/server/utils/postgres')
      
      // 비동기로 초기화 (서버 시작을 블로킹하지 않음)
      initAskTable().catch(err => {
        console.error('[postgres-init] 테이블 초기화 실패:', err)
        console.error('[postgres-init] Vercel 대시보드 → Storage → polstarin-db에서 Connection String 확인 필요')
        // 초기화 실패해도 서버는 계속 실행
      })
      
      console.log('[postgres-init] Postgres 테이블 자동 초기화 시작')
    } catch (error) {
      console.warn('[postgres-init] Postgres 모듈 로드 실패:', error)
      // Postgres가 설정되지 않은 경우 정상적으로 처리
    }
  } else {
    console.warn('[postgres-init] Postgres 환경 변수가 없어 초기화를 건너뜁니다.')
    console.warn('[postgres-init] Vercel 대시보드에서 Postgres 데이터베이스를 생성하고 환경 변수를 설정해주세요.')
  }
})
