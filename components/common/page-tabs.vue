<template>
  <div class="d-flex tabs align-stretch">
    <div
      v-for="(item, idx) in props.items"
      :key="idx"
      :class="{
        active: selectedIndex === idx,
      }"
      class="flex-1-1-100 tab d-flex align-center justify-center"
      @click="itemClicked(item)"
    >
      <span>{{ item.title }}</span>
    </div>
  </div>
</template>
<script lang="ts">
export interface Tab {
  /**
   * 표시 제목
   */
  title: string

  /**
   * 대상 URL
   */
  targetUrl: string

  /**
   * 페이지 이동 전 전처리
   * false를 반환할 경우 커스톰 처리를 수행한다.
   */
  beforeRoute?: (tab: Tab) => void | boolean
}
</script>
<script setup lang="ts">
const props = defineProps<{
  items: Tab[]
}>()

const emit = defineEmits<{
  (e: 'click:menuItem', menu: Tab): void
}>()

const selectedIndex = ref(-1)

const route = useRoute()
onMounted(() => {
  selectdIndex()
})

function selectdIndex() {
  if (props.items) {
    const sameRouteIndex = props.items.findIndex(i => i.targetUrl === route.path || route.path.startsWith(i.targetUrl))
    if (sameRouteIndex > -1) {
      selectedIndex.value = sameRouteIndex

      emit('click:menuItem', props.items[selectedIndex.value < 0 ? 0 : selectedIndex.value])

      return
    }

    selectedIndex.value = -1
  }
}

const itemClicked = (item: Tab) => {
  if (item.beforeRoute) {
    const result = item.beforeRoute(item)
    if (result === false) {
      return
    }
  }

  useRouter()
    .push(item.targetUrl)
    .then(() => selectdIndex())
}

watch(
  () => route.fullPath,
  () => {
    nextTick(() => selectdIndex())
  },
)
</script>
<style lang="scss">
.tabs {
  width: 100%;
  height: 70px;
  background: rgba(0, 0, 0, 0.15);
}

.tabs .tab {
  text-align: center;
  cursor: pointer;
  font-size: min(1.2rem, max(4vw, 10px));
  font-weight: 500;
  // white-space: nowrap;
  text-transform: none;
  text-overflow: ellipsis;
  line-height: calc(min(1.2rem, max(3.5vw, 8px)) + 2px);
  padding: 0 4px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  &.active {
    background-color: #fff;
    color: #000;
  }
}
</style>
