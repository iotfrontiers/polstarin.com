import { NotionAskReqeust } from '~/composables/notion'
import { createNotionClient } from '~/server/utils/notion'
import { sendEmail } from '~/server/utils/email'

/**
 * 기술/견적 문의
 */
export default defineEventHandler(async event => {
  // 즉시 로그 출력 (함수 시작 확인) - 가장 먼저 실행
  console.log('[DEBUG][ask] ========== 문의 등록 API 시작 ==========')
  console.log('[DEBUG][ask] 시간:', new Date().toISOString())
  console.log('[DEBUG][ask] 요청 URL:', event.node.req.url)
  console.log('[DEBUG][ask] 요청 메서드:', event.node.req.method)
  
  let errorDetails: any = { step: 'init' }
  
  try {
    console.log('[DEBUG][ask] 1. 환경 변수 로드 시작...')
    errorDetails = { step: 'load_config' }
    const { notion: notionConfig, email: emailConfig } = useRuntimeConfig()
    console.log('[DEBUG][ask] 1-1. notionConfig.askDatabaseId 존재 여부:', !!notionConfig.askDatabaseId)
    console.log('[DEBUG][ask] 1-2. notionConfig.askDatabaseId 값:', notionConfig.askDatabaseId ? `${notionConfig.askDatabaseId.substring(0, 10)}...` : '없음')
    console.log('[DEBUG][ask] 1-3. notionConfig.apiSecret 존재 여부:', !!notionConfig.apiSecret)
    console.log('[DEBUG][ask] 1-4. notionConfig.apiSecret 길이:', notionConfig.apiSecret?.length || 0)
    console.log('[DEBUG][ask] 1-5. emailConfig.googleSmtpUser 존재 여부:', !!emailConfig.googleSmtpUser)
    console.log('[DEBUG][ask] 1-6. emailConfig.googleSmtpUser 길이:', emailConfig.googleSmtpUser?.length || 0)
    console.log('[DEBUG][ask] 1-7. emailConfig.googleSmtpPassword 존재 여부:', !!emailConfig.googleSmtpPassword)
    console.log('[DEBUG][ask] 1-8. emailConfig.googleSmtpPassword 길이:', emailConfig.googleSmtpPassword?.length || 0)
    
    // 환경 변수 검증
    if (!notionConfig.askDatabaseId) {
      console.error('[DEBUG][ask] 1-9. ⚠️ NOTION_ASK_DATABASE_ID 환경 변수가 설정되지 않았습니다!')
    }
    if (!notionConfig.apiSecret) {
      console.error('[DEBUG][ask] 1-10. ⚠️ NOTION_API_SECRET 환경 변수가 설정되지 않았습니다!')
    }
    if (!emailConfig.googleSmtpUser) {
      console.error('[DEBUG][ask] 1-11. ⚠️ GOOGLE_SMTP_USER 환경 변수가 설정되지 않았습니다!')
    }
    if (!emailConfig.googleSmtpPassword) {
      console.error('[DEBUG][ask] 1-12. ⚠️ GOOGLE_SMTP_PASSWORD 환경 변수가 설정되지 않았습니다!')
    }
    
    console.log('[DEBUG][ask] 2. Notion 클라이언트 생성 시작...')
    errorDetails = { step: 'create_notion_client' }
    const notion = createNotionClient()
    console.log('[DEBUG][ask] 2-1. Notion 클라이언트 생성 완료')
    
    console.log('[DEBUG][ask] 3. 요청 본문 읽기 시작...')
    errorDetails = { step: 'read_body' }
    const body = (await readBody(event)) as NotionAskReqeust
    console.log('[DEBUG][ask] 3-1. 요청 본문:', JSON.stringify(body, null, 2))

    console.log('[DEBUG][ask] 4. 요청 본문 검증 시작...')
    errorDetails = { step: 'validate_body' }
    console.log('[DEBUG][ask] 4-1. body 존재:', !!body)
    console.log('[DEBUG][ask] 4-2. body.title:', body?.title || '없음')
    console.log('[DEBUG][ask] 4-3. body.author:', body?.author || '없음')
    console.log('[DEBUG][ask] 4-4. body.content:', body?.content ? `${body.content.substring(0, 50)}...` : '없음')
    console.log('[DEBUG][ask] 4-5. body.email:', body?.email || '없음')
    console.log('[DEBUG][ask] 4-6. 이메일 형식 검증:', body?.email ? /.+@.+\..+/.test(body.email) : false)
    
    if (!body || !body.title || !body.author || !body.content || !body.email || !/.+@.+\..+/.test(body.email)) {
      console.error('[DEBUG][ask] 4-7. 요청 본문 검증 실패')
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
    console.log('[DEBUG][ask] 4-8. 요청 본문 검증 완료')

    // Notion에 저장 (에러가 발생해도 이메일은 전송하도록 try-catch 분리)
    console.log('[DEBUG][ask] 5. Notion 저장 시작...')
    errorDetails = { step: 'notion_save' }
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
      
      if (!notionConfig.askDatabaseId) {
        console.error('[DEBUG][ask] 5-4-1. ⚠️ database_id가 없습니다! NOTION_ASK_DATABASE_ID 환경 변수를 확인하세요.')
        throw new Error('NOTION_ASK_DATABASE_ID 환경 변수가 설정되지 않았습니다.')
      }
      
      // 데이터베이스 정보 조회 (속성 확인)
      console.log('[DEBUG][ask] 5-4-2. 데이터베이스 정보 조회 시작...')
      try {
        const dbInfo = await notion.databases.retrieve({
          database_id: notionConfig.askDatabaseId,
        })
        console.log('[DEBUG][ask] 5-4-3. 데이터베이스 조회 성공!')
        console.log('[DEBUG][ask] 5-4-4. 데이터베이스 제목:', dbInfo.title?.[0]?.plain_text || '없음')
        console.log('[DEBUG][ask] 5-4-5. 데이터베이스 속성 목록:', Object.keys(dbInfo.properties || {}))
        console.log('[DEBUG][ask] 5-4-6. 데이터베이스 속성 상세:')
        Object.entries(dbInfo.properties || {}).forEach(([key, value]: [string, any]) => {
          console.log(`[DEBUG][ask] 5-4-7.   - "${key}": 타입=${value.type}`)
        })
      } catch (dbInfoError) {
        console.error('[DEBUG][ask] 5-4-8. 데이터베이스 정보 조회 실패!')
        console.error('[DEBUG][ask] 5-4-9. 조회 오류 타입:', dbInfoError?.constructor?.name || typeof dbInfoError)
        console.error('[DEBUG][ask] 5-4-10. 조회 오류 메시지:', dbInfoError instanceof Error ? dbInfoError.message : String(dbInfoError))
        if (dbInfoError && typeof dbInfoError === 'object' && 'code' in dbInfoError) {
          console.error('[DEBUG][ask] 5-4-11. 조회 오류 코드:', (dbInfoError as any).code)
        }
      }
      
      // API 요청 본문 구성
      const requestBody = {
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
      }
      
      console.log('[DEBUG][ask] 5-4-12. API 요청 본문 구성 완료')
      console.log('[DEBUG][ask] 5-4-13. 요청 본문 (JSON):', JSON.stringify(requestBody, null, 2))
      console.log('[DEBUG][ask] 5-4-14. properties 키 목록:', Object.keys(requestBody.properties))
      console.log('[DEBUG][ask] 5-4-15. properties 상세:')
      Object.entries(requestBody.properties).forEach(([key, value]: [string, any]) => {
        console.log(`[DEBUG][ask] 5-4-16.   - "${key}": 타입=${value.type}, 값=`, JSON.stringify(value).substring(0, 100))
      })
      
      console.log('[DEBUG][ask] 5-4-17. Notion API 호출 시작...')
      const pageResponse = await notion.pages.create(requestBody)
      
      console.log('[DEBUG][ask] 5-5. Notion 페이지 생성 요청 완료')
      notionSaved = true
      console.log('[DEBUG][ask] 5-6. Notion 저장 성공, 페이지 ID:', pageResponse.id)
    } catch (notionError) {
      console.error('[DEBUG][ask] 5-7. Notion 저장 오류 발생!')
      console.error('[DEBUG][ask] 5-8. Notion 저장 오류 타입:', notionError?.constructor?.name || typeof notionError)
      console.error('[DEBUG][ask] 5-9. Notion 저장 오류 메시지:', notionError instanceof Error ? notionError.message : String(notionError))
      
      // APIResponseError의 상세 정보 추출
      if (notionError && typeof notionError === 'object') {
        if ('code' in notionError) {
          console.error('[DEBUG][ask] 5-10. Notion API 오류 코드:', (notionError as any).code)
        }
        if ('status' in notionError) {
          console.error('[DEBUG][ask] 5-11. Notion API HTTP 상태:', (notionError as any).status)
        }
        if ('headers' in notionError) {
          console.error('[DEBUG][ask] 5-12. Notion API 응답 헤더:', JSON.stringify((notionError as any).headers || {}))
        }
        if ('body' in notionError) {
          console.error('[DEBUG][ask] 5-13. Notion API 응답 본문:', JSON.stringify((notionError as any).body || {}))
        }
        if ('request_id' in notionError) {
          console.error('[DEBUG][ask] 5-14. Notion API 요청 ID:', (notionError as any).request_id)
        }
      }
      
      if (notionError instanceof Error && notionError.stack) {
        console.error('[DEBUG][ask] 5-15. Notion 저장 오류 스택:', notionError.stack)
      }
      
      // 추가 진단: 데이터베이스 접근 가능 여부 확인
      console.log('[DEBUG][ask] 5-16. 추가 진단: 데이터베이스 쿼리 시도...')
      try {
        const testQuery = await notion.databases.query({
          database_id: notionConfig.askDatabaseId,
          page_size: 1,
        })
        console.log('[DEBUG][ask] 5-17. 데이터베이스 쿼리 성공! (접근 가능)')
        console.log('[DEBUG][ask] 5-18. 쿼리 결과 개수:', testQuery.results.length)
      } catch (queryError) {
        console.error('[DEBUG][ask] 5-19. 데이터베이스 쿼리 실패! (접근 불가)')
        console.error('[DEBUG][ask] 5-20. 쿼리 오류 타입:', queryError?.constructor?.name || typeof queryError)
        console.error('[DEBUG][ask] 5-21. 쿼리 오류 메시지:', queryError instanceof Error ? queryError.message : String(queryError))
        if (queryError && typeof queryError === 'object' && 'code' in queryError) {
          console.error('[DEBUG][ask] 5-22. 쿼리 오류 코드:', (queryError as any).code)
        }
      }
      
      // Notion 저장 실패해도 이메일은 전송하도록 계속 진행
    }

    // 이메일 전송 (에러가 발생해도 Notion 저장은 성공했을 수 있으므로 try-catch 분리)
    console.log('[DEBUG][ask] 6. 이메일 전송 시작...')
    errorDetails = { step: 'email_send' }
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
    if (errorDetails) {
      console.error('[DEBUG][ask] 에러 상세 정보:', JSON.stringify(errorDetails, null, 2))
    }
    
    // 에러 응답에 디버깅 정보 포함 (개발 환경에서만)
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
