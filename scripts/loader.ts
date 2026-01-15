import { type NotionData, type NotionListResponse } from '~/composables/notion'
import { useDeepMerge } from '../utils/core'
import { createNotionClient, getNotionMarkdownContent, getImageUrlInPage, getDataFilePath, getPageDataFilePath, formatNotionId } from './utils'
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'pathe'
import consola from 'consola'
import {
  type PageObjectResponse,
  type PartialPageObjectResponse,
  type PartialDatabaseObjectResponse,
  type DatabaseObjectResponse,
  type QueryDatabaseParameters,
} from '@notionhq/client/build/src/api-endpoints'

export type NotionPageOrDatabaseResponse = PageObjectResponse | PartialPageObjectResponse | PartialDatabaseObjectResponse | DatabaseObjectResponse

export interface NotionDataLoaderOptions {
  /**
   * 로드 유형
   */
  id: 'portfolio' | 'notice' | 'news' | 'pds' | 'education' | 'product'

  /**
   * 목록에서 이미지 정보 포함 다운로드 여부
   * @default false
   */
  hasImageInList?: boolean

  /**
   * 하위 페이지 정보 포함 여부
   * @default false
   */
  appendChildPageInfo?: boolean

  /**
   * 데이터베이스 쿼리 커스토마이징 funciton
   * @param req
   * @returns
   */
  customizeDatabaseQuery: (req: QueryDatabaseParameters) => Partial<QueryDatabaseParameters>

  /**
   * 데이터베이스 응답 값 커스토마이징 function
   * @param res
   * @returns
   */
  customizeDatabaseResponse?: (res: DatabaseObjectResponse) => NotionData | Promise<NotionData>

  /**
   * 페이지 응답 값 커스토마이징 function
   * @param res
   * @returns
   */
  customizePageResponse?: (res: PageObjectResponse) => NotionData | Promise<NotionData>
}

export class NotionDataLoader {
  private options: Partial<NotionDataLoaderOptions>

  constructor(options: NotionDataLoaderOptions) {
    this.options = useDeepMerge({ hasImageInList: false, appendChildPageInfo: false }, options)
  }

