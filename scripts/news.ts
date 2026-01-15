import { NotionDataLoader } from './loader'
import { useDeepMerge } from '../utils/core'

export const makeNewsDataFile = async () => {
  const loader = new NotionDataLoader({
    id: 'news',
    hasImageInList: false,
    customizeDatabaseQuery(req) {
      return useDeepMerge(req, {
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
    },
    customizeDatabaseResponse(res) {
      return {
        title: res?.properties?.['제목']?.['title'][0]?.['plain_text'] as string,
        author: res?.properties?.['작성자']?.['rich_text'][0]?.['plain_text'] as string,
        viewCnt: res?.properties?.['조회수']?.['number'] as number,
        date: res?.properties?.['작성일']?.['date']?.start as string,
      }
    },
    customizePageResponse(res) {
      return {
        title: res?.properties?.['제목']?.['title'][0]?.['plain_text'] as string,
        author: res?.properties?.['작성자']?.['rich_text'][0]?.['plain_text'] as string,
        viewCnt: res?.properties?.['조회수']?.['number'] as number,
        date: res?.properties?.['작성일']?.['date']?.start as string,
      }
    },
  })
  const databaseId = process.env.NOTION_NEWS_DATABASE_ID
  console.log('[DEBUG][news] 환경 변수에서 Database ID 가져옴:', databaseId ? `${databaseId.substring(0, 10)}...` : '없음')
  
  if (!databaseId) {
    throw new Error('NOTION_NEWS_DATABASE_ID 환경 변수가 설정되지 않았습니다.')
  }
  
  console.log('[DEBUG][news] loadDatabase 호출 시작...')
  await loader.loadDatabase(databaseId)
  console.log('[DEBUG][news] loadDatabase 호출 완료')
}
