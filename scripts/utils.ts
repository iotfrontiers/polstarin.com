import { Client } from '@notionhq/client'
import { v2 as cloudinary } from 'cloudinary'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { existsSync, mkdirSync, createWriteStream } from 'node:fs'
import { decryptString } from '../server/utils/crypt.ts'
import { extname, resolve, dirname, join } from 'pathe'
import { NotionToMarkdown } from 'notion-to-md'
import axios from 'axios'
import https from 'https'

/**
 * UUID 형식으로 변환 (하이픈 추가)
 * @param id
 * @returns
 */
export const formatNotionId = (id: string): string => {
  console.log('[DEBUG] formatNotionId - 입력 ID:', id)
  console.log('[DEBUG] formatNotionId - ID 타입:', typeof id)
  console.log('[DEBUG] formatNotionId - ID 길이:', id ? id.length : 0)
  
  if (!id) {
    console.log('[DEBUG] formatNotionId - ID가 비어있음')
    return id
  }
  
  // 접두사가 있는 경우 (예: News-19ec88ac8c29814c82c0ffd96e94951f)
  // Notion API는 접두사를 받지 않으므로 접두사를 제거해야 함
  let idPart = id
  
  // 하이픈으로 시작하지 않는 접두사 처리 (예: News-)
  // 접두사는 로깅용으로만 사용하고, 실제 반환값에서는 제거
  const match = id.match(/^([A-Za-z]+)-(.+)$/)
  if (match) {
    const prefix = match[1] + '-'
    idPart = match[2]
    console.log('[DEBUG] formatNotionId - 접두사 발견 및 제거:', prefix, '→ ID 부분:', idPart)
  }
  
  // ID 부분에 이미 하이픈이 있으면 (올바른 UUID 형식) 그대로 반환 (접두사 제거 후)
  if (idPart.includes('-') && idPart.length === 36) {
    console.log('[DEBUG] formatNotionId - ID 부분이 이미 하이픈 포함 UUID 형식, 접두사 제거 후 반환')
    return idPart
  }
  
  // ID 부분이 32자리면 하이픈 추가 (접두사 제거 후)
  if (idPart.length === 32) {
    const formatted = `${idPart.slice(0, 8)}-${idPart.slice(8, 12)}-${idPart.slice(12, 16)}-${idPart.slice(16, 20)}-${idPart.slice(20, 32)}`
    console.log('[DEBUG] formatNotionId - 변환 완료 (접두사 제거):', formatted)
    return formatted
  }
  
  // 그 외의 경우 그대로 반환
  console.log('[DEBUG] formatNotionId - 형식 변환 불가, 그대로 반환')
  return id
}

/**
 * notion client 객체 생성
 * @returns
 */
