import { createBoardDetailApi } from '~/server/utils/notion'

/**
 * 기술/견적 문의 상세 조회
 */
export default defineEventHandler(async event => {
  return createBoardDetailApi(event)
})
