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
    
    if (!databaseId) {
      const errorMsg = `${this.options.id} database ID가 설정되지 않았습니다.`
      console.error(`[ERROR][${this.options.id}]`, errorMsg)
      throw new Error(errorMsg)
    }

    try {
      // 데이터베이스 ID를 하이픈 형식으로 변환
      const formattedDatabaseId = formatNotionId(databaseId)
      consola.info(`[${this.options.id}] Database ID: ${formattedDatabaseId}`)
      
      const notion = createNotionClient()
      
      const queryOption = <QueryDatabaseParameters>this.options.customizeDatabaseQuery({
        database_id: formattedDatabaseId,
        page_size: 100,
      })
      
      let result
      try {
        result = await notion.databases.query(queryOption)
      } catch (error: any) {
        // 페이지인 경우, 페이지의 자식 데이터베이스를 찾아서 사용
        if (error.code === 'validation_error' && error.message?.includes('is a page, not a database')) {
          try {
            // 페이지를 가져와서 자식 블록 확인
            const page = await notion.pages.retrieve({ page_id: formattedDatabaseId })
            
            // 페이지의 자식 블록 조회
            const blocks = await notion.blocks.children.list({ block_id: formattedDatabaseId })
            
            // 데이터베이스 블록 찾기
            const databaseBlock = blocks.results.find((block: any) => block.type === 'child_database')
            
            if (databaseBlock) {
              // child_database 블록의 구조 확인
              const childDatabase = (databaseBlock as any).child_database
              
              // Notion API에서 child_database 블록의 경우:
              // 1. 블록 자체의 id가 데이터베이스 ID일 수 있음
              // 2. child_database 객체에는 title만 있고 database_id는 없음
              // 3. 블록의 id를 데이터베이스 ID로 사용 시도
              const blockId = (databaseBlock as any).id
              const actualDatabaseId = childDatabase?.database_id || blockId || childDatabase?.id
              
              if (actualDatabaseId) {
                // 실제 데이터베이스 ID로 다시 쿼리
                queryOption.database_id = actualDatabaseId as string
                result = await notion.databases.query(queryOption)
                const resultCount = result?.results ? result.results.length : 0
                consola.info(`[${this.options.id}] 데이터베이스 쿼리 성공 (child_database): ${resultCount}개 항목`)
              } else {
                console.error(`[ERROR][${this.options.id}] 데이터베이스 ID를 추출할 수 없습니다.`)
                console.error(`[ERROR][${this.options.id}] 블록 구조:`, JSON.stringify(databaseBlock, null, 2))
                throw new Error(`${this.options.id}: 페이지 내에 데이터베이스를 찾았지만 ID를 추출할 수 없습니다. 페이지가 데이터베이스 페이지인지 확인하세요.`)
              }
            } else {
              // 자식 블록이 없거나 데이터베이스 블록이 없는 경우
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

      const resultCount = result?.results ? result.results.length : 0
      consola.info(`[${this.options.id}] 데이터베이스 쿼리 성공: ${resultCount}개 항목`)

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

      function requireUpdatePage(id: string, lastUpdatedTime: string, hasImageInList: boolean) {
        if (!oldData) {
          return true
        }

        const pageData = oldData.list.find(row => row.id === id)

        if (!pageData) {
          return true  // 새 항목이므로 업데이트 필요
        }

        // lastUpdateDate가 다르면 업데이트 필요
        if (lastUpdatedTime !== pageData.lastUpdateDate) {
          return true
        }

        // lastUpdateDate가 같아도 imgUrl이 없으면 업데이트 필요
        if (hasImageInList && !pageData.imgUrl) {
          return true
        }

        return false
      }

      const list: NotionData[] = []
      let currentCursor: string | null = null
      let pageNumber = 1
      let hasMore = true

      // 페이징 처리: next_cursor가 있을 때까지 모든 페이지를 가져옴
      while (hasMore) {
        // 첫 번째 페이지가 아닌 경우 다음 페이지 쿼리
        if (currentCursor) {
          queryOption.start_cursor = currentCursor
          try {
            result = await notion.databases.query(queryOption)
            const pageResultCount = result?.results ? result.results.length : 0
            consola.info(`[${this.options.id}] 데이터베이스 쿼리 성공 (페이지 ${pageNumber}): ${pageResultCount}개 항목`)
          } catch (error: any) {
            console.error(`[ERROR][${this.options.id}] 다음 페이지 쿼리 실패:`, error.message)
            break
          }
        }

        if (result.results) {
          for (const row of result.results) {
            let listData: NotionData = {}
            if (this.options.customizeDatabaseResponse) {
              listData = (await this.options.customizeDatabaseResponse(<DatabaseObjectResponse>row)) || {}
            }

            const hasImageInList = this.options.hasImageInList
            const requiresUpdate = requireUpdatePage(row.id, row['last_edited_time'], hasImageInList)
            const itemTitle = listData.title || '제목 없음'
            consola.info(`[${this.options.id}] 항목 처리 중 (페이지 ${pageNumber}): ${row.id} - ${itemTitle} (업데이트 필요: ${requiresUpdate})`)
            const oldImgUrl = oldData?.list.find(r => r.id === row.id)?.imgUrl
            
            let imgUrl = null
            if (hasImageInList) {
              if (requiresUpdate) {
                imgUrl = await getImageUrlInPage(row.id)
              } else {
                imgUrl = oldImgUrl
              }
            }

            listData = useDeepMerge({}, listData, {
              id: row.id as string,
              imgUrl: imgUrl,
              lastUpdateDate: row['last_edited_time'],
            })

            list.push(listData)
          }
        }

        // 다음 커서 확인
        currentCursor = result['next_cursor'] || null
        hasMore = !!currentCursor
        
        if (hasMore) {
          consola.info(`[${this.options.id}] 다음 페이지 존재 (커서: ${currentCursor.substring(0, 20)}...), 계속 로드 중...`)
          pageNumber++
        } else {
          consola.info(`[${this.options.id}] 모든 페이지 로드 완료 (총 ${pageNumber}페이지)`)
        }
      }

      const r = {
        nextCursor: null, // 모든 페이지를 가져왔으므로 null
        list,
      } as NotionListResponse<NotionData>

      writeFileSync(dataFilePath, JSON.stringify(r, null, 2))
      consola.info(`[${this.options.id}] 데이터베이스 로드 완료: 총 ${list.length}개 항목 저장`)
      if (r.nextCursor) {
        consola.info(`[${this.options.id}] 다음 커서 존재: ${r.nextCursor}`)
      } else {
        consola.info(`[${this.options.id}] 다음 커서 없음 (모든 데이터 로드 완료)`)
      }

      consola.info(`[${this.options.id}] ${list.length}개 페이지 컨텐츠 로드 시작...`)
      for (const item of list) {
        await this.loadPage(item.id)
      }
      consola.info(`[${this.options.id}] 모든 페이지 컨텐츠 로드 완료`)
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

    const shouldUpdate = !oldData || oldData.lastUpdateDate !== pageInfo['last_edited_time']
    consola.info(`[${this.options.id}][loadPage] 페이지 ID: ${id}, 업데이트 필요: ${shouldUpdate}`)
    
    // 환경 변수로 강제 업데이트할 페이지 ID 지정 가능 (쉼표로 구분)
    const forceUpdatePageIds = process.env.FORCE_UPDATE_PAGE_IDS?.split(',').map(id => id.trim()) || []
    const forceUpdateForTesting = forceUpdatePageIds.includes(id)
    const willUpdate = shouldUpdate || forceUpdateForTesting
    
    if (forceUpdateForTesting && !shouldUpdate) {
      consola.info(`[${this.options.id}][loadPage] 테스트를 위해 강제 업데이트: ${id}`)
    }
    
    const content = willUpdate ? await getNotionMarkdownContent(id) : oldData.content
    const contentLength = typeof content === 'string' ? content.length : 0
    consola.info(`[${this.options.id}][loadPage] 컨텐츠 길이: ${contentLength} 문자`)

    data = useDeepMerge({}, data, {
      id: pageInfo.id as string,
      title: pageInfo['properties']?.title?.title[0]?.text?.content,
      content: content,
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
      const errorMsg = 'id is empty'
      console.error(`[ERROR][${this.options.id}]`, errorMsg)
      throw new Error(errorMsg)
    }

    // 페이지 ID도 하이픈 형식으로 변환
    const formattedPageId = formatNotionId(id)
    
    consola.info(`load ${this.options.id} page hierarchy data : ` + formattedPageId)

    const notion = createNotionClient()
    
    const pageInfo = await notion.pages.retrieve({
      page_id: formattedPageId as string,
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
