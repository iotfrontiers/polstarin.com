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

function formatDate(dateString: string | undefined): string {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch (e) {
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
