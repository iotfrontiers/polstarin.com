import { H3Event } from 'h3'
import { Client } from '@notionhq/client'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { dirname, resolve, extname, join } from 'pathe'
import { existsSync, mkdirSync, createWriteStream } from 'node:fs'
import { NotionToMarkdown } from 'notion-to-md'
import { NotionData, NotionListResponse, NotionPageRequest } from '~/composables/notion'
import https from 'https'
import { decryptString } from './crypt'

export const createNotionClient = () => {
  const { notion } = useRuntimeConfig()
  
  if (!notion.apiSecret) {
    console.error('⚠️ NOTION_API_SECRET 환경 변수가 설정되지 않았습니다!')
    throw new Error('NOTION_API_SECRET 환경 변수가 설정되지 않았습니다.')
  }
  
  let decryptedSecret: string
  try {
    decryptedSecret = decryptString(notion.apiSecret)
    
    if (!decryptedSecret || decryptedSecret.trim() === '') {
      console.error('⚠️ 복호화된 값이 비어있습니다!')
      throw new Error('복호화된 NOTION_API_SECRET이 비어있습니다.')
    }
  } catch (decryptError) {
    console.error('복호화 오류:', decryptError instanceof Error ? decryptError.message : String(decryptError))
    throw decryptError
  }
  
  const client = new Client({
    auth: decryptedSecret,
  })
  return client
}

export const getNotionMarkdownContent = cachedFunction(
  async (id: string, downloadResource: boolean = true) => {
    const notion = createNotionClient()
    const n2m = new NotionToMarkdown({ notionClient: notion })
    const blocks = await n2m.pageToMarkdown(id)

    if (downloadResource) {
      for (const block of blocks) {
        if (block.type === 'image') {
          if (block.parent) {
            const dataArr = block.parent.split('(')

            if (dataArr[1].includes('amazonaws.com')) {
              // const imgPath = await saveFileFromImageUrl(id, dataArr[1].substring(0, dataArr[1].length - 1))
              const cloudinaryFileUrl = await uploadCloudinaryImage(dataArr[1].substring(0, dataArr[1].length - 1))
              if (cloudinaryFileUrl) {
                block.parent = dataArr[0] + `(${cloudinaryFileUrl})`
              }
            }
          }
        }

        if (block.type === 'file') {
          if (block.parent) {
            const dataArr = block.parent.split('(')

            if (dataArr[1].includes('amazonaws.com')) {
              // const filePath = await saveFileFromImageUrl(id, dataArr[1].substring(0, dataArr[1].length - 1))
              const cloudinaryFileUrl = await uploadCloudinaryImage(dataArr[1].substring(0, dataArr[1].length - 1))

              if (cloudinaryFileUrl) {
                block.parent = dataArr[0] + `(${cloudinaryFileUrl})`
              }
            }
          }
        }
      }
    }

    return n2m.toMarkdownString(blocks)?.parent || ''
  },
  {
    maxAge: 3600,
    name: 'notion-markdown-content',
    getKey: pageId => pageId,
  },
)

export const createBoardListApi = async (event: any, databaseId: string) => {
  try {
    const body: NotionPageRequest = (await readBody(event)) || {}
    const notion = createNotionClient()
    const result = await notion.databases.query({
      database_id: databaseId,
      page_size: body.pageSize || 100,
      start_cursor: body.startCursor || undefined,
      filter: {
        property: '게시여부',
        checkbox: {
          equals: true,
        },
      },
      sorts: [
        {
          property: '작성일',
          direction: 'descending',
        },
        {
          timestamp: 'created_time',
          direction: 'descending',
        },
      ],
    })

    const noticeList: NotionData[] = []
    result.results.forEach((row: any) => {
      noticeList.push({
        id: row.id as string,
        title: row?.properties?.['제목']?.title[0]?.['plain_text'] as string,
        author: row?.properties?.['작성자']?.['rich_text'][0]?.['plain_text'] as string,
        viewCnt: row?.properties?.['조회수']?.number as number,
        date: row?.properties?.['작성일']?.date?.start as string,
      })
    })

    return {
      nextCursor: result['next_cursor'],
      list: noticeList,
    } as NotionListResponse<NotionData>
  } catch (e) {
    console.error(e)
    return {
      list: [],
    }
  }
}

