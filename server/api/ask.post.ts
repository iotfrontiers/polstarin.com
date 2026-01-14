import { NotionAskReqeust } from '~/composables/notion'

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
    try {
      await notion.pages.create({
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
            rich_text: [
              {
                text: {
                  content: body.contact || '',
                },
              },
            ],
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
    } catch (notionError) {
      console.error('Notion 저장 오류:', notionError)
      // Notion 저장 실패해도 이메일은 전송하도록 계속 진행
    }

    // 이메일 전송
    let mailContent = `<p>- 작성자: ${body.author || ''}</p>
    <p>- 작성자 이메일: ${body.email || ''}</p>
    <p>- 작성자 전화번호: ${body.contact || ''}</p>
    <p></p>
    <p>${body.content || ''}</p>
    `

    await sendEmail('프론티어 기술/견적문의 : ' + body.title, mailContent)
  } catch (error) {
    console.error('문의 등록 오류:', error)
    throw createError({
      statusCode: 500,
      message: '문의 등록 중 오류가 발생하였습니다. 오류가 지속될 경우 담당자에게 문의해주세요.',
    })
  }
})
