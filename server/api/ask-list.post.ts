import { getAskList } from '~/server/utils/postgres'
import { createNotionClient } from '~/server/utils/notion'
import type { NotionData } from '~/composables/notion'

/**
 * 제작의뢰 목록 조회
 * Postgres 우선, 없으면 Notion으로 폴백
 */
export default defineEventHandler(async event => {
  try {
    const body = (await readBody(event)) || {}
    const page = Number(body.page) || 1
    const pageSize = Number(body.pageSize) || 10
    
    // Postgres에서 목록 조회 시도
    try {
      const result = await getAskList(page, pageSize)
      
      // Postgres가 비어있고 첫 페이지일 때: Notion에서 데이터 가져와서 Postgres에 저장
      if (result.list.length === 0 && result.totalCount === 0 && page === 1) {
        console.log('[ask-list] Postgres가 비어있어 Notion에서 데이터 마이그레이션 시도')
        
        try {
          const { notion: notionConfig } = useRuntimeConfig()
          if (notionConfig.askDatabaseId) {
            const notion = createNotionClient()
            let actualDatabaseId = notionConfig.askDatabaseId
            
            // 데이터베이스 ID 찾기
            try {
              await notion.databases.retrieve({ database_id: actualDatabaseId })
            } catch (dbInfoError: any) {
              if (dbInfoError?.code === 'validation_error' && dbInfoError?.message?.includes('is a page, not a database')) {
                const pageInfo = await notion.pages.retrieve({ page_id: actualDatabaseId })
                const blocks = await notion.blocks.children.list({ block_id: actualDatabaseId })
                const databaseBlock = blocks.results.find((block: any) => block.type === 'child_database')
                
                if (databaseBlock) {
                  actualDatabaseId = (databaseBlock as any).id
                }
              }
            }
            
            // Notion에서 최신 50개 가져오기
            const notionResult = await notion.databases.query({
              database_id: actualDatabaseId,
              page_size: 50,
              sorts: [
                {
                  timestamp: 'created_time',
                  direction: 'descending',
                },
              ],
            })
            
            // Postgres에 저장 (비동기로, 사용자 응답을 막지 않음)
            if (notionResult.results.length > 0) {
              const { insertAskPost } = await import('~/server/utils/postgres')
              const { getNotionMarkdownContent } = await import('~/server/utils/notion')
              
              Promise.all(
                notionResult.results.map(async (row: any) => {
                  try {
                    const dateProperty = row?.properties?.['작성일']?.date
                    const createdTime = row?.created_time
                    const dateValue = dateProperty?.start || createdTime
                    
                    // 메세지 필드가 있으면 우선 사용, 없으면 페이지 본문 가져오기
                    const messageField = row?.properties?.['메세지']?.rich_text?.[0]?.plain_text || ''
                    const content = messageField || await getNotionMarkdownContent(row.id)
                    
                    // 날짜 값 파싱하여 타임존 분석
                    let parsedDate = null
                    let timezoneInfo = null
                    if (dateValue) {
                      parsedDate = new Date(dateValue)
                      timezoneInfo = {
                        isDateValid: !isNaN(parsedDate.getTime()),
                        dateISO: parsedDate.toISOString(),
                        dateUTC: parsedDate.toUTCString(),
                        dateLocal: parsedDate.toString(),
                        utcYear: parsedDate.getUTCFullYear(),
                        utcMonth: parsedDate.getUTCMonth() + 1,
                        utcDay: parsedDate.getUTCDate(),
                        utcHours: parsedDate.getUTCHours(),
                        utcMinutes: parsedDate.getUTCMinutes(),
                        localYear: parsedDate.getFullYear(),
                        localMonth: parsedDate.getMonth() + 1,
                        localDay: parsedDate.getDate(),
                        localHours: parsedDate.getHours(),
                        localMinutes: parsedDate.getMinutes(),
                      }
                    }
                    
                    // 디버깅: Notion에서 가져온 날짜 값 확인 (마이그레이션용)
                    console.log('[ask-list][DEBUG] Notion 날짜 조회 (Postgres 저장용):', {
                      id: row.id,
                      title: row?.properties?.['제목']?.title?.[0]?.plain_text || '',
                      dateProperty: {
                        start: dateProperty?.start,
                        end: dateProperty?.end,
                        time_zone: dateProperty?.time_zone,
                      },
                      createdTime,
                      finalDateValue: dateValue,
                      dateValueType: typeof dateValue,
                      dateValueHasZ: dateValue?.includes('Z'),
                      dateValueHasPlus09: dateValue?.includes('+09:00'),
                      dateValueHasPlusOffset: dateValue?.match(/[+-]\d{2}:\d{2}/)?.[0],
                      parsedDateInfo: timezoneInfo,
                    })
                    
                    const post = {
                      id: row.id,
                      title: row?.properties?.['제목']?.title?.[0]?.plain_text || '',
                      author: row?.properties?.['작성자']?.rich_text?.[0]?.plain_text || '',
                      email: row?.properties?.['이메일']?.email || '',
                      contact: row?.properties?.['연락처']?.rich_text?.[0]?.plain_text || '',
                      company: row?.properties?.['회사/소속']?.rich_text?.[0]?.plain_text || '',
                      content: content,
                      viewCnt: row?.properties?.['조회수']?.number || 0,
                      date: dateValue,
                    }
                    
                    // 디버깅: Postgres에 저장하기 직전 확인
                    console.log('[ask-list][DEBUG] Postgres 저장 직전 날짜 확인:', {
                      id: post.id,
                      title: post.title,
                      dateToSave: post.date,
                      dateType: typeof post.date,
                      dateLength: post.date?.length,
                      dateFormat: {
                        hasZ: post.date?.includes('Z'),
                        hasPlus09: post.date?.includes('+09:00'),
                        hasOffset: post.date?.match(/[+-]\d{2}:\d{2}/)?.[0],
                        timezoneFromNotion: dateProperty?.time_zone,
                      },
                    })
                    
                    await insertAskPost(post)
                    
                    // 디버깅: Postgres 저장 후 확인
                    console.log('[ask-list][DEBUG] Postgres 저장 완료:', {
                      id: post.id,
                      title: post.title,
                      savedDate: post.date,
                    })
                  } catch (e) {
                    console.warn(`[ask-list] Notion 데이터 마이그레이션 실패 (${row.id}):`, e)
                  }
                })
              ).then(() => {
                console.log(`[ask-list] Notion에서 ${notionResult.results.length}개 글을 Postgres로 마이그레이션 완료`)
              }).catch(err => {
                console.error('[ask-list] Notion 데이터 마이그레이션 오류:', err)
              })
              
              // 마이그레이션 중이므로 Notion 데이터를 즉시 반환
              const notionList: NotionData[] = notionResult.results.map((row: any) => {
                const dateValue = row?.properties?.['작성일']?.date?.start || row?.created_time
                const dateProperty = row?.properties?.['작성일']?.date
                const createdTime = row?.created_time
                
                // 디버깅: Notion에서 가져온 날짜 값 확인
                console.log('[ask-list][DEBUG] Notion 날짜 조회 (마이그레이션):', {
                  id: row.id,
                  title: row?.properties?.['제목']?.title?.[0]?.plain_text || '',
                  dateProperty: {
                    start: dateProperty?.start,
                    end: dateProperty?.end,
                    time_zone: dateProperty?.time_zone,
                  },
                  createdTime,
                  finalDateValue: dateValue,
                  dateValueType: typeof dateValue,
                })
                
                return {
                  id: row.id,
                  title: row?.properties?.['제목']?.title?.[0]?.plain_text || '',
                  author: row?.properties?.['작성자']?.rich_text?.[0]?.plain_text || '',
                  email: row?.properties?.['이메일']?.email || '',
                  contact: row?.properties?.['연락처']?.rich_text?.[0]?.plain_text || '',
                  company: row?.properties?.['회사/소속']?.rich_text?.[0]?.plain_text || '',
                  viewCnt: row?.properties?.['조회수']?.number || 0,
                  date: dateValue,
                }
              })
              
              return {
                list: notionList,
                totalCount: notionList.length,
                currentPage: page,
                pageSize,
                hasMore: !!notionResult.next_cursor,
                nextCursor: notionResult.next_cursor,
                source: 'notion-migration',
              }
            }
          }
        } catch (migrationError) {
          console.error('[ask-list] Notion 마이그레이션 실패:', migrationError)
          // 마이그레이션 실패해도 빈 배열 반환
        }
      }
      
      return {
        list: result.list,
        totalCount: result.totalCount,
        currentPage: page,
        pageSize,
        hasMore: result.hasMore,
        source: 'postgres',
      }
    } catch (postgresError: any) {
      // Postgres 연결 실패 시 Notion으로 폴백
      if (postgresError?.message?.includes('Postgres 연결 정보가 없습니다') || 
          postgresError?.code === 'missing_connection_string') {
        console.warn('[ask-list] Postgres 연결 실패, Notion으로 폴백')
        
        const { notion: notionConfig } = useRuntimeConfig()
        if (!notionConfig.askDatabaseId) {
          throw createError({
            statusCode: 500,
            message: '데이터베이스 연결 정보가 설정되지 않았습니다.',
          })
        }
        
        const notion = createNotionClient()
        let actualDatabaseId = notionConfig.askDatabaseId
        
        // 데이터베이스 ID 찾기
        try {
          await notion.databases.retrieve({ database_id: actualDatabaseId })
        } catch (dbInfoError: any) {
          if (dbInfoError?.code === 'validation_error' && dbInfoError?.message?.includes('is a page, not a database')) {
            const pageInfo = await notion.pages.retrieve({ page_id: actualDatabaseId })
            const blocks = await notion.blocks.children.list({ block_id: actualDatabaseId })
            const databaseBlock = blocks.results.find((block: any) => block.type === 'child_database')
            
            if (databaseBlock) {
              actualDatabaseId = (databaseBlock as any).id
            }
          }
        }
        
        // Notion에서 데이터 가져오기
        const result = await notion.databases.query({
          database_id: actualDatabaseId,
          page_size: pageSize,
          sorts: [
            {
              timestamp: 'created_time',
              direction: 'descending',
            },
          ],
        })
        
        const notionList: NotionData[] = result.results.map((row: any) => {
          const dateValue = row?.properties?.['작성일']?.date?.start || row?.created_time
          const dateProperty = row?.properties?.['작성일']?.date
          const createdTime = row?.created_time
          
          // 디버깅: Notion에서 가져온 날짜 값 확인
          console.log('[ask-list][DEBUG] Notion 날짜 조회 (폴백):', {
            id: row.id,
            title: row?.properties?.['제목']?.title?.[0]?.plain_text || '',
            dateProperty: {
              start: dateProperty?.start,
              end: dateProperty?.end,
              time_zone: dateProperty?.time_zone,
            },
            createdTime,
            finalDateValue: dateValue,
            dateValueType: typeof dateValue,
          })
          
          return {
            id: row.id,
            title: row?.properties?.['제목']?.title?.[0]?.plain_text || '',
            author: row?.properties?.['작성자']?.rich_text?.[0]?.plain_text || '',
            email: row?.properties?.['이메일']?.email || '',
            contact: row?.properties?.['연락처']?.rich_text?.[0]?.plain_text || '',
            company: row?.properties?.['회사/소속']?.rich_text?.[0]?.plain_text || '',
            date: dateValue,
          }
        })
        
        return {
          list: notionList,
          totalCount: notionList.length,
          currentPage: page,
          pageSize,
          hasMore: !!result.next_cursor,
          nextCursor: result.next_cursor,
          source: 'notion-fallback',
        }
      }
      
      // 다른 Postgres 에러는 그대로 throw
      throw postgresError
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
