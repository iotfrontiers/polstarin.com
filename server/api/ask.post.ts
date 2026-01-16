import { NotionAskReqeust } from '~/composables/notion'
import { createNotionClient } from '~/server/utils/notion'
import { sendEmail } from '~/server/utils/email'

/**
 * 기술/견적 문의
 */
export default defineEventHandler(async event => {
  try {
    const { notion: notionConfig } = useRuntimeConfig()
    const notion = createNotionClient()
    const body = (await readBody(event)) as NotionAskReqeust

    if (!body || !body.title || !body.author || !body.content || !body.email || !/.+@.+\..+/.test(body.email)) {
      throw createError({
        statusCode: 400,
        message: '유효하지 않은 요청입니다.',
      })
    }

    // Notion에 저장 (에러가 발생해도 이메일은 전송하도록 try-catch 분리)
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
      
      notionSaved = true
      console.log('Notion 저장 성공:', pageResponse.id)
    } catch (notionError) {
      console.error('Notion 저장 오류:', notionError)
      console.error('Notion 저장 오류 상세:', notionError instanceof Error ? notionError.message : String(notionError))
      if (notionError instanceof Error && notionError.stack) {
        console.error('Notion 저장 오류 스택:', notionError.stack)
      }
      // Notion 저장 실패해도 이메일은 전송하도록 계속 진행
    }

    // 이메일 전송 (에러가 발생해도 Notion 저장은 성공했을 수 있으므로 try-catch 분리)
    let emailSent = false
    try {
      let mailContent = `<p>- 작성자: ${body.author || ''}</p>
      <p>- 작성자 이메일: ${body.email || ''}</p>
      <p>- 작성자 전화번호: ${body.contact || '없음'}</p>
      <p></p>
      <p>${body.content || ''}</p>
      `

      await sendEmail('프론티어 기술/견적문의 : ' + body.title, mailContent)
      emailSent = true
      console.log('이메일 전송 성공')
    } catch (emailError) {
      console.error('이메일 전송 오류:', emailError)
      console.error('이메일 전송 오류 상세:', emailError instanceof Error ? emailError.message : String(emailError))
      if (emailError instanceof Error && emailError.stack) {
        console.error('이메일 전송 오류 스택:', emailError.stack)
      }
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
    console.error('문의 등록 오류:', error)
    console.error('에러 상세:', error instanceof Error ? error.message : String(error))
    console.error('에러 스택:', error instanceof Error ? error.stack : '')
    throw createError({
      statusCode: 500,
      message: '문의 등록 중 오류가 발생하였습니다. 오류가 지속될 경우 담당자에게 문의해주세요.',
    })
  }
})
