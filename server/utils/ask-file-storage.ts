import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync, promises as fs } from 'node:fs'
import { resolve } from 'pathe'
import type { NotionData, NotionListResponse } from '~/composables/notion'
import { createNotionClient } from './notion'
import { sendEmail } from './email'

const MAX_STATIC_ITEMS = 50 // 최신 50개만 정적 파일에 저장

// 파일 경로 (Vercel 환경에서는 /tmp 사용)
const getDataDir = () => {
  // Vercel 환경 체크
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return '/tmp/data'
  }
  return resolve(process.cwd(), 'data')
}

const getPublicDataDir = () => {
  // Vercel 환경에서는 /tmp 사용
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return '/tmp/public/data/ask'
  }
  return resolve(process.cwd(), 'public/data/ask')
}

export const getAskListPath = () => resolve(getDataDir(), 'ask.json')
export const getAskDetailDir = () => getPublicDataDir()
export const getAskDetailPath = (id: string) => resolve(getAskDetailDir(), `${id}.json`)

/**
 * 정적 파일에 새 글 추가 (최신 50개만 유지)
 * 동시성 처리를 위해 파일 락 사용
 */
export async function appendToAskList(newPost: NotionData) {
  const filePath = getAskListPath()
  
  // 디렉토리 생성 (없으면)
  const dir = resolve(process.cwd(), 'data')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  
  // 파일 락을 위한 간단한 재시도 로직
  let retries = 10
  while (retries > 0) {
    try {
      // 기존 목록 읽기
      let existingData: NotionListResponse<NotionData> & { totalCount?: number } = { list: [], totalCount: 0 }
      if (existsSync(filePath)) {
        try {
          const content = await fs.readFile(filePath, 'utf-8')
          existingData = JSON.parse(content)
        } catch (e) {
          console.warn('기존 파일 읽기 실패, 새로 시작:', e)
          existingData = { list: [], totalCount: 0 }
        }
      }
      
      // 새 글을 맨 앞에 추가
      const updatedList = [newPost, ...(existingData.list || [])]
      
      // 최신 50개만 유지
      const limitedList = updatedList.slice(0, MAX_STATIC_ITEMS)
      
      // 제거된 글들의 ID 찾기 (51번째 이후)
      const removedIds = updatedList.slice(MAX_STATIC_ITEMS).map(item => item.id).filter(Boolean)
      
      // 전체 개수 증가
      const totalCount = (existingData.totalCount || existingData.list?.length || 0) + 1
      
      // 파일 저장
      const dataToSave = {
        list: limitedList,
        totalCount,
        lastUpdated: new Date().toISOString(),
      }
      
      await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8')
      console.log(`[ask-file-storage] 정적 파일에 새 글 추가 완료. 전체 개수: ${totalCount}`)
      
      // 제거된 글들의 상세 파일 삭제
      if (removedIds.length > 0) {
        await cleanupOldDetailFiles(removedIds)
      }
      
      return
    } catch (error: any) {
      // 파일이 잠겨있거나 다른 프로세스가 사용 중일 수 있음
      if (error.code === 'EBUSY' || error.code === 'EAGAIN') {
        retries--
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 100)) // 100ms 대기 후 재시도
          continue
        }
      }
      throw error
    }
  }
  
  throw new Error('파일 저장 실패: 재시도 횟수 초과')
}

/**
 * 상세 파일 저장
 */
export async function saveAskDetail(post: NotionData) {
  const dir = getAskDetailDir()
  const filePath = getAskDetailPath(post.id!)
  
  // 디렉토리 생성
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  
  // 파일 저장
  writeFileSync(filePath, JSON.stringify(post, null, 2), 'utf-8')
  console.log(`[ask-file-storage] 상세 파일 저장 완료: ${post.id}`)
}

/**
 * 오래된 상세 파일 정리 (50개 초과 시 삭제)
 */
