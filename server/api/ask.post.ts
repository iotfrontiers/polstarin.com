import { NotionAskReqeust } from '~/composables/notion'
import { insertAskPost } from '~/server/utils/postgres'
import { saveToNotion, sendEmailNotification } from '~/server/utils/ask-file-storage'
import { randomUUID } from 'node:crypto'

/**
 * 제작의뢰
 * Postgres 저장 → Notion 저장 → 이메일 전송 → 사용자 응답
 * 모든 작업을 동기적으로 처리하여 Vercel 서버리스 환경에서도 안정적으로 동작
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
      company: body.company || '',
      content: body.content,
      date: now,
    }
    
    // 1. Postgres에 저장
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
    
    // 2. Notion에 저장
    errorDetails = { step: 'notion_save' }
    let notionSaved = false
    try {
      console.log('[ask.post] Notion 저장 시작:', newId)
      notionSaved = await saveToNotion(newPost, body)
      if (notionSaved) {
        console.log(`[ask.post] Notion 저장 완료: ${newId}`)
      } else {
        console.warn(`[ask.post] Notion 저장 실패 (false 반환): ${newId}`)
      }
    } catch (notionError) {
      console.error('[ask.post] Notion 저장 중 에러 발생:', notionError)
      // Notion 저장 실패해도 계속 진행 (이메일 전송은 시도)
    }
    
    // 3. 이메일 전송
    errorDetails = { step: 'email_send' }
    let emailSent = false
    try {
      console.log('[ask.post] 이메일 전송 시작:', newId)
      emailSent = await sendEmailNotification(newPost, body)
      if (emailSent) {
        console.log(`[ask.post] 이메일 전송 완료: ${newId}`)
      } else {
        console.warn(`[ask.post] 이메일 전송 실패 (false 반환): ${newId}`)
      }
    } catch (emailError) {
      console.error('[ask.post] 이메일 전송 중 에러 발생:', emailError)
      // 이메일 전송 실패해도 사용자에게는 성공 응답 (Postgres 저장은 완료됨)
    }
    
    // 4. 사용자에게 응답
    console.log('[ask.post] 모든 작업 완료:', {
      postId: newId,
      postgresSaved: true,
      notionSaved,
      emailSent,
    })
    
    return {
      success: true,
      message: '문의가 성공적으로 등록되었습니다.',
      id: newId,
      notionSaved,
      emailSent,
    }
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
