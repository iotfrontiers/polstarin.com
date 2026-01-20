<template>
  <!-- 비밀번호 입력 다이얼로그 -->
  <VDialog v-model="passwordDialog" max-width="400" persistent>
    <VCard>
      <VCardTitle>비밀번호 입력</VCardTitle>
      <VCardText>
        <div class="mb-3 password-instruction">
          <div>이 글은 비밀번호가 설정되어 있습니다.</div>
          <div>비밀번호를 입력해주세요.</div>
        </div>
        <VTextField
          v-model="inputPassword"
          type="password"
          label="비밀번호"
          placeholder="영문, 숫자 4자"
          maxlength="4"
          variant="outlined"
          density="compact"
          @keyup.enter="checkPassword"
          autofocus
          :error="!!passwordError"
          :error-messages="passwordError ? [passwordError] : []"
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn @click="checkPassword" color="primary">확인</VBtn>
        <VBtn @click="cancelPassword" variant="text">취소</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <div class="detail-box" v-if="noticeInfo">
    <div class="d-flex flex-row-reverse">
      <VBtn icon="mdi-microsoft-xbox-controller-menu" theme="light" class="v-btn--blank" @click="() => $router.push(props.listPageUrl)"></VBtn>
    </div>
    <div class="title">{{ noticeInfo.title }}</div>
    <div class="d-flex align-center mt-3">
      <VAvatar color="grey" :size="70">
        <VIcon :size="70">mdi-account-circle</VIcon>
      </VAvatar>
      <div class="ml-4 d-flex flex-column profile">
        <div class="font-weight-bold">{{ maskName(noticeInfo.author) }}</div>
        <div v-if="noticeInfo.email" class="mt-1">
          <VIcon icon="mdi-email" size="small" class="mr-1" />
          <a :href="`mailto:${noticeInfo.email}`" class="text-decoration-none">{{ maskEmail(noticeInfo.email) }}</a>
        </div>
        <div v-if="noticeInfo.contact" class="mt-1">
          <VIcon icon="mdi-phone" size="small" class="mr-1" />
          {{ maskPhone(noticeInfo.contact) }}
        </div>
        <div class="d-flex mt-2">
          <div><VIcon icon="mdi-calendar-clock" class="mr-2" size="small" />{{ formatDate(noticeInfo.date) }}</div>
        </div>
      </div>
    </div>
    <VDivider class="mt-8 mb-8" />
    <CommonMarkdownViewer :content="noticeInfo.content" />
  </div>
  <div v-else></div>
</template>
<script lang="ts" setup>
import type { NotionData } from '~/composables/notion'

const props = withDefaults(
  defineProps<{
    apiUrl?: string
    listPageUrl?: string
  }>(),
  {
    apiUrl: '/data/notice',
    listPageUrl: '/community/notice',
  },
)

const route = useRoute()
const router = useRouter()
const noticeInfo = ref<NotionData>(null)
const passwordDialog = ref(false)
const inputPassword = ref('')
const passwordError = ref('')

/**
 * 이름 마스킹 (첫 글자만 보이고 나머지는 *)
 * 예: "김현수" → "김**"
 */
function maskName(name: string | undefined): string {
  if (!name) return ''
  if (name.length <= 1) return name
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 1)
}

/**
 * 이메일 마스킹 (@ 앞 부분 일부만 보이고 나머지는 *)
 * 예: "hskim.maint@yeongnam-jg.example" → "hsk***@yeongnam-jg.example"
 */
function maskEmail(email: string | undefined): string {
  if (!email) return ''
  const atIndex = email.indexOf('@')
  if (atIndex === -1) return email
  
  const localPart = email.substring(0, atIndex)
  const domainPart = email.substring(atIndex)
  
  if (localPart.length <= 3) {
    return '*'.repeat(localPart.length) + domainPart
  }
  
  return localPart.substring(0, 3) + '*'.repeat(localPart.length - 3) + domainPart
}

/**
 * 전화번호 마스킹 (중간 4자리만 *)
 * 예: "010-8934-2716" → "010-****-2716"
 * 예: "01089342716" → "010****2716"
 */
