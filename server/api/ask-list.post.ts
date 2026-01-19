import { createBoardListApi } from '~/server/utils/notion'

/**
 * 기술/견적 문의 목록 조회
 */
export default defineEventHandler(async event => {
  const { notion: notionConfig } = useRuntimeConfig()
  
  if (!notionConfig.askDatabaseId) {
    throw createError({
      statusCode: 500,
      message: 'NOTION_ASK_DATABASE_ID 환경 변수가 설정되지 않았습니다.',
    })
  }
  
  return createBoardListApi(event, notionConfig.askDatabaseId)
})
