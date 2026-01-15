import { NotionDataLoader } from './loader'

export const makePortfolioDataFile = async () => {
  const loader = new NotionDataLoader({
    id: 'portfolio',
    hasImageInList: true,
    customizeDatabaseQuery(req) {
      req.sorts = [
        {
          timestamp: 'created_time',
          direction: 'descending',
        },
      ]
      return req
    },
    customizeDatabaseResponse(res) {
      const title = res.properties['Name']?.['title']?.map(t => t.plain_text).join('')
      const categories = res.properties['카테고리']?.['multi_select']?.map(t => t.name)

      return {
        title,
        categories,
      }
    },
    customizePageResponse(res) {
      const title = res.properties['Name']?.['title']?.map(t => t.plain_text).join('')
      const categories = res.properties['카테고리']?.['multi_select']?.map(t => t.name)

      return {
        title,
        categories,
      }
    },
  })
  const databaseId = process.env.NOTION_PORTFOLIO_DATABASE_ID
  console.log('[DEBUG][portfolio] 환경 변수에서 Database ID 가져옴:', databaseId ? `${databaseId.substring(0, 10)}...` : '없음')
  
  if (!databaseId) {
    throw new Error('NOTION_PORTFOLIO_DATABASE_ID 환경 변수가 설정되지 않았습니다.')
  }
  
  console.log('[DEBUG][portfolio] loadDatabase 호출 시작...')
  await loader.loadDatabase(databaseId)
  console.log('[DEBUG][portfolio] loadDatabase 호출 완료')
}
