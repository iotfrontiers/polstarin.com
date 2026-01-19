import { initAskTable } from '~/server/utils/postgres'

/**
 * Postgres 테이블 초기화 API
 * 최초 1회만 실행하면 됨
 * Vercel에 배포 후 한 번 호출하여 테이블 생성
 */
export default defineEventHandler(async event => {
  try {
    await initAskTable()
    
    return {
      success: true,
      message: 'Postgres 테이블 초기화가 완료되었습니다.',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    throw createError({
      statusCode: 500,
      message: '테이블 초기화 중 오류가 발생하였습니다.',
      data: process.env.NODE_ENV === 'development' ? {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      } : undefined,
    })
  }
})
