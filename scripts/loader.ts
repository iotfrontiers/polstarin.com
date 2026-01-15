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
    consola.info(`[${this.options.id}] 데이터베이스 로드 시작`)
    console.log(`[DEBUG][${this.options.id}] 원본 databaseId:`, databaseId)
    console.log(`[DEBUG][${this.options.id}] databaseId 타입:`, typeof databaseId)
    console.log(`[DEBUG][${this.options.id}] databaseId 길이:`, databaseId ? databaseId.length : 0)
    
    if (!databaseId) {
      const errorMsg = `${this.options.id} database ID가 설정되지 않았습니다.`
      console.error(`[ERROR][${this.options.id}]`, errorMsg)
      throw new Error(errorMsg)
    }

    try {
      // 데이터베이스 ID를 하이픈 형식으로 변환
      console.log(`[DEBUG][${this.options.id}] ID 변환 시작...`)
      const formattedDatabaseId = formatNotionId(databaseId)
      console.log(`[DEBUG][${this.options.id}] 변환된 Database ID:`, formattedDatabaseId)
      consola.info(`[${this.options.id}] Database ID: ${formattedDatabaseId}`)
      
      console.log(`[DEBUG][${this.options.id}] Notion Client 생성 시작...`)
      const notion = createNotionClient()
      console.log(`[DEBUG][${this.options.id}] Notion Client 생성 완료`)
      
      const queryOption = <QueryDatabaseParameters>this.options.customizeDatabaseQuery({
        database_id: formattedDatabaseId,
        page_size: 100,
      })
      console.log(`[DEBUG][${this.options.id}] Query 옵션:`, JSON.stringify({
        database_id: formattedDatabaseId,
        page_size: queryOption.page_size,
        sorts: queryOption.sorts,
      }, null, 2))
      
      console.log(`[DEBUG][${this.options.id}] Notion API 호출 시작...`)
      let result
      try {
        result = await notion.databases.query(queryOption)
        console.log(`[DEBUG][${this.options.id}] Notion API 호출 성공. 결과 개수:`, result.results?.length || 0)
      } catch (error: any) {
        // 페이지인 경우, 페이지의 자식 데이터베이스를 찾아서 사용
        if (error.code === 'validation_error' && error.message?.includes('is a page, not a database')) {
          console.log(`[DEBUG][${this.options.id}] 페이지로 감지됨. 자식 데이터베이스를 찾는 중...`)
          
          try {
            // 페이지를 가져와서 자식 블록 확인
            const page = await notion.pages.retrieve({ page_id: formattedDatabaseId })
            console.log(`[DEBUG][${this.options.id}] 페이지 정보:`, page.id)
            
            // 페이지의 자식 블록 조회
            const blocks = await notion.blocks.children.list({ block_id: formattedDatabaseId })
            console.log(`[DEBUG][${this.options.id}] 자식 블록 개수:`, blocks.results?.length || 0)
            
            // 데이터베이스 블록 찾기
            console.log(`[DEBUG][${this.options.id}] 자식 블록 타입들:`, blocks.results.map((b: any) => b.type))
            
            const databaseBlock = blocks.results.find((block: any) => block.type === 'child_database')
            console.log(`[DEBUG][${this.options.id}] 데이터베이스 블록:`, databaseBlock ? JSON.stringify(databaseBlock, null, 2) : '없음')
            
            if (databaseBlock) {
              // child_database 블록의 구조 확인
              const childDatabase = (databaseBlock as any).child_database
              console.log(`[DEBUG][${this.options.id}] child_database 객체:`, childDatabase ? JSON.stringify(childDatabase, null, 2) : '없음')
              
              const actualDatabaseId = childDatabase?.database_id || childDatabase?.id
              console.log(`[DEBUG][${this.options.id}] 추출된 데이터베이스 ID:`, actualDatabaseId)
              
              if (actualDatabaseId) {
                console.log(`[DEBUG][${this.options.id}] 데이터베이스 발견! ID:`, actualDatabaseId)
              
                // 실제 데이터베이스 ID로 다시 쿼리
                queryOption.database_id = actualDatabaseId as string
                result = await notion.databases.query(queryOption)
                console.log(`[DEBUG][${this.options.id}] 데이터베이스 쿼리 성공. 결과 개수:`, result.results?.length || 0)
              } else {
                console.error(`[ERROR][${this.options.id}] 데이터베이스 ID를 추출할 수 없습니다.`)
                console.error(`[ERROR][${this.options.id}] 블록 구조:`, JSON.stringify(databaseBlock, null, 2))
                throw new Error(`${this.options.id}: 페이지 내에 데이터베이스를 찾았지만 ID를 추출할 수 없습니다. 페이지가 데이터베이스 페이지인지 확인하세요.`)
              }
            } else {
              // 자식 블록이 없거나 데이터베이스 블록이 없는 경우
              console.log(`[DEBUG][${this.options.id}] 모든 자식 블록 정보:`, JSON.stringify(blocks.results, null, 2))
              throw new Error(`${this.options.id}: 페이지 내에 데이터베이스 블록을 찾을 수 없습니다. 페이지가 데이터베이스 페이지인지 확인하세요.`)
            }
          } catch (pageError: any) {
            console.error(`[ERROR][${this.options.id}] 페이지 처리 실패:`, pageError.message)
            throw new Error(`${this.options.id}: 제공된 ID는 페이지입니다. 데이터베이스 ID를 확인하세요. 원본 에러: ${error.message}`)
          }
        } else {
          throw error
        }
      }

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
      consola.info(`[${this.options.id}] 데이터베이스 로드 완료`)
      console.log(`[DEBUG][${this.options.id}] 파일 저장 완료:`, dataFilePath)

      console.log(`[DEBUG][${this.options.id}] 페이지 로드 시작...`)
      for (const item of list) {
        await this.loadPage(item.id)
      }
      console.log(`[DEBUG][${this.options.id}] 모든 페이지 로드 완료`)
    } catch (e) {
      console.error(`[ERROR][${this.options.id}] 데이터베이스 로드 중 오류 발생:`)
      console.error(`[ERROR][${this.options.id}] 오류 타입:`, e?.constructor?.name || typeof e)
      console.error(`[ERROR][${this.options.id}] 오류 메시지:`, e instanceof Error ? e.message : String(e))
      console.error(`[ERROR][${this.options.id}] 오류 스택:`, e instanceof Error ? e.stack : '스택 정보 없음')
      
      if (e && typeof e === 'object' && 'code' in e) {
        console.error(`[ERROR][${this.options.id}] 오류 코드:`, e.code)
      }
      if (e && typeof e === 'object' && 'status' in e) {
        console.error(`[ERROR][${this.options.id}] HTTP 상태:`, e.status)
      }
      if (e && typeof e === 'object' && 'body' in e) {
        console.error(`[ERROR][${this.options.id}] 응답 본문:`, e.body)
      }
      
      consola.error(`[${this.options.id}] 오류 발생:`, e)
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
    console.log(`[DEBUG][${this.options.id}] loadPageHierarchy 시작 - depth: ${depth}`)
    console.log(`[DEBUG][${this.options.id}] 원본 page ID:`, id)
    console.log(`[DEBUG][${this.options.id}] page ID 타입:`, typeof id)
    console.log(`[DEBUG][${this.options.id}] page ID 길이:`, id ? id.length : 0)
    
    if (!id) {
      const errorMsg = 'id is empty'
      console.error(`[ERROR][${this.options.id}]`, errorMsg)
      throw new Error(errorMsg)
    }

    // 페이지 ID도 하이픈 형식으로 변환
    const formattedPageId = formatNotionId(id)
    console.log(`[DEBUG][${this.options.id}] 변환된 page ID:`, formattedPageId)
    
    consola.info(`load ${this.options.id} page hierarchy data : ` + formattedPageId)

    console.log(`[DEBUG][${this.options.id}] Notion Client 생성 시작...`)
    const notion = createNotionClient()
    console.log(`[DEBUG][${this.options.id}] Notion Client 생성 완료`)
    
    console.log(`[DEBUG][${this.options.id}] pages.retrieve 호출 시작...`)
    const pageInfo = await notion.pages.retrieve({
      page_id: formattedPageId as string,
    })
    console.log(`[DEBUG][${this.options.id}] pages.retrieve 호출 성공`)

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
