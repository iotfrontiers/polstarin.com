import { saveToNotion, sendEmailNotification } from '~/server/utils/ask-file-storage'
import type { NotionData } from '~/composables/notion'
import { NotionAskReqeust } from '~/composables/notion'

/**
 * 백그라운드 작업 전용 API
 * Notion 저장 및 이메일 전송을 별도로 처리
 */
export default defineEventHandler(async event => {
  console.log('[ask-background] 백그라운드 작업 시작')
  
  try {
    const body = (await readBody(event)) as {
      post: NotionData
      originalBody: NotionAskReqeust
    }
    
    if (!body.post || !body.originalBody) {
      console.error('[ask-background] 잘못된 요청 데이터:', { hasPost: !!body.post, hasOriginalBody: !!body.originalBody })
      throw createError({
        statusCode: 400,
        message: 'Invalid request data',
      })
    }
    
    console.log('[ask-background] 데이터 확인:', {
      postId: body.post.id,
      postTitle: body.post.title,
      hasEmail: !!body.originalBody.email,
    })
    
    // Notion 저장
    console.log('[ask-background] Notion 저장 시작:', body.post.id)
    const notionResult = await saveToNotion(body.post, body.originalBody)
    console.log('[ask-background] Notion 저장 결과:', notionResult)
    
    // 이메일 전송
    console.log('[ask-background] 이메일 전송 시작:', body.post.id)
    const emailResult = await sendEmailNotification(body.post, body.originalBody)
    console.log('[ask-background] 이메일 전송 결과:', emailResult)
    
    console.log('[ask-background] 백그라운드 작업 완료:', {
      postId: body.post.id,
      notionSaved: notionResult,
      emailSent: emailResult,
    })
    
    return {
      success: true,
      notionSaved: notionResult,
      emailSent: emailResult,
    }
  } catch (error) {
    console.error('[ask-background] 백그라운드 작업 실패:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    throw createError({
      statusCode: 500,
      message: 'Background task failed',
      data: {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      },
    })
  }
})
