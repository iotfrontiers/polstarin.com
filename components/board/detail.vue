<template>
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
    // 디버깅: 입력값 확인
    console.log('[detail.vue][DEBUG] formatDate 입력:', {
      dateString,
      dateStringType: typeof dateString,
      dateStringLength: dateString?.length,
    })
    
    const date = new Date(dateString)
    
    // 디버깅: Date 객체 생성 후 확인
    console.log('[detail.vue][DEBUG] Date 객체 생성 후:', {
      dateString,
      dateISO: date.toISOString(),
      dateUTC: date.toUTCString(),
      dateLocal: date.toString(),
      isValid: !isNaN(date.getTime()),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      utcYear: date.getUTCFullYear(),
      utcMonth: date.getUTCMonth() + 1,
      utcDay: date.getUTCDate(),
      utcHours: date.getUTCHours(),
      localYear: date.getFullYear(),
      localMonth: date.getMonth() + 1,
      localDay: date.getDate(),
      localHours: date.getHours(),
    })
    
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
    
    const formatted = `${year}-${month}-${day} ${hours}:${minutes}`
    
    // 디버깅: 최종 포맷된 결과
    console.log('[detail.vue][DEBUG] formatDate 결과:', {
      dateString,
      formatted,
      year,
      month,
      day,
      hours,
      minutes,
    })
    
    return formatted
  } catch (e) {
    console.error('[detail.vue][DEBUG] formatDate 에러:', e, { dateString })
    return dateString
  }
}

async function loadDetail() {
  await useLoadingTask(async () => {
    // API URL이 /api/로 시작하면 API 호출, 아니면 JSON 파일 읽기
    if (props.apiUrl?.startsWith('/api/')) {
      noticeInfo.value = await $fetch(props.apiUrl, {
        params: {
          id: route.params.id,
          update: 'true',
        },
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
    }
  })
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
</style>
