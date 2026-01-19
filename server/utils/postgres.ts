import { sql } from '@vercel/postgres'
import type { NotionData } from '~/composables/notion'

/**
 * Postgres 연결 유틸리티
 * 
 * Vercel 환경 변수:
 * - POSTGRES_URL (자동 설정됨)
 */

/**
 * Postgres 연결 확인
 */
function checkPostgresConnection() {
  // Vercel Postgres 환경 변수 확인
  const hasPostgresUrl = !!(
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING
  )
  
  if (!hasPostgresUrl) {
    console.warn('[postgres] POSTGRES_URL 환경 변수가 설정되지 않았습니다.')
    console.warn('[postgres] Vercel 대시보드 → Storage → polstarin-db → Connection String 확인 필요')
    return false
  }
  return true
}

/**
 * 테이블 초기화 (마이그레이션)
 * 최초 1회만 실행하면 됨
 * 서버 시작 시 자동으로 실행됨
 */
export async function initAskTable() {
  if (!checkPostgresConnection()) {
    console.warn('[postgres] Postgres 연결 정보가 없어 테이블 초기화를 건너뜁니다.')
    console.warn('[postgres] Vercel 대시보드에서 환경 변수를 확인해주세요.')
    return
  }
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS ask_posts (
        id VARCHAR(36) PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        email TEXT NOT NULL,
        contact TEXT DEFAULT '',
        company TEXT DEFAULT '',
        content TEXT NOT NULL,
        date TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    
    // 인덱스 생성 (조회 성능 향상)
    await sql`
      CREATE INDEX IF NOT EXISTS idx_ask_posts_date ON ask_posts(date DESC)
    `
    
    // totalCount를 위한 메타 테이블
    await sql`
      CREATE TABLE IF NOT EXISTS ask_metadata (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    
    // 기존 테이블에 company 컬럼 추가 (없으면)
    try {
      await sql`
        ALTER TABLE ask_posts 
        ADD COLUMN IF NOT EXISTS company TEXT DEFAULT ''
      `
      console.log('[postgres] company 컬럼 확인/추가 완료')
    } catch (error) {
      // 컬럼이 이미 있거나 다른 에러는 무시
      console.log('[postgres] company 컬럼 확인:', error instanceof Error ? error.message : String(error))
    }
    
    console.log('[postgres] ask_posts 테이블 초기화 완료')
  } catch (error) {
    console.error('[postgres] 테이블 초기화 실패:', error)
    // 에러를 던지지 않고 로그만 남김 (서버 시작을 막지 않음)
    if (process.env.NODE_ENV === 'development') {
      throw error
    }
  }
}

/**
 * 새 글 추가
 */
export async function insertAskPost(post: NotionData) {
  if (!checkPostgresConnection()) {
    throw new Error('Postgres 연결 정보가 없습니다. Vercel 대시보드에서 Postgres 데이터베이스를 생성해주세요.')
  }
  
  try {
    await sql`
      INSERT INTO ask_posts (id, title, author, email, contact, company, content, date)
      VALUES (${post.id}, ${post.title}, ${post.author}, ${post.email}, ${post.contact || ''}, ${post.company || ''}, ${post.content}, ${post.date})
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        author = EXCLUDED.author,
        email = EXCLUDED.email,
        contact = EXCLUDED.contact,
        company = EXCLUDED.company,
        content = EXCLUDED.content,
        updated_at = NOW()
    `
    
    // totalCount 증가
    await incrementTotalCount()
    
    // 최신 50개만 유지 (오래된 글 삭제)
    await cleanupOldPosts()
    
    console.log(`[postgres] 글 추가 완료: ${post.id}`)
  } catch (error) {
    console.error('[postgres] 글 추가 실패:', error)
    throw error
  }
}

/**
 * 최신 50개만 유지 (오래된 글 삭제)
 */
async function cleanupOldPosts() {
  try {
    const result = await sql`
      DELETE FROM ask_posts
      WHERE id NOT IN (
        SELECT id FROM ask_posts
        ORDER BY date DESC
        LIMIT 50
      )
    `
    
    if (result.rowCount && result.rowCount > 0) {
      console.log(`[postgres] 오래된 글 ${result.rowCount}개 삭제 완료`)
    }
  } catch (error) {
    console.error('[postgres] 오래된 글 삭제 실패:', error)
    // 에러가 나도 계속 진행
  }
}

/**
 * totalCount 증가
 */
async function incrementTotalCount() {
  try {
    await sql`
      INSERT INTO ask_metadata (key, value)
      VALUES ('totalCount', '1')
      ON CONFLICT (key) DO UPDATE SET
        value = (CAST(ask_metadata.value AS INTEGER) + 1)::TEXT,
        updated_at = NOW()
    `
  } catch (error) {
    console.error('[postgres] totalCount 증가 실패:', error)
    // 에러가 나도 계속 진행
  }
}

/**
 * totalCount 조회
 */
export async function getTotalCount(): Promise<number> {
  try {
    const result = await sql`
      SELECT value FROM ask_metadata
      WHERE key = 'totalCount'
    `
    
    if (result.rows.length > 0) {
      return parseInt(result.rows[0].value) || 0
    }
    
    // 없으면 실제 글 개수로 계산
    const countResult = await sql`
      SELECT COUNT(*) as count FROM ask_posts
    `
    return parseInt(countResult.rows[0]?.count) || 0
  } catch (error) {
    console.error('[postgres] totalCount 조회 실패:', error)
    return 0
  }
}

/**
 * 목록 조회 (페이지네이션)
 */
export async function getAskList(page: number = 1, pageSize: number = 10): Promise<{
  list: NotionData[]
  totalCount: number
  hasMore: boolean
}> {
  if (!checkPostgresConnection()) {
    throw new Error('Postgres 연결 정보가 없습니다. Vercel 대시보드에서 Postgres 데이터베이스를 생성해주세요.')
  }
  
  try {
    const offset = (page - 1) * pageSize
    
    // 최신 50개만 조회 (정렬: 최신순)
    const result = await sql`
      SELECT id, title, author, email, contact, company, content, date
      FROM ask_posts
      ORDER BY date DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `
    
    const list: NotionData[] = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      author: row.author,
      email: row.email,
      contact: row.contact || '',
      company: row.company || '',
      content: row.content,
      date: row.date,
    }))
    
    const totalCount = await getTotalCount()
    const hasMore = offset + pageSize < totalCount
    
    return {
      list,
      totalCount,
      hasMore,
    }
  } catch (error) {
    console.error('[postgres] 목록 조회 실패:', error)
    throw error
  }
}

/**
 * 상세 조회
 */
export async function getAskDetail(id: string): Promise<NotionData | null> {
  if (!checkPostgresConnection()) {
    throw new Error('Postgres 연결 정보가 없습니다. Vercel 대시보드에서 Postgres 데이터베이스를 생성해주세요.')
  }
  
  try {
    const result = await sql`
      SELECT id, title, author, email, contact, company, content, date
      FROM ask_posts
      WHERE id = ${id}
    `
    
    if (result.rows.length === 0) {
      return null
    }
    
    const row = result.rows[0]
    return {
      id: row.id,
      title: row.title,
      author: row.author,
      email: row.email,
      contact: row.contact || '',
      company: row.company || '',
      content: row.content,
      date: row.date,
    }
  } catch (error) {
    console.error('[postgres] 상세 조회 실패:', error)
    throw error
  }
}
