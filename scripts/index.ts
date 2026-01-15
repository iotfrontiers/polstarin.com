import dotenv from 'dotenv'
import { makePortfolioDataFile } from './portfolio'
import { makeNewsDataFile } from './news'
import { makeNoticeDataFile } from './notice'
import { makePdsDataFile } from './pds'
import { makeEducationDataFile } from './education'
import { makeProductDataFile } from './product'
import consola from 'consola'

;(async () => {
  console.log('='.repeat(80))
  console.log('[DEBUG] 스크립트 시작')
  console.log('[DEBUG] 현재 디렉토리:', process.cwd())
  console.log('='.repeat(80))
  
  console.log('[DEBUG] dotenv.config() 호출...')
  dotenv.config()
  console.log('[DEBUG] dotenv.config() 완료')
  
  // 환경 변수 확인
  const requiredEnvVars = [
    'NOTION_API_SECRET',
    'NOTION_PORTFOLIO_DATABASE_ID',
    'NOTION_NOTICE_DATABASE_ID',
    'NOTION_NEWS_DATABASE_ID',
    'NOTION_PDS_DATABASE_ID',
    'NOTION_EDUCATION_PAGE_ID',  // education은 PAGE_ID 사용
    'NOTION_PRODUCT_PAGE_ID',    // product는 PAGE_ID 사용
  ]
  
  console.log('[DEBUG] 환경 변수 확인 시작...')
  const envVarStatus: Record<string, { exists: boolean; length: number; preview: string }> = {}
  
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName]
    envVarStatus[varName] = {
      exists: !!value,
      length: value ? value.length : 0,
      preview: value ? (varName.includes('SECRET') ? value.substring(0, 10) + '...' : value.substring(0, 20) + (value.length > 20 ? '...' : '')) : '없음'
    }
    console.log(`[DEBUG] ${varName}:`, envVarStatus[varName])
  })
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    console.error('[ERROR] 필수 환경 변수가 설정되지 않았습니다:', missingVars.join(', '))
    console.error('[ERROR] 환경 변수 상태:', JSON.stringify(envVarStatus, null, 2))
    consola.error('필수 환경 변수가 설정되지 않았습니다:', missingVars.join(', '))
    process.exit(1)
  }
  
  console.log('[DEBUG] 모든 필수 환경 변수 존재 확인 완료')
  consola.info('환경 변수 확인 완료')
  console.log('='.repeat(80))
  
  try {
    console.log('[DEBUG] 포트폴리오 데이터 생성 시작...')
    await makePortfolioDataFile()
    console.log('[DEBUG] 포트폴리오 데이터 생성 완료')
    
    console.log('[DEBUG] 뉴스 데이터 생성 시작...')
    await makeNewsDataFile()
    console.log('[DEBUG] 뉴스 데이터 생성 완료')
    
    console.log('[DEBUG] 공지사항 데이터 생성 시작...')
    await makeNoticeDataFile()
    console.log('[DEBUG] 공지사항 데이터 생성 완료')
    
    console.log('[DEBUG] PDS 데이터 생성 시작...')
    await makePdsDataFile()
    console.log('[DEBUG] PDS 데이터 생성 완료')
    
    console.log('[DEBUG] 교육 데이터 생성 시작...')
    await makeEducationDataFile()
    console.log('[DEBUG] 교육 데이터 생성 완료')
    
    console.log('[DEBUG] 제품 데이터 생성 시작...')
    await makeProductDataFile()
    console.log('[DEBUG] 제품 데이터 생성 완료')
    
    console.log('='.repeat(80))
    console.log('[DEBUG] 모든 데이터 생성 완료')
    console.log('='.repeat(80))
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