function maskPhone(phone: string | undefined): string {
  if (!phone) return ''
  
  // 하이픈 제거
  const digitsOnly = phone.replace(/[^0-9]/g, '')
  
  if (digitsOnly.length < 7) return phone
  
  // 전화번호 형식에 따라 마스킹
  if (digitsOnly.length === 10) {
    // 010-1234-5678 형식
    return digitsOnly.substring(0, 3) + '-' + '*'.repeat(4) + '-' + digitsOnly.substring(7)
  } else if (digitsOnly.length === 11) {
    // 010-1234-5678 형식 (11자리)
    return digitsOnly.substring(0, 3) + '-' + '*'.repeat(4) + '-' + digitsOnly.substring(7)
  } else {
    // 기타 형식: 중간 부분 마스킹
    const start = digitsOnly.substring(0, 3)
    const end = digitsOnly.substring(digitsOnly.length - 4)
    const middle = '*'.repeat(digitsOnly.length - 7)
    return start + middle + end
  }
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    
    if (isNaN(date.getTime())) return dateString
    
    // KST 시간 추출 (+09:00 offset 포함 ISO 문자열에서)
    // "+09:00" 형식이면 자동으로 파싱되며, getUTC* 메서드로 원본 시간 추출 가능
    // 또는 ISO 문자열에서 직접 파싱
    let year, month, day, hours, minutes
    
    if (dateString.includes('+09:00')) {
      // KST 시간이면 UTC 메서드로 원본 시간 추출
      year = date.getUTCFullYear()
      month = String(date.getUTCMonth() + 1).padStart(2, '0')
      day = String(date.getUTCDate()).padStart(2, '0')
      hours = String(date.getUTCHours()).padStart(2, '0')
      minutes = String(date.getUTCMinutes()).padStart(2, '0')
    } else if (dateString.endsWith('Z')) {
      // UTC 시간이면 (기존 데이터 호환성)
      year = date.getUTCFullYear()
      month = String(date.getUTCMonth() + 1).padStart(2, '0')
      day = String(date.getUTCDate()).padStart(2, '0')
      hours = String(date.getUTCHours()).padStart(2, '0')
      minutes = String(date.getUTCMinutes()).padStart(2, '0')
    } else {
      // 기타 형식은 로컬 시간대 사용
      year = date.getFullYear()
      month = String(date.getMonth() + 1).padStart(2, '0')
      day = String(date.getDate()).padStart(2, '0')
      hours = String(date.getHours()).padStart(2, '0')
      minutes = String(date.getMinutes()).padStart(2, '0')
    }
    
    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch (e) {
    return dateString
  }
}

async function loadDetail(password?: string) {
  await useLoadingTask(async () => {
    try {
      // API URL이 /api/로 시작하면 API 호출, 아니면 JSON 파일 읽기
      if (props.apiUrl?.startsWith('/api/')) {
        const params: any = {
          id: route.params.id,
          update: 'true',
        }
        if (password) {
          params.password = password
        }
        
        noticeInfo.value = await $fetch(props.apiUrl, {
          params,
        })
      } else {
        noticeInfo.value = await $fetch(`${props.apiUrl}/${route.params.id}.json`)

        $fetch('/api/notion-view-cnt-add', {
          params: {
            id: route.params.id,
          },
        })
      }

      if (!noticeInfo.value) {
        alert(COMMON_MESSAGES.DATA_NOT_FOUND_ERROR)
        router.back()
      } else {
        // 성공적으로 로드되면 비밀번호 다이얼로그 닫기
        passwordDialog.value = false
        passwordError.value = ''
        inputPassword.value = ''
      }
    } catch (error: any) {
      // 401 에러면 비밀번호가 필요한 경우
      if (error?.statusCode === 401 || error?.data?.statusCode === 401) {
        // 비밀번호를 입력한 경우 (재시도)
        if (password) {
          passwordError.value = error?.message || '비밀번호가 일치하지 않습니다.'
          // 입력 필드 포커스 및 선택
          await nextTick()
          const input = document.querySelector('.v-text-field input[type="password"]') as HTMLInputElement
          if (input) {
            input.focus()
            input.select()
          }
        } else {
          // 첫 번째 호출 시 비밀번호 다이얼로그 열기
          passwordDialog.value = true
          passwordError.value = ''
          inputPassword.value = ''
          await nextTick()
          const input = document.querySelector('.v-text-field input[type="password"]') as HTMLInputElement
          if (input) {
            input.focus()
          }
        }
      } else {
        alert(COMMON_MESSAGES.DATA_NOT_FOUND_ERROR)
        router.back()
      }
    }
  })
}

async function checkPassword() {
  if (!inputPassword.value || inputPassword.value.length !== 4) {
    passwordError.value = '비밀번호는 4자리여야 합니다.'
    return
  }
  
  if (!/^[A-Za-z0-9]{4}$/.test(inputPassword.value)) {
    passwordError.value = '영문과 숫자만 입력 가능합니다.'
    return
  }
  
  passwordError.value = ''
  await loadDetail(inputPassword.value)
}

function cancelPassword() {
  passwordDialog.value = false
  inputPassword.value = ''
  passwordError.value = ''
  router.push(props.listPageUrl)
}

onMounted(() => loadDetail())
</script>
<style lang="scss">
.detail-box {
  border-top: 3px solid #546e7a;
  padding-top: 10px;
  padding-left: 10px;

  .title {
    font-size: 1.6rem;
    font-weight: bold;
    margin-left: 10px;
  }

  .profile {
    font-size: 1rem;
  }
}

.password-instruction {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.87) !important;
  
  div {
    margin-bottom: 4px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
}
</style>
