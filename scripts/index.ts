import dotenv from 'dotenv'
import { makePortfolioDataFile } from './portfolio'
import { makeNewsDataFile } from './news'
import { makeNoticeDataFile } from './notice'
import { makePdsDataFile } from './pds'
import { makeEducationDataFile } from './education'
import { makeProductDataFile } from './product'
import consola from 'consola'

;(async () => {
  // 여러 환경 변수 파일을 순서대로 로드 (나중에 로드된 것이 우선순위가 높음)
  dotenv.config({ path: '.env.app' })
  dotenv.config({ path: '.env.notion' })
  dotenv.config({ path: '.env.email' })
  dotenv.config({ path: '.env.cloudinary' })
  // 기존 .env 파일도 지원 (하위 호환성)
  dotenv.config({ path: '.env' })
  
  // 환경 변수 확인
  const requiredEnvVars = [
    'NOTION_API_SECRET',
    'NOTION_PORTFOLIO_DATABASE_ID',
    'NOTION_NOTICE_DATABASE_ID',
    'NOTION_NEWS_DATABASE_ID',
    'NOTION_PDS_DATABASE_ID',
  ]
  
  // 선택적 환경 변수 (없어도 에러가 나지 않음)
  const optionalEnvVars = [
    'NOTION_EDUCATION_PAGE_ID',
    'NOTION_PRODUCT_PAGE_ID',
  ]
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    console.error('[ERROR] 필수 환경 변수가 설정되지 않았습니다:', missingVars.join(', '))
    consola.error('필수 환경 변수가 설정되지 않았습니다:', missingVars.join(', '))
    process.exit(1)
  }
  
  consola.info('환경 변수 확인 완료')
  
  try {
    await makePortfolioDataFile()
    await makeNewsDataFile()
    await makeNoticeDataFile()
    await makePdsDataFile()
    
    // 교육 데이터 (선택적)
    if (process.env.NOTION_EDUCATION_PAGE_ID) {
      await makeEducationDataFile()
    }
    
    // 제품 데이터 (선택적)
    if (process.env.NOTION_PRODUCT_PAGE_ID) {
      await makeProductDataFile()
    }
    
    consola.success('모든 데이터 생성 완료')
  } catch (error) {
    console.error('='.repeat(80))
    console.error('[ERROR] 데이터 생성 중 오류 발생')
    console.error('[ERROR] 오류 타입:', error?.constructor?.name || typeof error)
    console.error('[ERROR] 오류 메시지:', error instanceof Error ? error.message : String(error))
    console.error('[ERROR] 오류 스택:', error instanceof Error ? error.stack : '스택 정보 없음')
    console.error('='.repeat(80))
    consola.error('데이터 생성 중 오류 발생:', error)
    process.exit(1)
  }
})()