async function cleanupOldDetailFiles(removedIds: string[]) {
  const detailDir = getAskDetailDir()
  
  for (const id of removedIds) {
    const filePath = getAskDetailPath(id)
    if (existsSync(filePath)) {
      try {
        await fs.unlink(filePath)
        console.log(`[ask-file-storage] 오래된 상세 파일 삭제: ${id}`)
      } catch (error) {
        console.warn(`[ask-file-storage] 상세 파일 삭제 실패 (${id}):`, error)
      }
    }
  }
}

/**
 * 노션 DB에 저장 (백그라운드)
 */
export async function saveToNotion(post: NotionData, body: any) {
  console.log('[ask-file-storage] saveToNotion 시작:', { postId: post.id, title: post.title })
  
  try {
    console.log('[ask-file-storage] 환경 변수 확인 시작')
    const { notion: notionConfig } = useRuntimeConfig()
    
    if (!notionConfig.askDatabaseId) {
      console.error('[ask-file-storage] NOTION_ASK_DATABASE_ID 없음')
      throw new Error('NOTION_ASK_DATABASE_ID 환경 변수가 설정되지 않았습니다.')
    }
    
    if (!notionConfig.apiSecret) {
      console.error('[ask-file-storage] NOTION_API_SECRET 없음')
      throw new Error('NOTION_API_SECRET 환경 변수가 설정되지 않았습니다.')
    }
    
    console.log('[ask-file-storage] Notion 클라이언트 생성 시작')
    const notion = createNotionClient()
    console.log('[ask-file-storage] Notion 클라이언트 생성 완료')
    
    // 데이터베이스 ID 찾기 (기존 로직과 동일)
    let actualDatabaseId = notionConfig.askDatabaseId
    console.log('[ask-file-storage] 데이터베이스 ID 확인 시작:', actualDatabaseId.substring(0, 10) + '...')
    
    try {
      await notion.databases.retrieve({ database_id: actualDatabaseId })
      console.log('[ask-file-storage] 데이터베이스 직접 접근 성공')
    } catch (dbInfoError: any) {
      console.log('[ask-file-storage] 데이터베이스 직접 접근 실패, 페이지로 시도:', dbInfoError?.code)
      if (dbInfoError?.code === 'validation_error' && dbInfoError?.message?.includes('is a page, not a database')) {
        console.log('[ask-file-storage] 페이지에서 자식 데이터베이스 찾기 시작')
        const page = await notion.pages.retrieve({ page_id: actualDatabaseId })
        const blocks = await notion.blocks.children.list({ block_id: actualDatabaseId })
        const databaseBlock = blocks.results.find((block: any) => block.type === 'child_database')
        
        if (databaseBlock) {
          actualDatabaseId = (databaseBlock as any).id
          console.log('[ask-file-storage] 자식 데이터베이스 찾음:', actualDatabaseId.substring(0, 10) + '...')
          await notion.databases.retrieve({ database_id: actualDatabaseId })
        } else {
          console.error('[ask-file-storage] 자식 데이터베이스를 찾을 수 없음')
        }
      }
    }
    
    // 필드 존재 여부 확인
    console.log('[ask-file-storage] 데이터베이스 스키마 확인 시작')
    let hasDateField = false
    try {
      const dbInfo = await notion.databases.retrieve({ database_id: actualDatabaseId })
      // @ts-ignore
      hasDateField = !!dbInfo?.properties?.['작성일']
      console.log('[ask-file-storage] 스키마 확인 완료:', { hasDateField })
    } catch (e) {
      console.warn('[ask-file-storage] 데이터베이스 정보 조회 실패:', e)
    }
    
    // 연락처 처리
    const contactRichText = body.contact && body.contact.trim()
      ? [{ text: { content: body.contact } }]
      : []
    
    // 회사/소속 처리
    const companyRichText = body.company && body.company.trim()
      ? [{ text: { content: body.company } }]
      : []
    
    // 메세지(본문) 처리
    const messageRichText = post.content && post.content.trim()
      ? [{ text: { content: post.content || '' } }]
      : []
    
    const properties: any = {
      제목: {
        type: 'title',
        title: [{ text: { content: post.title || '' } }],
      },
      작성자: {
        type: 'rich_text',
        rich_text: [{ text: { content: post.author || '' } }],
      },
      이메일: {
        type: 'email',
        email: post.email,
      },
      연락처: {
        type: 'rich_text',
        rich_text: contactRichText,
      },
      '회사/소속': {
        type: 'rich_text',
        rich_text: companyRichText,
      },
      메세지: {
        type: 'rich_text',
        rich_text: messageRichText,
      },
    }
    
    // 작성일 필드가 있으면 추가
    if (hasDateField && post.date) {
      // 디버깅: Notion에 저장할 날짜 확인
      const dateToSave = post.date
      const parsedDate = new Date(dateToSave)
      console.log('[ask-file-storage][DEBUG] Notion 날짜 저장:', {
        postId: post.id,
        dateString: dateToSave,
        dateType: typeof dateToSave,
        parsedDateISO: parsedDate.toISOString(),
        parsedDateUTC: parsedDate.toUTCString(),
        parsedDateLocal: parsedDate.toString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
        notionPayload: {
          type: 'date',
          date: {
            start: dateToSave,
          },
        },
      })
      
      properties.작성일 = {
        type: 'date',
        date: {
          start: post.date,
        },
      }
    }
    
    console.log('[ask-file-storage] Notion 페이지 생성 시작:', { postId: post.id, title: post.title })
    await notion.pages.create({
      parent: { database_id: actualDatabaseId },
      properties,
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: post.content || '' } }],
          },
        },
      ],
    })
    
    console.log(`[ask-file-storage] 노션 DB 저장 완료: ${post.id}`)
    return true
  } catch (error) {
    console.error('[ask-file-storage] 노션 DB 저장 실패:', error)
    console.error('[ask-file-storage] 에러 상세:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return false
  }
}

