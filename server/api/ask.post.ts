import { NotionAskReqeust } from '~/composables/notion'
import { appendToAskList, saveAskDetail, saveToNotion, sendEmailNotification } from '~/server/utils/ask-file-storage'
import { randomUUID } from 'node:crypto'

/**
 * 기술/견적 문의
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

    // 1. 정적 파일에 즉시 저장 (사용자 응답을 위해 동기 처리)
    errorDetails = { step: 'static_file_save' }
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
    
    try {
      await appendToAskList(newPost)
      await saveAskDetail(newPost)
    } catch (fileError) {
      console.error('정적 파일 저장 오류:', fileError)
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
    
    // 3. 백그라운드 처리 (비동기, 사용자 응답 기다리지 않음)
    Promise.all([
      saveToNotion(newPost, body).catch(err => {
        console.error('노션 저장 실패 (백그라운드):', err)
        return false
      }),
      sendEmailNotification(newPost, body).catch(err => {
        console.error('이메일 전송 실패 (백그라운드):', err)
        return false
      }),
    ]).then(([notionSaved, emailSent]) => {
      console.log(`[ask.post] 백그라운드 처리 완료 - 노션: ${notionSaved}, 이메일: ${emailSent}`)
    }).catch(err => {
      console.error('[ask.post] 백그라운드 처리 오류:', err)
    })
    
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
