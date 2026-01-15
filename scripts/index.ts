import dotenv from 'dotenv'
import { makePortfolioDataFile } from './portfolio'
import { makeNewsDataFile } from './news'
import { makeNoticeDataFile } from './notice'
import { makePdsDataFile } from './pds'
import { makeEducationDataFile } from './education'
import { makeProductDataFile } from './product'
import consola from 'consola'

;(async () => {
  dotenv.config()
  
  // 환경 변수 확인
  const requiredEnvVars = [
    'NOTION_API_SECRET',
    'NOTION_PORTFOLIO_DATABASE_ID',
    'NOTION_NOTICE_DATABASE_ID',
    'NOTION_NEWS_DATABASE_ID',
    'NOTION_PDS_DATABASE_ID',
    'NOTION_EDUCATION_DATABASE_ID',
    'NOTION_PRODUCT_DATABASE_ID',
  ]
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    consola.error('필수 환경 변수가 설정되지 않았습니다:', missingVars.join(', '))
    process.exit(1)
  }
  
  consola.info('환경 변수 확인 완료')
  
  try {
    await makePortfolioDataFile()
    await makeNewsDataFile()
    await makeNoticeDataFile()
    await makePdsDataFile()
    await makeEducationDataFile()
    await makeProductDataFile()
    consola.success('모든 데이터 생성 완료')
  } catch (error) {
    consola.error('데이터 생성 중 오류 발생:', error)
    process.exit(1)
  }
})()
