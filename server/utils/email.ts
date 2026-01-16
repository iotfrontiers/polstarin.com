import { createTransport } from 'nodemailer'
import { decryptString } from './crypt'

let _transporter: ReturnType<typeof createTransport> = null

const createTransporter = () => {
  const { email } = useRuntimeConfig()

  if (!_transporter) {
    _transporter = createTransport({
      sender: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: decryptString(email.googleSmtpUser),
        pass: decryptString(email.googleSmtpPassword),
      },
    })
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

    // SMTP 설정 확인
    if (!email.googleSmtpUser || !email.googleSmtpPassword) {
      console.error('SMTP 설정이 올바르지 않습니다.')
      throw new Error('이메일 전송 설정 오류')
    }

    const transporter = createTransporter()
    const receiverList = receivers.split(',').map(r => r.trim()).filter(r => r)

    for (const receiver of receiverList) {
      try {
        await transporter.sendMail({
          from: `"POLSTARIN" <${decryptString(email.googleSmtpUser)}>`,
          to: receiver,
          subject,
          html: content.replace(/\n/gi, '<br />'),
        })

        console.log(`이메일 전송 완료: ${receiver}, 제목: ${subject}`)
      } catch (sendError) {
        console.error(`이메일 전송 실패 (${receiver}):`, sendError)
        // 하나의 수신자에게 실패해도 다른 수신자에게는 계속 시도
      }
    }
  } catch (error) {
    console.error('이메일 전송 오류:', error)
    throw error
  }
}
