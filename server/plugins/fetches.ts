import { useLogger } from '@nuxt/kit'
import axios from 'axios'

export default defineNitroPlugin(async () => {
  const logger = useLogger()

  function callApi() {
    logger.info('fetch portfolio started....')
    axios.post('http://localhost:12005/api/portfolio-list', {}).then(() => {
      logger.info('fetch portfolio finished....')
    })
  }

  setInterval(() => {
    callApi()
  }, 1000 * 60 * 10)

  setTimeout(() => callApi(), 10000)
})