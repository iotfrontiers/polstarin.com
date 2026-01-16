import { createTransport } from 'nodemailer'
import { decryptString } from './crypt'

let _transporter: ReturnType<typeof createTransport> = null

const createTransporter = () => {
  console.log('[DEBUG][email][transporter] ========== Transporter 생성 시작 ==========')
  const { email } = useRuntimeConfig()
  console.log('[DEBUG][email][transporter] 1. 환경 변수 로드 완료')

  if (!_transporter) {
    console.log('[DEBUG][email][transporter] 2. 새 Transporter 생성 시작...')
    console.log('[DEBUG][email][transporter] 2-1. email.googleSmtpUser 존재:', !!email.googleSmtpUser)
    console.log('[DEBUG][email][transporter] 2-2. email.googleSmtpPassword 존재:', !!email.googleSmtpPassword)
    
    try {
      console.log('[DEBUG][email][transporter] 2-3. 이메일 계정 복호화 시작...')
      const decryptedUser = decryptString(email.googleSmtpUser)
      const decryptedPass = decryptString(email.googleSmtpPassword)
      console.log('[DEBUG][email][transporter] 2-4. 이메일 계정 복호화 완료')
      console.log('[DEBUG][email][transporter] 2-5. 복호화된 user 길이:', decryptedUser?.length || 0)
      console.log('[DEBUG][email][transporter] 2-6. 복호화된 pass 길이:', decryptedPass?.length || 0)
      console.log('[DEBUG][email][transporter] 2-7. 복호화된 user (일부):', decryptedUser ? `${decryptedUser.substring(0, 5)}...` : '없음')
      
      console.log('[DEBUG][email][transporter] 2-8. createTransport 호출 시작...')
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
      console.log('[DEBUG][email][transporter] 2-9. createTransport 호출 완료')
    } catch (decryptError) {
      console.error('[DEBUG][email][transporter] 2-10. 복호화 오류 발생!')
      console.error('[DEBUG][email][transporter] 2-11. 오류 타입:', decryptError?.constructor?.name || typeof decryptError)
      console.error('[DEBUG][email][transporter] 2-12. 오류 메시지:', decryptError instanceof Error ? decryptError.message : String(decryptError))
      throw decryptError
    }
  } else {
    console.log('[DEBUG][email][transporter] 3. 기존 Transporter 재사용')
  }

  console.log('[DEBUG][email][transporter] ========== Transporter 생성 완료 ==========')
  return _transporter
}

export const sendEmail = async (subject: string, content: string) => {
  console.log('[DEBUG][email] ========== 이메일 전송 함수 시작 ==========')
  console.log('[DEBUG][email] 1. 함수 파라미터 확인...')
  console.log('[DEBUG][email] 1-1. subject:', subject)
  console.log('[DEBUG][email] 1-2. content 길이:', content?.length || 0)
  
  try {
    console.log('[DEBUG][email] 2. 환경 변수 로드 시작...')
    const { email } = useRuntimeConfig()
    console.log('[DEBUG][email] 2-1. email 객체 존재:', !!email)
    
    // 이메일 수신자 설정: 환경 변수가 있으면 사용, 없으면 기본값 사용
    console.log('[DEBUG][email] 3. 이메일 수신자 설정 확인...')
    const receivers = email.emailReceivers || 'jongju0920@kakao.com'
    console.log('[DEBUG][email] 3-1. receivers 값:', receivers)

    if (!receivers) {
      console.warn('[DEBUG][email] 3-2. 이메일 수신자가 설정되지 않았습니다.')
      return
    }

    // SMTP 설정 확인
    console.log('[DEBUG][email] 4. SMTP 설정 확인...')
    console.log('[DEBUG][email] 4-1. email.googleSmtpUser 존재:', !!email.googleSmtpUser)
    console.log('[DEBUG][email] 4-2. email.googleSmtpUser 길이:', email.googleSmtpUser?.length || 0)
    console.log('[DEBUG][email] 4-3. email.googleSmtpPassword 존재:', !!email.googleSmtpPassword)
    console.log('[DEBUG][email] 4-4. email.googleSmtpPassword 길이:', email.googleSmtpPassword?.length || 0)
    
    if (!email.googleSmtpUser || !email.googleSmtpPassword) {
      console.error('[DEBUG][email] 4-5. SMTP 설정이 올바르지 않습니다.')
      throw new Error('이메일 전송 설정 오류')
    }

    console.log('[DEBUG][email] 5. Transporter 생성 시작...')
    const transporter = createTransporter()
    console.log('[DEBUG][email] 5-1. Transporter 생성 완료')
    
    console.log('[DEBUG][email] 6. 수신자 목록 생성 시작...')
    const receiverList = receivers.split(',').map(r => r.trim()).filter(r => r)
    console.log('[DEBUG][email] 6-1. 수신자 목록:', receiverList)
    console.log('[DEBUG][email] 6-2. 수신자 수:', receiverList.length)

    for (const receiver of receiverList) {
      console.log(`[DEBUG][email] 7. 수신자 ${receiver}에게 이메일 전송 시작...`)
      try {
        console.log(`[DEBUG][email] 7-1. 발신자 이메일 복호화 시작...`)
        const decryptedUser = decryptString(email.googleSmtpUser)
        console.log(`[DEBUG][email] 7-2. 발신자 이메일 복호화 완료, 길이:`, decryptedUser?.length || 0)
        console.log(`[DEBUG][email] 7-3. 발신자 이메일 (일부):`, decryptedUser ? `${decryptedUser.substring(0, 5)}...` : '없음')
        
        console.log(`[DEBUG][email] 7-4. 이메일 전송 요청 시작...`)
        const mailOptions = {
          from: `"POLSTARIN" <${decryptedUser}>`,
          to: receiver,
          subject,
          html: content.replace(/\n/gi, '<br />'),
        }
        console.log(`[DEBUG][email] 7-5. mailOptions:`, {
          from: mailOptions.from.substring(0, 20) + '...',
          to: mailOptions.to,
          subject: mailOptions.subject,
          htmlLength: mailOptions.html.length
        })
        
        await transporter.sendMail(mailOptions)
        console.log(`[DEBUG][email] 7-6. 이메일 전송 완료: ${receiver}, 제목: ${subject}`)
      } catch (sendError) {
        console.error(`[DEBUG][email] 7-7. 이메일 전송 실패 (${receiver})!`)
        console.error(`[DEBUG][email] 7-8. 오류 타입:`, sendError?.constructor?.name || typeof sendError)
        console.error(`[DEBUG][email] 7-9. 오류 메시지:`, sendError instanceof Error ? sendError.message : String(sendError))
        if (sendError instanceof Error && sendError.stack) {
          console.error(`[DEBUG][email] 7-10. 오류 스택:`, sendError.stack)
        }
        // 하나의 수신자에게 실패해도 다른 수신자에게는 계속 시도
      }
    }
    console.log('[DEBUG][email] ========== 이메일 전송 함수 완료 ==========')
  } catch (error) {
    console.error('[DEBUG][email] ========== 이메일 전송 함수 에러 발생 ==========')
    console.error('[DEBUG][email] 에러 타입:', error?.constructor?.name || typeof error)
    console.error('[DEBUG][email] 에러 메시지:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error('[DEBUG][email] 에러 스택:', error.stack)
    }
    throw error
  }
}
