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
    
    // 데이터베이스 스키마 확인하여 필드 존재 여부 확인
    let hasPublishedField = false
    let hasDateField = false
    try {
      const dbInfo = await notion.databases.retrieve({ database_id: databaseId })
      // @ts-ignore
      hasPublishedField = !!dbInfo?.properties?.['게시여부']
      // @ts-ignore
      hasDateField = !!dbInfo?.properties?.['작성일']
      console.log('[DEBUG] 데이터베이스 필드 확인:', {
        hasPublishedField,
        hasDateField,
        properties: Object.keys(dbInfo?.properties || {}),
      })
    } catch (e) {
      console.warn('데이터베이스 정보 조회 실패:', e)
    }
    
    // 게시여부 필드가 있으면 필터 적용, 없으면 모든 항목 조회
    const filter = hasPublishedField
      ? {
          property: '게시여부',
          checkbox: {
            equals: true,
          },
        }
      : undefined
    
    const sorts: any[] = []
    if (hasDateField) {
      sorts.push({
        property: '작성일',
        direction: 'descending',
      })
    }
    sorts.push({
      timestamp: 'created_time',
      direction: 'descending',
    })
    
    const queryParams: any = {
      database_id: databaseId,
      page_size: body.pageSize || 100,
      start_cursor: body.startCursor || undefined,
      sorts,
    }
    
    if (filter) {
      queryParams.filter = filter
    }
    
    console.log('[DEBUG] 노션 데이터베이스 쿼리:', {
      databaseId,
      hasFilter: !!filter,
      pageSize: queryParams.page_size,
    })
    
    const result = await notion.databases.query(queryParams)
    
    console.log('[DEBUG] 노션 쿼리 결과:', {
      resultCount: result.results.length,
      hasMore: !!result.next_cursor,
    })

    const noticeList: NotionData[] = []
    result.results.forEach((row: any) => {
      // 작성일 필드가 있으면 사용하고, 없으면 created_time 사용
      const dateValue = row?.properties?.['작성일']?.date?.start || row?.created_time
      const title = row?.properties?.['제목']?.title?.[0]?.['plain_text'] || ''
      const author = row?.properties?.['작성자']?.['rich_text']?.[0]?.['plain_text'] || ''
      
      console.log('[DEBUG] 게시글 데이터:', {
        id: row.id,
        title,
        author,
        dateValue,
      })
      
      noticeList.push({
        id: row.id as string,
        title,
        author,
        viewCnt: row?.properties?.['조회수']?.number || 0,
        date: dateValue,
      })
    })
    
    console.log('[DEBUG] 최종 게시글 목록:', {
      count: noticeList.length,
      titles: noticeList.map(item => item.title),
    })

    return {
      nextCursor: result['next_cursor'],
      list: noticeList,
    } as NotionListResponse<NotionData>
  } catch (e) {
    console.error('createBoardListApi 오류:', e)
    console.error('오류 상세:', e instanceof Error ? e.message : String(e))
    console.error('스택:', e instanceof Error ? e.stack : undefined)
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
      const viewCntField = pageInfo?.properties?.['조회수']
      // 조회수 필드가 있을 때만 업데이트
      if (viewCntField) {
        const viewCnt = viewCntField?.number || 0
        try {
          await notion.pages.update({
            page_id: id,
            properties: {
              조회수: {
                number: viewCnt + 1,
              },
            },
          })
        } catch (e) {
          console.warn('조회수 업데이트 실패:', e)
        }
      }
    }

    // 게시여부 필드가 있고 false인 경우에만 에러 발생
    // @ts-ignore
    const publishedField = pageInfo?.properties?.['게시여부']
    if (publishedField && publishedField?.checkbox !== true) {
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

    // 작성일 필드가 있으면 사용하고, 없으면 created_time 사용
    // @ts-ignore
    const dateValue = pageInfo?.properties?.['작성일']?.date?.start || pageInfo?.created_time
    
    // 이메일과 연락처 가져오기
    // @ts-ignore
    const email = pageInfo?.properties?.['이메일']?.email || ''
    // @ts-ignore
    const contact = pageInfo?.properties?.['연락처']?.['rich_text']?.[0]?.['plain_text'] || ''
    
    const data: NotionData = {
      id: pageInfo.id as string,
      // @ts-ignore
      title: pageInfo?.properties?.['제목']?.title[0]?.['plain_text'] as string,
      // @ts-ignore
      author: pageInfo?.properties?.['작성자']?.['rich_text'][0]?.['plain_text'] as string,
      // @ts-ignore
      viewCnt: pageInfo?.properties?.['조회수']?.number || 0,
      date: dateValue,
      email,
      contact,

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
