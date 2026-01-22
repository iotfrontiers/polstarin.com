import { NotionDataLoader } from './loader'
import { useDeepMerge } from '../utils/core'

export const makeEducationDataFile = async () => {
  const loader = new NotionDataLoader({
    id: 'education',
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

  const pageId = process.env.NOTION_EDUCATION_PAGE_ID
  
  if (!pageId) {
    console.warn('[WARN][education] NOTION_EDUCATION_PAGE_ID 환경 변수가 설정되지 않았습니다. 교육 데이터 생성을 건너뜁니다.')
    return
  }
  
  await loader.loadPageHierarchy(pageId)
}
