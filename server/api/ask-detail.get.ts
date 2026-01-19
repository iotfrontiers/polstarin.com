import { getAskDetail } from '~/server/utils/postgres'
import type { NotionData } from '~/composables/notion'

/**
 * 기술/견적 문의 상세 조회
 * Postgres에서 직접 조회 (빠름)
 */
export default defineEventHandler(async event => {
  const query = getQuery(event)
  const id = query['id'] as string
  
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'id가 필요합니다.',
    })
  }
  
  try {
    // Postgres에서 상세 조회
    const detailData = await getAskDetail(id)
    
    if (!detailData) {
      throw createError({
        statusCode: 404,
        message: '글을 찾을 수 없습니다.',
      })
    }
    
    return detailData
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // 이미 404 에러면 그대로 반환
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({
      statusCode: 404,
      message: '글을 찾을 수 없습니다.',
      data: process.env.NODE_ENV === 'development' ? {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      } : undefined,
    })
  }
})
