<template>
  <div class="detail-box" v-if="noticeInfo">
    <div class="d-flex flex-row-reverse">
      <VBtn icon="mdi-microsoft-xbox-controller-menu" theme="light" class="v-btn--blank" @click="() => $router.push('/portfolio')"></VBtn>
    </div>
    <div class="title">{{ noticeInfo.title }}</div>
    <div class="d-flex align-center mt-3">
      <VChipGroup class="ma-2">
        <VChip v-for="category in noticeInfo.categories">{{ category }}</VChip>
      </VChipGroup>
    </div>
    <VDivider class="mt-8 mb-8" />
    <CommonMarkdownViewer :content="noticeInfo.content" />
  </div>
  <div v-else></div>
</template>
<script lang="ts" setup>
import type { NotionData } from '~/composables/notion'

const route = useRoute()
const router = useRouter()
const noticeInfo = ref<NotionData>(null)
async function loadDetail() {
  await useLoadingTask(async () => {
    // noticeInfo.value = await $fetch('/api/portfolio', {
    //   params: {
    //     id: route.params.id,
    //     update: 'true',
    //   },
    // })

    noticeInfo.value = await $fetch(`/data/portfolio/${route.params.id}.json`)
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