export const createNotionClient = () => {
  const apiSecret = process.env.NOTION_API_SECRET
  console.log('[DEBUG] NOTION_API_SECRET 존재 여부:', !!apiSecret)
  console.log('[DEBUG] NOTION_API_SECRET 길이:', apiSecret ? apiSecret.length : 0)
  console.log('[DEBUG] NOTION_API_SECRET 시작 부분:', apiSecret ? apiSecret.substring(0, 10) + '...' : '없음')
  
  if (!apiSecret) {
    throw new Error('NOTION_API_SECRET 환경 변수가 설정되지 않았습니다.')
  }
  
  try {
    console.log('[DEBUG] 복호화 시작...')
    const decryptedSecret = decryptString(apiSecret)
    console.log('[DEBUG] 복호화 완료. 길이:', decryptedSecret ? decryptedSecret.length : 0)
    console.log('[DEBUG] 복호화된 값 시작 부분:', decryptedSecret ? decryptedSecret.substring(0, 10) + '...' : '없음')
    
    if (!decryptedSecret || decryptedSecret.trim() === '') {
      throw new Error('NOTION_API_SECRET 복호화 실패 또는 빈 값입니다.')
    }
    
    console.log('[DEBUG] Notion Client 생성 중...')
    const client = new Client({
      auth: decryptedSecret,
    })
    console.log('[DEBUG] Notion Client 생성 완료')
    return client
  } catch (error) {
    console.error('[DEBUG] Notion API Secret 복호화 오류:', error)
    if (error instanceof Error) {
      console.error('[DEBUG] 에러 메시지:', error.message)
      console.error('[DEBUG] 에러 스택:', error.stack)
    }
    throw new Error(`NOTION_API_SECRET 복호화 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 페이지의 이미지 URL을 반환
 * @param pageId
 * @param saveAsLocal
 * @returns
 */
export const getImageUrlInPage = async (pageId: string, saveAsLocal: boolean = true, useCloudinary = false) => {
  console.log(`[DEBUG][getImageUrlInPage] 시작 - pageId: ${pageId}, saveAsLocal: ${saveAsLocal}, useCloudinary: ${useCloudinary}`)
  try {
    const notion = createNotionClient()
    const blockResult = await notion.blocks.children.list({
      block_id: pageId,
    })

    console.log(`[DEBUG][getImageUrlInPage] 블록 개수: ${blockResult.results?.length || 0}`)

    if (blockResult.results) {
      for (const block of blockResult.results) {
        if (block['type'] === 'image' && block['image']) {
          console.log(`[DEBUG][getImageUrlInPage] 이미지 블록 발견 - type: ${block['type']}`)
          console.log(`[DEBUG][getImageUrlInPage] external?.url: ${block['image']?.external?.url || '없음'}`)
          console.log(`[DEBUG][getImageUrlInPage] file?.url: ${block['image']?.file?.url || '없음'}`)

          // 외부 URL이 있으면 우선 사용
          if (block['image']?.external?.url) {
            console.log(`[DEBUG][getImageUrlInPage] 외부 URL 반환: ${block['image']?.external?.url}`)
            return block['image']?.external?.url
          }

          // 파일 URL이 있는 경우
          if (block['image']?.file?.url) {
            const originalFileUrl = block['image']?.file?.url
            console.log(`[DEBUG][getImageUrlInPage] 원본 파일 URL: ${originalFileUrl}`)

            if (saveAsLocal) {
              if (useCloudinary) {
                console.log(`[DEBUG][getImageUrlInPage] Cloudinary 업로드 시도...`)
                const cloudinaryFileUrl = await uploadCloudinaryImage(originalFileUrl)
                if (cloudinaryFileUrl) {
                  console.log(`[DEBUG][getImageUrlInPage] Cloudinary 업로드 성공: ${cloudinaryFileUrl}`)
                  return cloudinaryFileUrl
                }
                console.log(`[DEBUG][getImageUrlInPage] Cloudinary 업로드 실패, 원본 URL 사용: ${originalFileUrl}`)
                // Cloudinary 업로드 실패 시 원본 URL 사용
                return originalFileUrl
              } else {
                console.log(`[DEBUG][getImageUrlInPage] 로컬 파일 저장 시도...`)
                const localFileUrl = await saveFileFromImageUrl(pageId, originalFileUrl)
                if (localFileUrl) {
                  console.log(`[DEBUG][getImageUrlInPage] 로컬 파일 저장 성공: ${localFileUrl}`)
                  return localFileUrl
                }
                console.log(`[DEBUG][getImageUrlInPage] 로컬 파일 저장 실패, 원본 URL 사용: ${originalFileUrl}`)
                // 로컬 파일 저장 실패 시 원본 URL 사용
                return originalFileUrl
              }
            }

            // saveAsLocal이 false면 원본 URL 그대로 반환
            console.log(`[DEBUG][getImageUrlInPage] saveAsLocal=false, 원본 URL 반환: ${originalFileUrl}`)
            return originalFileUrl
          }
        }
      }
    }
    console.log(`[DEBUG][getImageUrlInPage] 이미지 블록을 찾지 못함`)
  } catch (e) {
    console.error(`[DEBUG][getImageUrlInPage] 에러 발생:`, e)
    return null
  }
  
  console.log(`[DEBUG][getImageUrlInPage] null 반환`)
  return null
}

/**
 * cloudinary 전역 설정
 */
const setCloudinaryGlobalConfig = () => {
  cloudinary.config({
    cloud_name: decryptString(process.env.CLOUDINARY_CLOUD_NAME),
    api_key: decryptString(process.env.CLOUDINARY_API_KEY),
    api_secret: decryptString(process.env.CLOUDINARY_API_SECRET),
  })
}

const getFileExt = (url: string) => {
  const ext = extname(url).toLocaleLowerCase()

  if (ext === '.jpeg') {
    return 'jpg'
  }

  return ext.substring(1)
}

const uploadCloudinaryImage = (imageUrl: string) => {
  return new Promise(async (resolve, reject) => {
    setCloudinaryGlobalConfig()

    if (!imageUrl.includes('amazonaws.com')) {
      resolve(imageUrl)
      return
    }

    const resourceUrl = new URL(imageUrl)
    const fileId = createHash('md5')
      .update(resourceUrl.origin + resourceUrl.pathname)
      .digest('hex')

    const destUrl = cloudinary.url(`frontier/${fileId}`, {
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
      secure: true,
      format: getFileExt(resourceUrl.pathname),
    })

    try {
      await axios.request({
        method: 'HEAD',
        url: destUrl,
      })
      resolve(destUrl)
      return
    } catch (e) {}

    cloudinary.uploader
      .upload(imageUrl, {
        public_id: fileId,
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
        overwrite: false,
      })
      .then(res => resolve(res.url))
      .catch(err => {
        console.error(err)
        //reject(err)
        resolve(imageUrl)
      })
  })
}

export const getNotionMarkdownContent = async (id: string, downloadResource: boolean = true, useCloudinary = false) => {
  const notion = createNotionClient()
  const n2m = new NotionToMarkdown({ notionClient: notion })
  const blocks = await n2m.pageToMarkdown(id, 1)

  if (downloadResource) {
    for (const block of blocks) {
      if (block.type === 'image') {
        if (block.parent) {
          const dataArr = block.parent.split('(')

          if (dataArr[1].includes('amazonaws.com')) {
            // const imgPath = await saveFileFromImageUrl(id, dataArr[1].substring(0, dataArr[1].length - 1))

            if (useCloudinary) {
              const cloudinaryFileUrl = await uploadCloudinaryImage(dataArr[1].substring(0, dataArr[1].length - 1))
              if (cloudinaryFileUrl) {
                block.parent = decodeURIComponent(dataArr[0]) + `(${cloudinaryFileUrl})`
              }
            } else {
              const localFileUrl = await saveFileFromImageUrl(id, dataArr[1].substring(0, dataArr[1].length - 1))
              if (localFileUrl) {
                block.parent = decodeURIComponent(dataArr[0]) + `(${localFileUrl})`
              }
            }
          }
        }
      }

      if (block.type === 'file') {
        if (block.parent) {
          const dataArr = block.parent.split('(')

          if (dataArr[1].includes('amazonaws.com')) {
            // const filePath = await saveFileFromImageUrl(id, dataArr[1].substring(0, dataArr[1].length - 1))

            if (useCloudinary) {
              const cloudinaryFileUrl = await uploadCloudinaryImage(dataArr[1].substring(0, dataArr[1].length - 1))

              if (cloudinaryFileUrl) {
                block.parent = decodeURIComponent(dataArr[0]) + `(${cloudinaryFileUrl})`
              }
            } else {
              const localFileUrl = await saveFileFromImageUrl(id, dataArr[1].substring(0, dataArr[1].length - 1))
              if (localFileUrl) {
                block.parent = decodeURIComponent(dataArr[0]) + `(${localFileUrl})`
              }
            }
          }
        }
      }
    }
  }

  return n2m.toMarkdownString(blocks)?.parent || ''
}

/**
 * 데이터 파일 경로 조회
 * @param id
 * @returns
 */
export const getDataFilePath = (id: string) => {
  return resolve(fileURLToPath(dirname(import.meta.url)), `../data/${id}.json`)
}

/**
 * 페이지 데이터 파일 경로 조회
 * @param id
 * @param pageId
 * @returns
 */
export const getPageDataFilePath = (id: string, pageId: string) => {
  return resolve(fileURLToPath(dirname(import.meta.url)), `../public/data/${id}/${pageId}.json`)
}

export const saveFileFromImageUrl = async (pageId: string, url: string) => {
  console.log(`[DEBUG][saveFileFromImageUrl] 시작 - pageId: ${pageId}, url: ${url}`)
  try {
    if (!url.includes('amazonaws.com')) {
      console.log(`[DEBUG][saveFileFromImageUrl] amazonaws.com이 포함되지 않음, null 반환`)
      return null
    }

    const targetDir = resolve(getNotionResourcePath(), `./${pageId}`)
    console.log(`[DEBUG][saveFileFromImageUrl] 대상 디렉토리: ${targetDir}`)
    
    if (!existsSync(targetDir)) {
      console.log(`[DEBUG][saveFileFromImageUrl] 디렉토리 생성: ${targetDir}`)
      mkdirSync(targetDir, { recursive: true })
    }

    const resourceUrl = new URL(url)
    const fileName =
      createHash('md5')
        .update(pageId + resourceUrl.origin + resourceUrl.pathname)
        .digest('hex') + extname(resourceUrl.pathname)
    const filePath = join(targetDir, fileName)
    console.log(`[DEBUG][saveFileFromImageUrl] 파일 경로: ${filePath}`)

    if (!existsSync(filePath)) {
      console.log(`[DEBUG][saveFileFromImageUrl] 파일 다운로드 시작...`)
      await downloadToFile(filePath, url)
      console.log(`[DEBUG][saveFileFromImageUrl] 파일 다운로드 완료`)
    } else {
      console.log(`[DEBUG][saveFileFromImageUrl] 파일이 이미 존재함`)
    }

    const returnPath = `/notion-resources/${pageId}/${fileName}`
    console.log(`[DEBUG][saveFileFromImageUrl] 성공, 반환 경로: ${returnPath}`)
    return returnPath
  } catch (e) {
    console.error(`[DEBUG][saveFileFromImageUrl] 에러 발생:`, e)
    console.error(`[DEBUG][saveFileFromImageUrl] 에러 스택:`, e instanceof Error ? e.stack : '스택 없음')
  }

  console.log(`[DEBUG][saveFileFromImageUrl] 실패, null 반환`)
  return null
}

export const downloadToFile = (filePath: string, url: string) => {
  return new Promise<void>((resolve, reject) => {
    https.get(url, res => {
      const fs = createWriteStream(filePath)
      res.pipe(fs)
      fs.on('finish', () => {
        fs.close()
        resolve()
      })
      fs.on('error', err => reject(err))
    })
  })
}

export const getNotionResourcePath = () => {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../public/notion-resources')
}