export const createBoardDetailApi = async (event: H3Event) => {
  try {
    const query = getQuery(event)
    const id: string = query['id'] as string
    const updateView: boolean = query['update'] === 'true'

    if (!id) {
      throw new Error('id is empty')
    }

    const notion = createNotionClient()
    const pageInfo = await notion.pages.retrieve({
      page_id: id as string,
    })

    if (updateView) {
      // @ts-ignore
      const viewCnt = pageInfo?.properties?.['조회수']?.number || 0

      notion.pages.update({
        page_id: id,
        properties: {
          조회수: {
            number: viewCnt + 1,
          },
        },
      })
    }

    // @ts-ignore
    if (pageInfo?.properties?.['게시여부']?.checkbox !== true) {
      throw new Error('Not Found Page')
    }

    // if (!existsSync(cacheDir)) {
    //   mkdirSync(cacheDir, { recursive: true })
    // }

    // @ts-ignore
    // const fileName = id + pageInfo['last_edited_time'].replace(/:/gi, '')
    // const cacheFilePath = `${cacheDir}/${fileName}`

    // if (existsSync(cacheFilePath)) {
    //   console.info('return cached result', cacheFilePath)
    //   return JSON.parse(readFileSync(cacheFilePath, { encoding: 'utf-8' })) as NotionData
    // }

    const data: NotionData = {
      id: pageInfo.id as string,
      // @ts-ignore
      title: pageInfo?.properties?.['제목']?.title[0]?.['plain_text'] as string,
      // @ts-ignore
      author: pageInfo?.properties?.['작성자']?.['rich_text'][0]?.['plain_text'] as string,
      // @ts-ignore
      viewCnt: pageInfo?.properties?.['조회수']?.number as number,
      // @ts-ignore
      date: pageInfo?.properties?.['작성일']?.date?.start as string,

      content: await getNotionMarkdownContent(id),

      imgUrl: '',
    }

    // if (!existsSync(cacheFilePath)) {
    //   writeFile(cacheFilePath, JSON.stringify(data), { encoding: 'utf-8' }, () => {})
    // }

    return data
  } catch (e) {
    console.error(e)
    return null
  }
}

/**
 * 이미지 URL을 조회한다.
 */
export const getImageUrlInPage = cachedFunction(
  async (pageId: string, saveAsLocal: boolean = true) => {
    try {
      const notion = createNotionClient()
      const blockResult = await notion.blocks.children.list({
        block_id: pageId,
      })

      if (blockResult.results) {
        for (const block of blockResult.results) {
          if (block['type'] === 'image' && block['image']) {
            let fileUrl = null
            if (saveAsLocal && block['image']?.file?.url) {
              fileUrl = block['image']?.file?.url
              // const localFileUrl = await saveFileFromImageUrl('portfolio', fileUrl)
              const cloudinaryFileUrl = await uploadCloudinaryImage(fileUrl)
              if (cloudinaryFileUrl) {
                fileUrl = cloudinaryFileUrl
              }
            }

            return fileUrl ? fileUrl : block['image']?.external?.url
          }
        }
      }
    } catch (e) {
      console.error(e)
      return null
    }
  },
  {
    maxAge: 600,
    name: 'notion-page-image-url',
    getKey: pageId => pageId,
  },
)

// export const saveFileFromImageUrl = async (id: string, url: string) => {
//   try {
//     if (!url.includes('amazonaws.com')) {
//       return null
//     }

//     const targetDir = resolve(getNotionResourcePath(), `./${id}`)
//     if (!existsSync(targetDir)) {
//       mkdirSync(targetDir, { recursive: true })
//     }

//     const resourceUrl = new URL(url)
//     const fileName =
//       createHash('md5')
//         .update(id + resourceUrl.origin + resourceUrl.pathname)
//         .digest('hex') + extname(resourceUrl.pathname)
//     const filePath = join(targetDir, fileName)

//     if (!existsSync(filePath)) {
//       await downloadToFile(filePath, url)
//     }

//     return `/notion-resources/${id}/${fileName}`
//   } catch (e) {
//     console.error(e)
//   }

//   return null
// }

// export const downloadToFile = (filePath: string, url: string) => {
//   return new Promise<void>((resolve, reject) => {
//     https.get(url, res => {
//       const fs = createWriteStream(filePath)
//       res.pipe(fs)
//       fs.on('finish', () => {
//         fs.close()
//         resolve()
//       })
//       fs.on('error', err => reject(err))
//     })
//   })
//}

// export const getNotionResourcePath = () => {
//   if (process.dev) {
//     return resolve(dirname(fileURLToPath(import.meta.url)), '../notion-resources')
//   } else {
//     try {
//       return process.cwd()
//     } catch (e) {
//       return process.env.NOTION_RESOURCE_PATH
//     }
//   }
// }
