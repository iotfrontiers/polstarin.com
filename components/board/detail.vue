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
        <div>{{ noticeInfo.author }}</div>
        <div class="d-flex">
          <div><VIcon icon="mdi-account-eye" class="mr-2" />{{ noticeInfo.viewCnt }}</div>
          <div class="ml-5"><VIcon icon="mdi-calendar-clock" class="mr-2" />{{ noticeInfo.date }}</div>
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
async function loadDetail() {
  await useLoadingTask(async () => {
    noticeInfo.value = await $fetch(`${props.apiUrl}/${route.params.id}.json`)

    $fetch('/api/notion-view-cnt-add', {
      params: {
        id: route.params.id,
      },
    })

    // noticeInfo.value = await $fetch(props.apiUrl, {
    //   params: {
    //     id: route.params.id,
    //     update: 'true',
    //   },
    // })

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
