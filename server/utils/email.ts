import { createTransport } from 'nodemailer'
import { decryptString } from './crypt'

let _transporter: ReturnType<typeof createTransport> = null

const createTransporter = () => {
  const { email } = useRuntimeConfig()

  if (!_transporter) {
    try {
      const decryptedUser = decryptString(email.googleSmtpUser)
      const decryptedPass = decryptString(email.googleSmtpPassword)
      
      _transporter = createTransport({
        sender: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: decryptedUser,
          pass: decryptedPass,
        },
      })
    } catch (decryptError) {
      throw decryptError
    }
  }

  return _transporter
}

export const sendEmail = async (subject: string, content: string) => {
  try {
    const { email } = useRuntimeConfig()
    
    // 이메일 수신자 설정: 환경 변수가 있으면 사용, 없으면 기본값 사용
    const receivers = email.emailReceivers || 'jongju0920@kakao.com'

    if (!receivers) {
      console.warn('이메일 수신자가 설정되지 않았습니다.')
      return
    }

    if (!email.googleSmtpUser || !email.googleSmtpPassword) {
      throw new Error('이메일 전송 설정 오류')
    }

    const transporter = createTransporter()
    
    const receiverList = receivers.split(',').map(r => r.trim()).filter(r => r)

    for (const receiver of receiverList) {
      try {
        const decryptedUser = decryptString(email.googleSmtpUser)
        
        const mailOptions = {
          from: `"POLSTARIN" <${decryptedUser}>`,
          to: receiver,
          subject,
          html: content.replace(/\n/gi, '<br />'),
        }
        
        await transporter.sendMail(mailOptions)
      } catch (sendError) {
        console.error(`이메일 전송 실패 (${receiver}):`, sendError instanceof Error ? sendError.message : String(sendError))
        // 하나의 수신자에게 실패해도 다른 수신자에게는 계속 시도
      }
    }
  } catch (error) {
    console.error('이메일 전송 함수 에러:', error instanceof Error ? error.message : String(error))
    throw error
  }
}
