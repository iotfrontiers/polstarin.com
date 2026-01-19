import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'pathe'
import { createNotionClient } from '~/server/utils/notion'
import { getNotionMarkdownContent } from '~/server/utils/notion'
import type { NotionData } from '~/composables/notion'

// 정적 파일 경로
const getAskDetailPath = (id: string) => resolve(process.cwd(), `public/data/ask/${id}.json`)

/**
 * 기술/견적 문의 상세 조회
 * 1. 정적 파일에서 먼저 확인 (빠름)
 * 2. 없으면 노션에서 가져오기 (느리지만 필요할 때만)
 */
export default defineEventHandler(async event => {
  const query = getQuery(event)
  const id = query['id'] as string
  const updateView = query['update'] === 'true'
  
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'id가 필요합니다.',
    })
  }
  
  // 1. 정적 파일에서 먼저 확인
  const filePath = getAskDetailPath(id)
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf-8')
      const detailData: NotionData = JSON.parse(content)
      
      // 조회수 업데이트 (노션에만, 정적 파일은 업데이트 안 함)
      if (updateView) {
        updateViewCountInNotion(id).catch(err => {
          console.error('조회수 업데이트 실패:', err)
        })
      }
      
      return detailData
    } catch (e) {
      console.warn('정적 파일 읽기 실패, 노션에서 가져오기:', e)
    }
  }
  
  // 2. 정적 파일에 없으면 노션에서 가져오기
  const { notion: notionConfig } = useRuntimeConfig()
  if (!notionConfig.askDatabaseId) {
    throw createError({
      statusCode: 500,
      message: 'NOTION_ASK_DATABASE_ID 환경 변수가 설정되지 않았습니다.',
    })
  }
  
  const notion = createNotionClient()
  
  try {
    const pageInfo = await notion.pages.retrieve({ page_id: id })
    
    // 조회수 업데이트
    if (updateView) {
      // @ts-ignore
      const viewCntField = pageInfo?.properties?.['조회수']
      if (viewCntField) {
        const viewCnt = viewCntField?.number || 0
        try {
          await notion.pages.update({
            page_id: id,
            properties: {
              조회수: {
                number: viewCnt + 1,
              },
            },
          })
        } catch (e) {
          console.warn('조회수 업데이트 실패:', e)
        }
      }
    }
    
    // 게시여부 확인
    // @ts-ignore
    const publishedField = pageInfo?.properties?.['게시여부']
    if (publishedField && publishedField?.checkbox !== true) {
      throw createError({
        statusCode: 404,
        message: '게시되지 않은 글입니다.',
      })
    }
    
    // 작성일 필드가 있으면 사용하고, 없으면 created_time 사용
    // @ts-ignore
    const dateValue = pageInfo?.properties?.['작성일']?.date?.start || pageInfo?.created_time
    
    // 이메일과 연락처 가져오기
    // @ts-ignore
    const email = pageInfo?.properties?.['이메일']?.email || ''
    // @ts-ignore
    const contact = pageInfo?.properties?.['연락처']?.['rich_text']?.[0]?.['plain_text'] || ''
    
    const data: NotionData = {
      id: pageInfo.id as string,
      // @ts-ignore
      title: pageInfo?.properties?.['제목']?.title[0]?.['plain_text'] as string,
      // @ts-ignore
      author: pageInfo?.properties?.['작성자']?.['rich_text'][0]?.['plain_text'] as string,
      // @ts-ignore
      viewCnt: pageInfo?.properties?.['조회수']?.number || 0,
      date: dateValue,
      email,
      contact,
      content: await getNotionMarkdownContent(id),
      imgUrl: '',
    }
    
    return data
  } catch (error) {
    throw createError({
      statusCode: 404,
      message: '글을 찾을 수 없습니다.',
    })
  }
})

/**
 * 노션에서 조회수만 업데이트 (백그라운드)
 */
async function updateViewCountInNotion(id: string) {
  try {
    const { notion: notionConfig } = useRuntimeConfig()
    const notion = createNotionClient()
    
    const pageInfo = await notion.pages.retrieve({ page_id: id })
    // @ts-ignore
    const viewCntField = pageInfo?.properties?.['조회수']
    
    if (viewCntField) {
      const viewCnt = viewCntField?.number || 0
      await notion.pages.update({
        page_id: id,
        properties: {
          조회수: {
            number: viewCnt + 1,
          },
        },
      })
    }
  } catch (e) {
    console.error('조회수 업데이트 실패:', e)
  }
}
