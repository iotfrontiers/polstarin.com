/**
 * Postgres 테이블 자동 초기화 플러그인
 * 서버 시작 시 테이블이 없으면 자동으로 생성
 */
export default defineNitroPlugin(async nitroApp => {
  // Vercel 환경에서만 실행
  if (process.env.VERCEL || process.env.POSTGRES_URL) {
    try {
      const { initAskTable } = await import('~/server/utils/postgres')
      
      // 비동기로 초기화 (서버 시작을 블로킹하지 않음)
      initAskTable().catch(err => {
        console.error('[postgres-init] 테이블 초기화 실패:', err)
        // 초기화 실패해도 서버는 계속 실행
      })
      
      console.log('[postgres-init] Postgres 테이블 자동 초기화 시작')
    } catch (error) {
      console.warn('[postgres-init] Postgres 모듈 로드 실패 (정상일 수 있음):', error)
      // Postgres가 설정되지 않은 경우 정상적으로 처리
    }
  }
})
