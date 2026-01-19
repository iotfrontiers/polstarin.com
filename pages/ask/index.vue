<template>
  <VContainer class="ask-list-container" :fluid="true">
    <VRow class="page-header-row" :style="{ backgroundImage: 'url(/img/banner-inquiry.png)' }">
      <MainHeader />
    </VRow>
    <VRow class="content-wrap">
      <div class="section">
        <div class="sub-title text-h3 font-weight-black mb-15">기술/견적문의</div>
        <div class="d-flex justify-space-between align-center mb-4">
          <div class="text-body-1 text-grey-darken-1">
            총 {{ totalCount }}개의 문의가 있습니다.
          </div>
          <VBtn color="primary" @click="$router.push('/ask/write')">
            <VIcon start>mdi-pencil</VIcon>
            문의 작성
          </VBtn>
        </div>
        <BoardList v-if="askList" :listData="askList" detailPageUrl="/ask/" />
        
        <!-- 페이지네이션 -->
        <div v-if="totalPages > 1" class="d-flex justify-center mt-6">
          <VPagination
            v-model="currentPage"
            :length="totalPages"
            :total-visible="7"
            @update:model-value="loadAskList"
          />
        </div>
      </div>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import type { NotionListResponse, NotionData } from '~/composables/notion'

const currentPage = ref(1)
const pageSize = ref(10)
const askList = ref<NotionListResponse<NotionData>>()
const totalCount = ref(0)
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

async function loadAskList() {
  await useLoadingTask(async () => {
    try {
      const response = await $fetch<{
        list: NotionData[]
        totalCount: number
        currentPage: number
        pageSize: number
        hasMore: boolean
        nextCursor?: string
        source?: string
      }>('/api/ask-list', {
        method: 'post',
        body: {
          page: currentPage.value,
          pageSize: pageSize.value,
          startCursor: askList.value?.nextCursor, // 노션 페이지네이션용
        },
      })

      askList.value = {
        list: response.list,
        nextCursor: response.nextCursor,
      }
      totalCount.value = response.totalCount || 0

      // 번호 매기기
      const startNo = (currentPage.value - 1) * pageSize.value + 1
      askList.value?.list?.forEach((row, index) => {
        row.num = startNo + index
      })
    } catch (e) {
      console.error('문의 목록 조회 오류:', e)
      alert(COMMON_MESSAGES.DATA_RETRIEVE_ERROR)
    }
  })
}

onMounted(() => loadAskList())
</script>

<style lang="scss">
.ask-list-container {
  padding-bottom: 0;

  .v-row.page-header-row {
    min-height: min(506px, 80vw);
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .content-wrap {
    height: auto;
    padding-bottom: 100px;
    padding-top: 90px;
    background-color: #fff;
    color: black;
  }

  .section {
    position: relative;
    width: 100%;
    max-width: 1300px;
    margin: 0 auto;
    padding: 0 10px;

    .sub-title {
      font-size: min(3rem, 10vw) !important;
    }
  }
}
</style>
