// import { NotionData } from '~/composables/notion'

// /**
//  * 포트폴리오 상세 조회
//  */
// export default defineEventHandler(async event => {
//   try {
//     const query = getQuery(event)
//     const id: string = query['id'] as string

//     if (!id) {
//       throw new Error('id is empty')
//     }

//     const notion = createNotionClient()
//     const pageInfo = await notion.pages.retrieve({
//       page_id: id as string,
//     })

//     const data: NotionData = {
//       id: pageInfo.id as string,
//       // @ts-ignore
//       title: pageInfo.properties['Name']?.title?.map(t => t.plain_text).join(''),
//       // @ts-ignore
//       categories: pageInfo.properties['카테고리']?.multi_select?.map(t => t.name),

//       content: await getNotionMarkdownContent(id),

//       imgUrl: '',
//     }

//     // if (!existsSync(cacheFilePath)) {
//     //   writeFile(cacheFilePath, JSON.stringify(data), { encoding: 'utf-8' }, () => {})
//     // }

//     return data
//   } catch (e) {
//     console.error(e)
//     return null
//   }
// })
