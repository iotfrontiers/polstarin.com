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
            총 {{ askList?.list?.length || 0 }}개의 문의가 있습니다.
          </div>
          <VBtn color="primary" @click="$router.push('/ask/write')">
            <VIcon start>mdi-pencil</VIcon>
            문의 작성
          </VBtn>
        </div>
        <BoardList v-if="askList" :listData="askList" detailPageUrl="/ask/" />
      </div>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import type { NotionListResponse, NotionData } from '~/composables/notion'

const askList = ref<NotionListResponse<NotionData>>()

async function loadAskList() {
  await useLoadingTask(async () => {
    try {
      askList.value = await $fetch('/api/ask-list', {
        method: 'post',
        body: {
          pageSize: 100,
        },
      })

      let startNo = 1
      askList.value?.list?.forEach(row => {
        row.num = startNo++
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
