import { getAskDetail } from '~/server/utils/postgres'
import type { NotionData } from '~/composables/notion'

/**
 * 제작의뢰 상세 조회
 * Postgres에서 직접 조회 (빠름)
 */
export default defineEventHandler(async event => {
  const query = getQuery(event)
  const id = query['id'] as string
  const password = query['password'] as string | undefined
  
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
    
    // 비밀번호가 설정되어 있으면 확인
    if (detailData.password && detailData.password.trim()) {
      if (!password || password !== detailData.password) {
        throw createError({
          statusCode: 401,
          message: '비밀번호가 일치하지 않습니다.',
        })
      }
    }
    
    // 비밀번호는 응답에서 제거 (보안)
    const { password: _, ...responseData } = detailData
    
    return responseData
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
