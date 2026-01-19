import { NotionAskReqeust } from '~/composables/notion'
import { insertAskPost } from '~/server/utils/postgres'
import { saveToNotion, sendEmailNotification } from '~/server/utils/ask-file-storage'
import { randomUUID } from 'node:crypto'

/**
 * 기술/견적 문의
 * Postgres에 즉시 저장 → 사용자 응답 → 백그라운드에서 Notion 저장 및 이메일 전송
 */
export default defineEventHandler(async event => {
  let errorDetails: any = { step: 'init' }
  
  try {
    errorDetails = { step: 'load_config' }
    const { notion: notionConfig, email: emailConfig } = useRuntimeConfig()
    
    // 환경 변수 검증
    if (!notionConfig.askDatabaseId) {
      console.error('⚠️ NOTION_ASK_DATABASE_ID 환경 변수가 설정되지 않았습니다!')
    }
    if (!notionConfig.apiSecret) {
      console.error('⚠️ NOTION_API_SECRET 환경 변수가 설정되지 않았습니다!')
    }
    if (!emailConfig.googleSmtpUser) {
      console.error('⚠️ GOOGLE_SMTP_USER 환경 변수가 설정되지 않았습니다!')
    }
    if (!emailConfig.googleSmtpPassword) {
      console.error('⚠️ GOOGLE_SMTP_PASSWORD 환경 변수가 설정되지 않았습니다!')
    }
    
    errorDetails = { step: 'read_body' }
    const body = (await readBody(event)) as NotionAskReqeust

    errorDetails = { step: 'validate_body' }
    
    if (!body || !body.title || !body.author || !body.content || !body.email || !/.+@.+\..+/.test(body.email)) {
      errorDetails = { 
        step: 'validate_body_failed',
        body: {
          hasBody: !!body,
          hasTitle: !!body?.title,
          hasAuthor: !!body?.author,
          hasContent: !!body?.content,
          hasEmail: !!body?.email,
          emailValid: body?.email ? /.+@.+\..+/.test(body.email) : false,
        }
      }
      throw createError({
        statusCode: 400,
        message: '유효하지 않은 요청입니다.',
      })
    }

    errorDetails = { step: 'generate_id' }
    const newId = randomUUID()
    const now = new Date().toISOString()
    
    const newPost = {
      id: newId,
      title: body.title,
      author: body.author,
      email: body.email,
      contact: body.contact || '',
      content: body.content,
      viewCnt: 0,
      date: now,
    }
    
    // 1. Postgres에 즉시 저장 (사용자 응답을 위해 동기 처리)
    errorDetails = { step: 'postgres_save' }
    try {
      await insertAskPost(newPost)
      console.log(`[ask.post] Postgres 저장 완료: ${newId}`)
    } catch (postgresError) {
      console.error('[ask.post] Postgres 저장 실패:', postgresError)
      throw createError({
        statusCode: 500,
        message: '문의 등록 중 오류가 발생하였습니다.',
      })
    }
    
    // 2. 사용자에게 즉시 응답
    const response = {
      success: true,
      message: '문의가 성공적으로 등록되었습니다.',
      id: newId,
    }
    
    // 3. 백그라운드 작업을 별도 API로 호출 (사용자 응답 기다리지 않음)
    console.log('[ask.post] 백그라운드 작업 시작:', newId)
    
    // SITE_URL 환경 변수 확인
    const siteUrl = process.env.SITE_URL || (process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000')
    const backgroundUrl = `${siteUrl}/api/ask-background`
    console.log('[ask.post] 백그라운드 API URL:', backgroundUrl)
    console.log('[ask.post] 환경 변수:', {
      hasSiteUrl: !!process.env.SITE_URL,
      hasVercelUrl: !!process.env.VERCEL_URL,
      vercelUrl: process.env.VERCEL_URL,
      finalSiteUrl: siteUrl,
    })
    
    // $fetch로 별도 API 호출 (await하지 않음 - fire and forget)
    $fetch(backgroundUrl, {
      method: 'POST',
      body: {
        post: newPost,
        originalBody: body,
      },
    })
      .then(result => {
        console.log('[ask.post] 백그라운드 작업 완료:', result)
      })
      .catch(err => {
        console.error('[ask.post] 백그라운드 API 호출 실패:', {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          data: (err as any)?.data,
          status: (err as any)?.status,
        })
      })
    
    console.log('[ask.post] 사용자 응답 반환 (백그라운드 작업은 계속 진행됨):', newId)
    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isDev = process.env.NODE_ENV === 'development' || process.dev
    
    throw createError({
      statusCode: 500,
      message: isDev 
        ? `문의 등록 중 오류가 발생하였습니다. [${errorDetails?.step || 'unknown'}] ${errorMessage}`
        : '문의 등록 중 오류가 발생하였습니다. 오류가 지속될 경우 담당자에게 문의해주세요.',
      data: isDev ? {
        error: errorMessage,
        step: errorDetails?.step || 'unknown',
        stack: error instanceof Error ? error.stack : undefined,
      } : undefined,
    })
  }
})
