/**
 * 노션 연계 데이터
 */
interface NotionData {
  /**
   * 아이디
   */
  id?: string

  /**
   * 순번
   */
  num?: number

  /**
   * 제목
   */
  title?: string

  /**
   * 작성자
   */
  author?: string

  /**
   * 조회 수
   */
  viewCnt?: number

  /**
   * 일자 (등록일)
   */
  date?: string

  /**
   * 마크다운 컨텐츠
   */
  content?: string

  /**
   * 대표 이미지 경로
   */
  imgUrl?: string

  /**
   * 카테고리 목록 (포트 폴리오)
   */
  categories?: string[]

  /**
   * 최종 업데이트 일시
   */
  lastUpdateDate?: string

  /**
   * 하위 값 목록
   */
  children?: NotionData[]

  /**
   * 링크 연결 URL
   */
  linkUrl?: string

  /**
   * 이메일
   */
  email?: string

  /**
   * 연락처
   */
  contact?: string
}

/**
 * 노션 목록 데이터
 */
interface NotionListResponse<T> {
  nextCursor?: string
  list?: T[]
}

/**
 * 노션 페이징 연계 데이터
 */
interface NotionPageRequest {
  pageSize?: number
  startCursor?: string
}

/**
 * 노션 문의 사항 연계 데이터
 */
interface NotionAskReqeust {
  title?: string
  author?: string
  email?: string
  contact?: string
  content?: string
}

export { type NotionData, type NotionListResponse, type NotionPageRequest, type NotionAskReqeust }
