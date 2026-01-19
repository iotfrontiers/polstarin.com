import { getAskList, getTotalCount } from '~/server/utils/postgres'
import type { NotionData } from '~/composables/notion'

/**
 * 기술/견적 문의 목록 조회
 * Postgres에서 직접 조회 (빠름)
 */
export default defineEventHandler(async event => {
  try {
    const body = (await readBody(event)) || {}
    const page = Number(body.page) || 1
    const pageSize = Number(body.pageSize) || 10
    
    // Postgres에서 목록 조회
    const result = await getAskList(page, pageSize)
    
    return {
      list: result.list,
      totalCount: result.totalCount,
      currentPage: page,
      pageSize,
      hasMore: result.hasMore,
      source: 'postgres',
    }
  } catch (error) {
    console.error('[ask-list] 목록 조회 실패:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    throw createError({
      statusCode: 500,
      message: '문의 목록을 불러오는 중 오류가 발생하였습니다.',
      data: process.env.NODE_ENV === 'development' ? {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      } : undefined,
    })
  }
})
