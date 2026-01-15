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
  if (!id) return id
  // 이미 하이픈이 있으면 그대로 반환
  if (id.includes('-')) return id
  // 하이픈이 없으면 UUID 형식으로 변환: 8-4-4-4-12
  if (id.length === 32) {
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20, 32)}`
  }
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
    return new Client({
      auth: decryptedSecret,
    })
  } catch (error) {
    console.error('Notion API Secret 복호화 오류:', error)
    throw new Error('NOTION_API_SECRET 복호화 중 오류가 발생했습니다.')
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
          let fileUrl = null
          if (saveAsLocal && block['image']?.file?.url) {
            fileUrl = block['image']?.file?.url
            // const localFileUrl = await saveFileFromImageUrl('portfolio', fileUrl)

            if (useCloudinary) {
              const cloudinaryFileUrl = await uploadCloudinaryImage(fileUrl)
              if (cloudinaryFileUrl) {
                fileUrl = cloudinaryFileUrl
              }
            } else {
              const localFileUrl = await saveFileFromImageUrl(pageId, fileUrl)
              if (localFileUrl) {
                fileUrl = localFileUrl
              }
            }
          }

          return fileUrl ? fileUrl : block['image']?.external?.url
        }
      }
    }
  } catch (e) {
    console.error(e)
    return null
  }
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

    return `/notion-resources/${pageId}/${fileName}`
  } catch (e) {
    console.error(e)
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