/**
 * 이메일 전송 (백그라운드)
 */
export async function sendEmailNotification(post: NotionData, body: any) {
  console.log('[ask-file-storage] sendEmailNotification 시작:', { postId: post.id, email: post.email })
  
  try {
    console.log('[ask-file-storage] 이메일 환경 변수 확인 시작')
    const { email: emailConfig } = useRuntimeConfig()
    
    if (!emailConfig.googleSmtpUser) {
      console.error('[ask-file-storage] GOOGLE_SMTP_USER 없음')
      throw new Error('GOOGLE_SMTP_USER 환경 변수가 설정되지 않았습니다.')
    }
    
    if (!emailConfig.googleSmtpPassword) {
      console.error('[ask-file-storage] GOOGLE_SMTP_PASSWORD 없음')
      throw new Error('GOOGLE_SMTP_PASSWORD 환경 변수가 설정되지 않았습니다.')
    }
    
    console.log('[ask-file-storage] 이메일 내용 생성 시작')
    const mailContent = `<p>- 작성자: ${post.author || ''}</p>
      <p>- 회사/소속: ${body.company || '없음'}</p>
      <p>- 작성자 이메일: ${post.email || ''}</p>
      <p>- 작성자 전화번호: ${body.contact || '없음'}</p>
      <p></p>
      <p>${post.content || ''}</p>
    `
    const emailSubject = '폴스타인 제작의뢰 : ' + post.title
    
    console.log('[ask-file-storage] 이메일 전송 시작:', { subject: emailSubject, postId: post.id })
    await sendEmail(emailSubject, mailContent)
    console.log(`[ask-file-storage] 이메일 전송 완료: ${post.id}`)
    return true
  } catch (error) {
    console.error('[ask-file-storage] 이메일 전송 실패:', error)
    console.error('[ask-file-storage] 에러 상세:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return false
  }
}
