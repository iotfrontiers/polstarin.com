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
        <div class="font-weight-bold">{{ noticeInfo.author }}</div>
        <div v-if="noticeInfo.email" class="mt-1">
          <VIcon icon="mdi-email" size="small" class="mr-1" />
          <a :href="`mailto:${noticeInfo.email}`" class="text-decoration-none">{{ noticeInfo.email }}</a>
        </div>
        <div v-if="noticeInfo.contact" class="mt-1">
          <VIcon icon="mdi-phone" size="small" class="mr-1" />
          {{ noticeInfo.contact }}
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
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
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
