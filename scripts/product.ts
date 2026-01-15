import { NotionDataLoader } from './loader'
import { useDeepMerge } from '../utils/core'

export const makeProductDataFile = async () => {
  const loader = new NotionDataLoader({
    id: 'product',
    hasImageInList: false,
    appendChildPageInfo: true,
    customizeDatabaseQuery(req) {
      return useDeepMerge(req, {
        sorts: [
          {
            timestamp: 'created_time',
            direction: 'ascending',
          },
        ],
      })
    },
  })

  const pageId = process.env.NOTION_PRODUCT_PAGE_ID
  console.log('[DEBUG][product] 환경 변수에서 Page ID 가져옴:', pageId ? `${pageId.substring(0, 10)}...` : '없음')
  
  if (!pageId) {
    console.warn('[WARN][product] NOTION_PRODUCT_PAGE_ID 환경 변수가 설정되지 않았습니다. 제품 데이터 생성을 건너뜁니다.')
    return
  }
  
  console.log('[DEBUG][product] loadPageHierarchy 호출 시작...')
  await loader.loadPageHierarchy(pageId)
  console.log('[DEBUG][product] loadPageHierarchy 호출 완료')
}
