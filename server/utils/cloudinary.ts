import { v2 as cloudinary } from 'cloudinary'
import { createHash } from 'node:crypto'
import { extname } from 'pathe'
import axios from 'axios'

const setGlobalConfig = () => {
  const { cloudinary: cloudinaryConfig } = useRuntimeConfig()

  cloudinary.config({
    cloud_name: decryptString(cloudinaryConfig.cloudName),
    api_key: decryptString(cloudinaryConfig.apiKey),
    api_secret: decryptString(cloudinaryConfig.apiSecret),
  })
}

/**
 * upload image to cloudinary
 * @param imageUrl
 * @returns
 */
export const uploadCloudinaryImage = (imageUrl: string) => {
  const { cloudinary: cloudinaryConfig } = useRuntimeConfig()

  return new Promise(async (resolve, reject) => {
    setGlobalConfig()

    if (!imageUrl.includes('amazonaws.com')) {
      resolve(imageUrl)
      return
    }

    const resourceUrl = new URL(imageUrl)
    const fileId = createHash('md5')
      .update(resourceUrl.origin + resourceUrl.pathname)
      .digest('hex')

    const destUrl = cloudinary.url(`polstarin/${fileId}`, {
      upload_preset: cloudinaryConfig.uploadPreset,
      secure: !process.dev,
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
        upload_preset: cloudinaryConfig.uploadPreset,
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

const getFileExt = (url: string) => {
  const ext = extname(url).toLocaleLowerCase()

  if (ext === '.jpeg') {
    return 'jpg'
  }

  return ext.substring(1)
}
