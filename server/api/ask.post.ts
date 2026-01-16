import { NotionAskReqeust } from '~/composables/notion'
import { createNotionClient } from '~/server/utils/notion'
import { sendEmail } from '~/server/utils/email'

/**
 * 기술/견적 문의
 */
export default defineEventHandler(async event => {
  console.log('[DEBUG][ask] ========== 문의 등록 API 시작 ==========')
  try {
    console.log('[DEBUG][ask] 1. 환경 변수 로드 시작...')
    const { notion: notionConfig } = useRuntimeConfig()
    console.log('[DEBUG][ask] 1-1. notionConfig.askDatabaseId 존재 여부:', !!notionConfig.askDatabaseId)
    console.log('[DEBUG][ask] 1-2. notionConfig.askDatabaseId 값:', notionConfig.askDatabaseId ? `${notionConfig.askDatabaseId.substring(0, 10)}...` : '없음')
    
    console.log('[DEBUG][ask] 2. Notion 클라이언트 생성 시작...')
    const notion = createNotionClient()
    console.log('[DEBUG][ask] 2-1. Notion 클라이언트 생성 완료')
    
    console.log('[DEBUG][ask] 3. 요청 본문 읽기 시작...')
    const body = (await readBody(event)) as NotionAskReqeust
    console.log('[DEBUG][ask] 3-1. 요청 본문:', JSON.stringify(body, null, 2))

    console.log('[DEBUG][ask] 4. 요청 본문 검증 시작...')
    console.log('[DEBUG][ask] 4-1. body 존재:', !!body)
    console.log('[DEBUG][ask] 4-2. body.title:', body?.title || '없음')
    console.log('[DEBUG][ask] 4-3. body.author:', body?.author || '없음')
    console.log('[DEBUG][ask] 4-4. body.content:', body?.content ? `${body.content.substring(0, 50)}...` : '없음')
    console.log('[DEBUG][ask] 4-5. body.email:', body?.email || '없음')
    console.log('[DEBUG][ask] 4-6. 이메일 형식 검증:', body?.email ? /.+@.+\..+/.test(body.email) : false)
    
    if (!body || !body.title || !body.author || !body.content || !body.email || !/.+@.+\..+/.test(body.email)) {
      console.error('[DEBUG][ask] 4-7. 요청 본문 검증 실패')
      throw createError({
        statusCode: 400,
        message: '유효하지 않은 요청입니다.',
      })
    }
    console.log('[DEBUG][ask] 4-8. 요청 본문 검증 완료')

    // Notion에 저장 (에러가 발생해도 이메일은 전송하도록 try-catch 분리)
    console.log('[DEBUG][ask] 5. Notion 저장 시작...')
    let notionSaved = false
    try {
      console.log('[DEBUG][ask] 5-1. 연락처 처리 시작...')
      // 연락처가 비어있을 경우 빈 배열로 처리
      const contactRichText = body.contact && body.contact.trim()
        ? [
            {
              text: {
                content: body.contact,
              },
            },
          ]
        : []
      console.log('[DEBUG][ask] 5-2. 연락처 처리 완료, contactRichText 길이:', contactRichText.length)

      console.log('[DEBUG][ask] 5-3. Notion 페이지 생성 요청 시작...')
      console.log('[DEBUG][ask] 5-4. database_id:', notionConfig.askDatabaseId)
      const pageResponse = await notion.pages.create({
        parent: {
          database_id: notionConfig.askDatabaseId,
        },
        properties: {
          제목: {
            type: 'title',
            title: [
              {
                text: {
                  content: body.title || '',
                },
              },
            ],
          },
          작성자: {
            type: 'rich_text',
            rich_text: [
              {
                text: {
                  content: body.author || '',
                },
              },
            ],
          },
          이메일: {
            type: 'email',
            email: body.email,
          },
          연락처: {
            type: 'rich_text',
            rich_text: contactRichText,
          },
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: body.content || '',
                  },
                },
              ],
            },
          },
        ],
      })
      
      console.log('[DEBUG][ask] 5-5. Notion 페이지 생성 요청 완료')
      notionSaved = true
      console.log('[DEBUG][ask] 5-6. Notion 저장 성공, 페이지 ID:', pageResponse.id)
    } catch (notionError) {
      console.error('[DEBUG][ask] 5-7. Notion 저장 오류 발생!')
      console.error('[DEBUG][ask] 5-8. Notion 저장 오류 타입:', notionError?.constructor?.name || typeof notionError)
      console.error('[DEBUG][ask] 5-9. Notion 저장 오류 메시지:', notionError instanceof Error ? notionError.message : String(notionError))
      if (notionError instanceof Error && notionError.stack) {
        console.error('[DEBUG][ask] 5-10. Notion 저장 오류 스택:', notionError.stack)
      }
      // Notion 저장 실패해도 이메일은 전송하도록 계속 진행
    }

    // 이메일 전송 (에러가 발생해도 Notion 저장은 성공했을 수 있으므로 try-catch 분리)
    console.log('[DEBUG][ask] 6. 이메일 전송 시작...')
    let emailSent = false
    try {
      console.log('[DEBUG][ask] 6-1. 이메일 내용 생성 시작...')
      let mailContent = `<p>- 작성자: ${body.author || ''}</p>
      <p>- 작성자 이메일: ${body.email || ''}</p>
      <p>- 작성자 전화번호: ${body.contact || '없음'}</p>
      <p></p>
      <p>${body.content || ''}</p>
      `
      const emailSubject = '폴스타인 기술/견적문의 : ' + body.title
      console.log('[DEBUG][ask] 6-2. 이메일 제목:', emailSubject)
      console.log('[DEBUG][ask] 6-3. 이메일 내용 길이:', mailContent.length)

      console.log('[DEBUG][ask] 6-4. sendEmail 함수 호출 시작...')
      await sendEmail(emailSubject, mailContent)
      console.log('[DEBUG][ask] 6-5. sendEmail 함수 호출 완료')
      emailSent = true
      console.log('[DEBUG][ask] 6-6. 이메일 전송 성공')
    } catch (emailError) {
      console.error('[DEBUG][ask] 6-7. 이메일 전송 오류 발생!')
      console.error('[DEBUG][ask] 6-8. 이메일 전송 오류 타입:', emailError?.constructor?.name || typeof emailError)
      console.error('[DEBUG][ask] 6-9. 이메일 전송 오류 메시지:', emailError instanceof Error ? emailError.message : String(emailError))
      if (emailError instanceof Error && emailError.stack) {
        console.error('[DEBUG][ask] 6-10. 이메일 전송 오류 스택:', emailError.stack)
      }
      // 이메일 전송 실패해도 Notion 저장은 성공했을 수 있으므로 에러를 throw하지 않음
    }

    // Notion 저장과 이메일 전송 중 하나라도 성공했다면 성공으로 처리
    console.log('[DEBUG][ask] 7. 최종 결과 확인...')
    console.log('[DEBUG][ask] 7-1. notionSaved:', notionSaved)
    console.log('[DEBUG][ask] 7-2. emailSent:', emailSent)
    
    if (notionSaved || emailSent) {
      console.log('[DEBUG][ask] 7-3. 성공 응답 반환')
      return {
        success: true,
        message: '문의가 성공적으로 등록되었습니다.',
        notionSaved,
        emailSent,
      }
    } else {
      // 둘 다 실패한 경우에만 에러
      console.error('[DEBUG][ask] 7-4. Notion 저장과 이메일 전송 모두 실패!')
      throw new Error('Notion 저장과 이메일 전송 모두 실패했습니다.')
    }
  } catch (error) {
    console.error('[DEBUG][ask] ========== 문의 등록 API 에러 발생 ==========')
    console.error('[DEBUG][ask] 에러 타입:', error?.constructor?.name || typeof error)
    console.error('[DEBUG][ask] 에러 메시지:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error('[DEBUG][ask] 에러 스택:', error.stack)
    }
    throw createError({
      statusCode: 500,
      message: '문의 등록 중 오류가 발생하였습니다. 오류가 지속될 경우 담당자에게 문의해주세요.',
    })
  }
})
