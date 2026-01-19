import { createBoardListApi } from '~/server/utils/notion'
import { createNotionClient } from '~/server/utils/notion'

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
  
  // ask.post.ts와 동일한 로직으로 실제 데이터베이스 ID 찾기
  const notion = createNotionClient()
  let actualDatabaseId = notionConfig.askDatabaseId
  
  try {
    await notion.databases.retrieve({
      database_id: actualDatabaseId,
    })
  } catch (dbInfoError: any) {
    // 페이지인 경우, 자식 데이터베이스 찾기
    if (dbInfoError?.code === 'validation_error' && dbInfoError?.message?.includes('is a page, not a database')) {
      try {
        // 페이지를 가져와서 자식 블록 확인
        await notion.pages.retrieve({ page_id: actualDatabaseId })
        
        // 페이지의 자식 블록 조회
        const blocks = await notion.blocks.children.list({ block_id: actualDatabaseId })
        
        // 데이터베이스 블록 찾기
        const databaseBlock = blocks.results.find((block: any) => block.type === 'child_database')
        
        if (databaseBlock) {
          const blockId = (databaseBlock as any).id
          actualDatabaseId = blockId
          
          // 실제 데이터베이스 ID로 다시 조회
          await notion.databases.retrieve({
            database_id: actualDatabaseId,
          })
        } else {
          throw new Error('페이지 내에 자식 데이터베이스를 찾을 수 없습니다.')
        }
      } catch (childDbError) {
        throw childDbError
      }
    } else {
      // 다른 종류의 에러는 그대로 throw
      throw dbInfoError
    }
  }
  
  try {
    return await createBoardListApi(event, actualDatabaseId)
  } catch (error) {
    console.error('ask-list API 오류:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : '문의 목록 조회 중 오류가 발생했습니다.',
    })
  }
})
