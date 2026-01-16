import { NotionAskReqeust } from '~/composables/notion'
import { createNotionClient } from '~/server/utils/notion'
import { sendEmail } from '~/server/utils/email'

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
    
    errorDetails = { step: 'create_notion_client' }
    const notion = createNotionClient()
    
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

    // Notion에 저장 (에러가 발생해도 이메일은 전송하도록 try-catch 분리)
    errorDetails = { step: 'notion_save' }
    let notionSaved = false
    try {
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
      
      if (!notionConfig.askDatabaseId) {
        throw new Error('NOTION_ASK_DATABASE_ID 환경 변수가 설정되지 않았습니다.')
      }
      
      // 데이터베이스 정보 조회 (속성 확인) - 페이지인 경우 자식 데이터베이스 찾기
      let actualDatabaseId = notionConfig.askDatabaseId
      
      try {
        await notion.databases.retrieve({
          database_id: actualDatabaseId,
        })
      } catch (dbInfoError: any) {
        // 페이지인 경우, 자식 데이터베이스 찾기
        if (dbInfoError?.code === 'validation_error' && dbInfoError?.message?.includes('is a page, not a database')) {
          try {
            // 페이지를 가져와서 자식 블록 확인
            await notion.pages.retrieve({ page_id: actualDatabaseId })
            
            // 페이지의 자식 블록 조회
            const blocks = await notion.blocks.children.list({ block_id: actualDatabaseId })
            
            // 데이터베이스 블록 찾기
            const databaseBlock = blocks.results.find((block: any) => block.type === 'child_database')
            
            if (databaseBlock) {
              const blockId = (databaseBlock as any).id
              actualDatabaseId = blockId
              
              // 실제 데이터베이스 ID로 다시 조회
              await notion.databases.retrieve({
                database_id: actualDatabaseId,
              })
            } else {
              throw new Error('페이지 내에 자식 데이터베이스를 찾을 수 없습니다.')
            }
          } catch (childDbError) {
            throw childDbError
          }
        } else {
          // 다른 종류의 에러는 그대로 throw
          throw dbInfoError
        }
      }
      
      // API 요청 본문 구성 (실제 데이터베이스 ID 사용)
      const requestBody = {
        parent: {
          database_id: actualDatabaseId,
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
      
      await notion.pages.create(requestBody)
      notionSaved = true
    } catch (notionError) {
      console.error('Notion 저장 오류:', notionError instanceof Error ? notionError.message : String(notionError))
      // Notion 저장 실패해도 이메일은 전송하도록 계속 진행
    }

    // 이메일 전송 (에러가 발생해도 Notion 저장은 성공했을 수 있으므로 try-catch 분리)
    errorDetails = { step: 'email_send' }
    let emailSent = false
    try {
      let mailContent = `<p>- 작성자: ${body.author || ''}</p>
      <p>- 작성자 이메일: ${body.email || ''}</p>
      <p>- 작성자 전화번호: ${body.contact || '없음'}</p>
      <p></p>
      <p>${body.content || ''}</p>
      `
      const emailSubject = '폴스타인 기술/견적문의 : ' + body.title

      await sendEmail(emailSubject, mailContent)
      emailSent = true
    } catch (emailError) {
      console.error('이메일 전송 오류:', emailError instanceof Error ? emailError.message : String(emailError))
      // 이메일 전송 실패해도 Notion 저장은 성공했을 수 있으므로 에러를 throw하지 않음
    }

    // Notion 저장과 이메일 전송 중 하나라도 성공했다면 성공으로 처리
    if (notionSaved || emailSent) {
      return {
        success: true,
        message: '문의가 성공적으로 등록되었습니다.',
        notionSaved,
        emailSent,
      }
    } else {
      // 둘 다 실패한 경우에만 에러
      throw new Error('Notion 저장과 이메일 전송 모두 실패했습니다.')
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
