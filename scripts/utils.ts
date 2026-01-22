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
import consola from 'consola'

/**
 * UUID 형식으로 변환 (하이픈 추가)
 * @param id
 * @returns
 */
export const formatNotionId = (id: string): string => {
  if (!id) {
    return id
  }
  
  // 접두사가 있는 경우 (예: News-19ec88ac8c29814c82c0ffd96e94951f)
  // Notion API는 접두사를 받지 않으므로 접두사를 제거해야 함
  let idPart = id
  
  // 하이픈으로 시작하지 않는 접두사 처리 (예: News-)
  // 접두사는 로깅용으로만 사용하고, 실제 반환값에서는 제거
  const match = id.match(/^([A-Za-z]+)-(.+)$/)
  if (match) {
    idPart = match[2]
  }
  
  // ID 부분에 이미 하이픈이 있으면 (올바른 UUID 형식) 그대로 반환 (접두사 제거 후)
  if (idPart.includes('-') && idPart.length === 36) {
    return idPart
  }
  
  // ID 부분이 32자리면 하이픈 추가 (접두사 제거 후)
  if (idPart.length === 32) {
    const formatted = `${idPart.slice(0, 8)}-${idPart.slice(8, 12)}-${idPart.slice(12, 16)}-${idPart.slice(16, 20)}-${idPart.slice(20, 32)}`
    return formatted
  }
  
  // 그 외의 경우 그대로 반환
  return id
}

/**
 * notion client 객체 생성
 * @returns
 */
export const createNotionClient = () => {
  const apiSecret = process.env.NOTION_API_SECRET
  
  if (!apiSecret) {
    throw new Error('NOTION_API_SECRET 환경 변수가 설정되지 않았습니다.')
  }
  
  try {
    const decryptedSecret = decryptString(apiSecret)
    
    if (!decryptedSecret || decryptedSecret.trim() === '') {
      throw new Error('NOTION_API_SECRET 복호화 실패 또는 빈 값입니다.')
    }
    
    const client = new Client({
      auth: decryptedSecret,
    })
    return client
  } catch (error) {
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
  try {
    const notion = createNotionClient()
    const blockResult = await notion.blocks.children.list({
      block_id: pageId,
    })

    if (blockResult.results) {
      for (const block of blockResult.results) {
        if (block['type'] === 'image' && block['image']) {
          // 외부 URL이 있으면 우선 사용
          if (block['image']?.external?.url) {
            return block['image']?.external?.url
          }

          // 파일 URL이 있는 경우
          if (block['image']?.file?.url) {
            const originalFileUrl = block['image']?.file?.url

            if (saveAsLocal) {
              if (useCloudinary) {
                const cloudinaryFileUrl = await uploadCloudinaryImage(originalFileUrl)
                if (cloudinaryFileUrl) {
                  return cloudinaryFileUrl
                }
                // Cloudinary 업로드 실패 시 원본 URL 사용
                return originalFileUrl
              } else {
                const localFileUrl = await saveFileFromImageUrl(pageId, originalFileUrl)
                if (localFileUrl) {
                  return localFileUrl
                }
                // 로컬 파일 저장 실패 시 원본 URL 사용
                return originalFileUrl
              }
            }

            // saveAsLocal이 false면 원본 URL 그대로 반환
            return originalFileUrl
          }
        }
      }
    }
  } catch (e) {
    return null
  }
  
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

    const destUrl = cloudinary.url(`polstarin/${fileId}`, {
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
  consola.info(`[getNotionMarkdownContent] 페이지 ID: ${id}`)
  consola.info(`[getNotionMarkdownContent] 블록 가져오기 시작...`)
  
  const notion = createNotionClient()
  const n2m = new NotionToMarkdown({ notionClient: notion })
  // totalPage 파라미터를 제거하여 모든 블록을 가져오도록 수정 (기존에는 1로 제한되어 최대 100개 블록만 가져왔음)
  const blocks = await n2m.pageToMarkdown(id)
  
  const blockCount = Array.isArray(blocks) ? blocks.length : 0
  consola.info(`[getNotionMarkdownContent] 가져온 블록 개수: ${blockCount}개`)

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

  const markdownContent = n2m.toMarkdownString(blocks)?.parent || ''
  const contentLength = typeof markdownContent === 'string' ? markdownContent.length : 0
  consola.info(`[getNotionMarkdownContent] 마크다운 변환 완료: ${contentLength} 문자`)
  
  return markdownContent
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
  try {
    if (!url.includes('amazonaws.com')) {
      return null
    }

    const targetDir = resolve(getNotionResourcePath(), `./${pageId}`)
    
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true })
    }

    const resourceUrl = new URL(url)
    const fileName =
      createHash('md5')
        .update(pageId + resourceUrl.origin + resourceUrl.pathname)
        .digest('hex') + extname(resourceUrl.pathname)
    const filePath = join(targetDir, fileName)

    if (!existsSync(filePath)) {
      await downloadToFile(filePath, url)
    }

    const returnPath = `/notion-resources/${pageId}/${fileName}`
    return returnPath
  } catch (e) {
    // 에러 발생 시 null 반환
  }

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
