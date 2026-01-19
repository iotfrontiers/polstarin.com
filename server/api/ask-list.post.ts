import { createNotionClient } from '~/server/utils/notion'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'pathe'
import type { NotionData, NotionListResponse } from '~/composables/notion'
import { getAskListPath, getAskDetailDir, getAskDetailPath } from '~/server/utils/ask-file-storage'

const MAX_STATIC_ITEMS = 50 // 최신 50개만 정적 파일에 저장

/**
 * 기술/견적 문의 목록 조회 (하이브리드 방식)
 * - 최신 50개: 정적 파일에서 읽기 (빠름)
 * - 51개 이상: 노션 API에서 읽기 (느리지만 필요할 때만)
 */
export default defineEventHandler(async event => {
  const body = (await readBody(event)) || {}
  const page = Number(body.page) || 1
  const pageSize = Number(body.pageSize) || 10
  const offset = (page - 1) * pageSize
  
  // 정적 파일 읽기
  const filePath = getAskListPath()
  let staticData: NotionListResponse<NotionData> & { totalCount?: number } = { list: [], totalCount: 0 }
  
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf-8')
      staticData = JSON.parse(content)
    } catch (e) {
      console.warn('정적 파일 읽기 실패:', e)
    }
  }
  
  const staticList = staticData.list || []
  // totalCount가 없거나 0이면 실제 리스트 개수를 사용
  let totalCount = staticData.totalCount
  if (!totalCount || totalCount === 0) {
    totalCount = staticList.length
  }
  
  // 디버그 로그
  console.log('[ask-list] 정적 파일 데이터:', {
    listCount: staticList.length,
    totalCount: staticData.totalCount,
    calculatedTotalCount: totalCount,
  })
  
  // 정적 파일이 비어있거나 데이터가 없을 때: 노션에서 최신 50개 가져와서 정적 파일에 저장
  if (staticList.length === 0 && page === 1) {
    // 노션에서 최신 50개 가져오기
    const { notion: notionConfig } = useRuntimeConfig()
    
    if (notionConfig.askDatabaseId) {
      try {
        const notion = createNotionClient()
        let actualDatabaseId = notionConfig.askDatabaseId
        
        // 데이터베이스 ID 찾기
        try {
          await notion.databases.retrieve({ database_id: actualDatabaseId })
        } catch (dbInfoError: any) {
          if (dbInfoError?.code === 'validation_error' && dbInfoError?.message?.includes('is a page, not a database')) {
            try {
              await notion.pages.retrieve({ page_id: actualDatabaseId })
              const blocks = await notion.blocks.children.list({ block_id: actualDatabaseId })
              const databaseBlock = blocks.results.find((block: any) => block.type === 'child_database')
              
              if (databaseBlock) {
                actualDatabaseId = (databaseBlock as any).id
                await notion.databases.retrieve({ database_id: actualDatabaseId })
              }
            } catch (childDbError) {
              // 에러 무시하고 계속 진행
            }
          }
        }
        
        // 필드 존재 여부 확인
        let hasPublishedField = false
        let hasDateField = false
        try {
          const dbInfo = await notion.databases.retrieve({ database_id: actualDatabaseId })
          // @ts-ignore
          hasPublishedField = !!dbInfo?.properties?.['게시여부']
          // @ts-ignore
          hasDateField = !!dbInfo?.properties?.['작성일']
        } catch (e) {
          // 에러 무시
        }
        
        // 필터 및 정렬 설정
        const filter = hasPublishedField
          ? {
              property: '게시여부',
              checkbox: { equals: true },
            }
          : undefined
        
        const sorts: any[] = []
        if (hasDateField) {
          sorts.push({
            property: '작성일',
            direction: 'descending',
          })
        }
        sorts.push({
          timestamp: 'created_time',
          direction: 'descending',
        })
        
        // 노션에서 최신 50개 가져오기
        const queryParams: any = {
          database_id: actualDatabaseId,
          page_size: MAX_STATIC_ITEMS,
          sorts,
        }
        
        if (filter) {
          queryParams.filter = filter
        }
        
        const result = await notion.databases.query(queryParams)
        
        // 정적 파일에 저장할 데이터 변환
        const notionList: NotionData[] = []
        for (const row of result.results) {
          const dateValue = row?.properties?.['작성일']?.date?.start || row?.created_time
          const post: NotionData = {
            id: row.id,
            title: row?.properties?.['제목']?.title?.[0]?.plain_text || '',
            author: row?.properties?.['작성자']?.rich_text?.[0]?.plain_text || '',
            email: row?.properties?.['이메일']?.email || '',
            contact: row?.properties?.['연락처']?.rich_text?.[0]?.plain_text || '',
            viewCnt: row?.properties?.['조회수']?.number || 0,
            date: dateValue,
            content: '', // 목록에서는 content 불필요
          }
          
          notionList.push(post)
        }
        
        // 기존 파일에 덮어쓰기 (목록만)
        const filePath = getAskListPath()
        const dir = resolve(process.cwd(), 'data')
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true })
        }
        
        // 전체 개수 확인 (노션에 50개 미만일 수도 있음)
        const actualTotalCount = notionList.length
        
        writeFileSync(
          filePath,
          JSON.stringify(
            {
              list: notionList,
              totalCount: actualTotalCount, // 실제 가져온 개수 (50개 미만일 수도 있음)
              lastUpdated: new Date().toISOString(),
            },
            null,
            2
          ),
          'utf-8'
        )
        
        // 상세 파일도 저장 (비동기로)
        const detailDir = getAskDetailDir()
        if (!existsSync(detailDir)) {
          mkdirSync(detailDir, { recursive: true })
        }
        
        // 상세 파일은 백그라운드로 저장 (마크다운 변환 필요)
        Promise.all(
          notionList.map(async post => {
            try {
              const { getNotionMarkdownContent } = await import('~/server/utils/notion')
              const content = await getNotionMarkdownContent(post.id!)
              const detailPost = { ...post, content }
              
              const detailPath = getAskDetailPath(post.id!)
              writeFileSync(detailPath, JSON.stringify(detailPost, null, 2), 'utf-8')
            } catch (e) {
              console.warn(`상세 파일 저장 실패 (${post.id}):`, e)
            }
          })
        ).catch(err => {
          console.error('상세 파일 저장 오류:', err)
        })
        
        // 정적 파일 데이터 업데이트
        staticData.list = notionList
        staticData.totalCount = actualTotalCount
        
        console.log(`[ask-list] 노션에서 ${notionList.length}개 글을 정적 파일로 마이그레이션 완료`)
      } catch (migrationError) {
        console.error('[ask-list] 정적 파일 마이그레이션 실패:', migrationError)
        // 마이그레이션 실패해도 계속 진행 (노션에서 가져오기)
      }
    }
  }
  
  // 페이지 1-5 (1-50개)인 경우: 정적 파일에서 반환
  if (offset < MAX_STATIC_ITEMS && staticData.list && staticData.list.length > 0) {
    const endIndex = Math.min(offset + pageSize, MAX_STATIC_ITEMS)
    const pageData = staticData.list.slice(offset, endIndex)
    
    // totalCount가 없거나 0이면 실제 리스트 개수를 사용
    const finalTotalCount = totalCount > 0 ? totalCount : staticData.list.length
    
    console.log('[ask-list] 정적 파일 반환:', {
      offset,
      pageSize,
      listLength: staticData.list.length,
      totalCount,
      finalTotalCount,
      pageDataLength: pageData.length,
    })
    
    return {
      list: pageData,
      totalCount: finalTotalCount,
      currentPage: page,
      pageSize,
      hasMore: offset + pageSize < finalTotalCount,
      source: 'static',
    }
  }
  
  // 페이지 6 이상 (51개 이상): 노션에서 가져오기
  const { notion: notionConfig } = useRuntimeConfig()
  
  if (!notionConfig.askDatabaseId) {
    throw createError({
      statusCode: 500,
      message: 'NOTION_ASK_DATABASE_ID 환경 변수가 설정되지 않았습니다.',
    })
  }
  
  const notion = createNotionClient()
  let actualDatabaseId = notionConfig.askDatabaseId
  
  // 데이터베이스 ID 찾기
  try {
    await notion.databases.retrieve({ database_id: actualDatabaseId })
  } catch (dbInfoError: any) {
    if (dbInfoError?.code === 'validation_error' && dbInfoError?.message?.includes('is a page, not a database')) {
      try {
        await notion.pages.retrieve({ page_id: actualDatabaseId })
        const blocks = await notion.blocks.children.list({ block_id: actualDatabaseId })
        const databaseBlock = blocks.results.find((block: any) => block.type === 'child_database')
        
        if (databaseBlock) {
          actualDatabaseId = (databaseBlock as any).id
          await notion.databases.retrieve({ database_id: actualDatabaseId })
        }
      } catch (childDbError) {
        throw childDbError
      }
    } else {
      throw dbInfoError
    }
  }
  
  // 노션에서 해당 페이지 데이터 가져오기
  // 노션은 cursor 기반 페이지네이션을 사용하므로, offset을 cursor로 변환해야 함
  // 하지만 노션 API는 cursor만 지원하므로, 처음부터 순회하거나 다른 방법 필요
  
  // 간단한 방법: 노션에서 page_size만큼 가져오고, 필요하면 여러 번 호출
  // 하지만 이건 비효율적이므로, 일단 첫 50개 이후 데이터를 가져오는 방식으로
  
  const result = await notion.databases.query({
    database_id: actualDatabaseId,
    page_size: pageSize,
    start_cursor: body.startCursor, // 이전 페이지의 cursor
    sorts: [
      {
        timestamp: 'created_time',
        direction: 'descending',
      },
    ],
  })
  
  // 노션 데이터를 우리 형식으로 변환
  const notionList: NotionData[] = result.results.map((row: any) => {
    const dateValue = row?.properties?.['작성일']?.date?.start || row?.created_time
    return {
      id: row.id,
      title: row?.properties?.['제목']?.title?.[0]?.plain_text || '',
      author: row?.properties?.['작성자']?.rich_text?.[0]?.plain_text || '',
      email: row?.properties?.['이메일']?.email || '',
      contact: row?.properties?.['연락처']?.rich_text?.[0]?.plain_text || '',
      viewCnt: row?.properties?.['조회수']?.number || 0,
      date: dateValue,
    }
  })
  
  return {
    list: notionList,
    totalCount,
    currentPage: page,
    pageSize,
    hasMore: !!result.next_cursor,
    nextCursor: result.next_cursor,
    source: 'notion',
  }
})