  private createDirectories(filePath: string) {
    const targetDir = dirname(filePath)
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true })
    }
  }

  /**
   * 데이터페이스를 로드한다.
   * @param databaseId 데이터베이스 아이디
   * @param loadSubPages 하위 페이지 생성 여부
   * @returns
   */
  async loadDatabase(databaseId: string, loadSubPages = true) {
    consola.info(`load ${this.options.id} database`)
    
    if (!databaseId) {
      throw new Error(`${this.options.id} database ID가 설정되지 않았습니다.`)
    }

    try {
      // 데이터베이스 ID를 하이픈 형식으로 변환
      const formattedDatabaseId = formatNotionId(databaseId)
      consola.info(`Database ID: ${formattedDatabaseId}`)
      
      const notion = createNotionClient()
      const queryOption = <QueryDatabaseParameters>this.options.customizeDatabaseQuery({
        database_id: formattedDatabaseId,
        page_size: 100,
      })
      const result = await notion.databases.query(queryOption)

      const dataFilePath = getDataFilePath(this.options.id)
      this.createDirectories(dataFilePath)

      let oldData: { list: NotionData[] } = null
      if (existsSync(dataFilePath)) {
        oldData = JSON.parse(
          readFileSync(dataFilePath, {
            encoding: 'utf-8',
          }),
        )
      }

      function requireUpdatePage(id: string, lastUpdatedTime: string) {
        if (!oldData) {
          return true
        }

        const pageData = oldData.list.find(row => row.id === id)

        if (!pageData) {
          return pageData
        }

        return lastUpdatedTime !== pageData.lastUpdateDate
      }

      const list: NotionData[] = []
      if (result.results) {
        for (const row of result.results) {
          let listData: NotionData = {}
          if (this.options.customizeDatabaseResponse) {
            listData = (await this.options.customizeDatabaseResponse(<DatabaseObjectResponse>row)) || {}
          }

          listData = useDeepMerge({}, listData, {
            id: row.id as string,
            imgUrl: !this.options.hasImageInList
              ? null
              : requireUpdatePage(row.id, row['last_edited_time'])
              ? await getImageUrlInPage(row.id)
              : oldData.list.find(r => r.id === row.id)?.imgUrl,
            lastUpdateDate: row['last_edited_time'],
          })

          list.push(listData)
        }
      }

      const r = {
        nextCursor: result['next_cursor'],
        list,
      } as NotionListResponse<NotionData>

      writeFileSync(dataFilePath, JSON.stringify(r, null, 2))
      consola.info(`finished ${this.options.id} database`)

      for (const item of list) {
        await this.loadPage(item.id)
      }
    } catch (e) {
      console.error(e)
      return {
        list: [],
      }
    }
  }

  /**
   * 페이지 정보 로드
   * @param id 아이디
   */
  async loadPage(id: string) {
    if (!id) {
      throw new Error('id is empty')
    }

    consola.info(`load ${this.options.id} page data : ` + id)

    const dataFilePath = getPageDataFilePath(this.options.id, id)
    this.createDirectories(dataFilePath)

    let oldData: NotionData = null
    if (existsSync(dataFilePath)) {
      oldData = JSON.parse(readFileSync(dataFilePath, { encoding: 'utf-8' }))
    }

    const notion = createNotionClient()
    const pageInfo = await notion.pages.retrieve({
      page_id: id as string,
    })

    let data: NotionData = {}
    if (this.options.customizePageResponse) {
      data = (await this.options.customizePageResponse(<PageObjectResponse>pageInfo)) || {}
    }

    data = useDeepMerge({}, data, {
      id: pageInfo.id as string,
      title: pageInfo['properties']?.title?.title[0]?.text?.content,
      content: oldData && oldData.lastUpdateDate === pageInfo['last_edited_time'] ? oldData.content : await getNotionMarkdownContent(id),
      lastUpdateDate: pageInfo['last_edited_time'],
      imgUrl: '',
    })

    // check link url
    if (data.content) {
      const content = data.content.trim()
      const contentLines = content.split('\n')
      if (content.startsWith('[') && contentLines.length === 1) {
        const matches = content.match('\\((.*?)\\)')
        if (matches.length > 0) {
          data.linkUrl = matches[1]
        }
      }
    }

    writeFileSync(dataFilePath, JSON.stringify(data, null, 2))
    consola.info(`finished ${this.options.id} page data : ` + id)

    return data
  }

  /**
   * 페이지 계층 정보 로드
   * @param id 아이디
   */
  async loadPageHierarchy(id: string, depth: number = 0) {
    if (!id) {
      throw new Error('id is empty')
    }

    consola.info(`load ${this.options.id} page hierarchy data : ` + id)

    const notion = createNotionClient()
    const pageInfo = await notion.pages.retrieve({
      page_id: id as string,
    })

    const page: NotionData = {
      id: pageInfo.id,
      title: pageInfo['properties']?.title?.title[0]?.text?.content,
      lastUpdateDate: pageInfo['last_edited_time'],
      children: [],
    }

    const childrenBlock = await notion.blocks.children.list({
      block_id: pageInfo.id,
    })
    const childPages = childrenBlock.results.filter(block => block['type'] === 'child_page')
    for (const childPage of childPages) {
      page.children.push(await this.loadPageHierarchy(childPage.id, depth + 1))
    }

    // 하위 페이지가 없을 경우, 페이지 컨텐츠를 조회한다.
    if (!page.children || page.children.length < 1) {
      const pageData = await this.loadPage(page.id)
      page.linkUrl = pageData.linkUrl
    }

    if (depth === 0) {
      const dataFilePath = getDataFilePath(this.options.id)
      this.createDirectories(dataFilePath)
      writeFileSync(dataFilePath, JSON.stringify(page, null, 2))
    }

    return page
  }
}
