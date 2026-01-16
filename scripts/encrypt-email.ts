import { encryptString } from '../server/utils/crypt'

const emailUser = 'iot.frontier@gmail.com'
const emailPass = 'ealkgavkpqbbcuhm' // 공백 제거

const encryptedUser = encryptString(emailUser)
const encryptedPass = encryptString(emailPass)

console.log('='.repeat(80))
console.log('암호화된 값 생성 완료')
console.log('='.repeat(80))
console.log('\nGOOGLE_SMTP_USER (암호화된 이메일):')
console.log(encryptedUser)
console.log('\nGOOGLE_SMTP_PASSWORD (암호화된 비밀번호):')
console.log(encryptedPass)
console.log('\n' + '='.repeat(80))
console.log('이 값들을 Vercel 환경 변수에 설정하세요.')
console.log('='.repeat(80))
