export default defineEventHandler(async event => {
  const query = getQuery(event)
  const id: string = query['id'] as string

  const notion = createNotionClient()
  const pageInfo = await notion.pages.retrieve({
    page_id: id as string,
  })

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
})
