<template>
  <VRow v-if="portfolioData?.list" style="padding: 10px" align="center" justify="center" justifyMd="start" class="portfolio-row">
    <VCol v-for="row in portfolioData?.list" :key="row.id" style="min-width: 300px; max-width: 320px" alignSelf="stretch" class="d-flex">
      <VCard theme="light" class="flex-fill" @click="() => $router.push(`/portfolio/${row.id}`)">
        <VImg :src="row.imgUrl" height="200px" cover />
        <VCardTitle style="padding: 20px 10px">
          {{ row.title }}
        </VCardTitle>
        <VChipGroup class="ma-2">
          <VChip v-for="category in row.categories">{{ category }}</VChip>
        </VChipGroup>
      </VCard>
    </VCol>
  </VRow>
</template>
<script lang="ts" setup>
import type { NotionListResponse, NotionData } from '~/composables/notion'
import portfolioJsonData from '~/data/portfolio.json'

const currentPage = ref(1)
const pageSize = ref(100)
const portfolioData = ref<NotionListResponse<NotionData>>()

async function load() {
  await useLoadingTask(async () => {
    try {
      // portfolioData.value = await $fetch('/api/portfolio-list', {
      //   method: 'post',
      //   body: {
      //     pageSize: pageSize.value,
      //   },
      // })
      portfolioData.value = portfolioJsonData

      let startNo = pageSize.value * (currentPage.value - 1)
      portfolioData.value?.list?.forEach(row => {
        row.num = ++startNo
      })
    } catch (e) {
      alert(COMMON_MESSAGES.DATA_RETRIEVE_ERROR)
    }
  })
}

load()
</script>
<style lang="scss">
.portfolio-row {
  .v-card {
    cursor: pointer;
  }
  .v-card:hover {
    border: 1px solid #0062ff;
    cursor: pointer;
  }
}
</style>
