<template>
  <VDataTable
    theme="light"
    noDataText="조회된 데이터가 없습니다."
    :items="noticeData?.list"
    :itemsPerPage="pageSize"
    :itemsPerPageOptions="[]"
    selectStrategy="single"
    density="compact"
    :headers="headers"
  >
    <template #bottom></template>
    <template #item.title="{ value, item }">
      <NuxtLink :to="`${props.detailPageUrl}${item.id}`">{{ value }}</NuxtLink>
    </template>
    <template #item.author="{ value }">
      {{ maskName(value) }}
    </template>
    <template #item.date="{ value }">
      {{ formatDate(value) }}
    </template>
  </VDataTable>
</template>

<script setup lang="ts">
import type { NotionListResponse, NotionData } from '~/composables/notion'
import { useDisplay } from 'vuetify'

const props = withDefaults(
  defineProps<{
    listData: any
    detailPageUrl?: string
  }>(),
  {
    detailPageUrl: '/community/notice/',
  },
)

const currentPage = ref(1)
const pageSize = ref(100)
const noticeData = ref<NotionListResponse<NotionData>>()

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

function formatDate(dateString: string | undefined): string {
  if (!dateString) return ''
  
  try {
    // 디버깅: 입력값 확인
    console.log('[list.vue][DEBUG] formatDate 입력:', {
      dateString,
      dateStringType: typeof dateString,
      dateStringLength: dateString?.length,
    })
    
    const date = new Date(dateString)
    
    // 디버깅: Date 객체 생성 후 확인
    console.log('[list.vue][DEBUG] Date 객체 생성 후:', {
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
    console.log('[list.vue][DEBUG] formatDate 결과:', {
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
    console.error('[list.vue][DEBUG] formatDate 에러:', e, { dateString })
    return dateString
  }
}

function updateNoticeData() {
  if (!props.listData) {
    noticeData.value = undefined
    return
  }

  // props.listData가 ref인 경우 value를 가져옴
  const data = props.listData?.value || props.listData
  noticeData.value = data

  let startNo = pageSize.value * (currentPage.value - 1)
  noticeData.value?.list?.forEach(row => {
    row.num = ++startNo
  })
}

// props.listData가 변경될 때마다 업데이트
watch(() => props.listData, () => {
  updateNoticeData()
}, { immediate: true, deep: true })

onMounted(() => {
  updateNoticeData()
})

// for responsibiltiy
const { xs: mobile } = useDisplay()
const headers = computed(() => {
  return [
    {
      title: '번호',
      key: 'num',
      align: 'center',
      width: 80,
      sortable: false,
    },
    {
      title: '제목',
      key: 'title',
      sortable: false,
    },
    {
      title: '작성자',
      key: 'author',
      align: 'center',
      width: 100,
      sortable: false,
    },
    {
      title: '작성일',
      key: 'date',
      align: 'center',
      width: 150,
      sortable: false,
    },
  ].filter(header => (!mobile.value ? true : ['title'].includes(header.key)))
})
</script>

<style lang="scss">
.v-table {
  border-top: 3px solid #546e7a;
}
</style>
