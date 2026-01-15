<template>
  <VRow class="business-row">
    <!-- <VCol class="left-col" cols="3"> -->
    <VCol class="left-col">
      <div class="section-title">포트폴리오</div>
      <div class="desc">
        <span class="text-grey-darken-2">대표 포트폴리오를 한눈에 확인하세요.</span>
      </div>
      <VRow class="buttons" align="center">
        <VCol>
          <VBtn @click="$router.push('/portfolio')">VIEW MORE</VBtn>
        </VCol>
      </VRow>
    </VCol>
    <VCol :cols="contentCols" class="portfolio-col">
      <div class="portfolio-grid">
          <VCard 
            v-for="item in mainPortfolioItems" 
            :key="item.id" 
            class="portfolio-card" 
            theme="light" 
            @click="$router.push(`/portfolio/${item.id}`)"
          >
          <VImg :src="item.imgUrl" height="200" cover />
          <VCardTitle class="portfolio-title">
            {{ item.title }}
          </VCardTitle>
        </VCard>
      </div>
    </VCol>
  </VRow>
</template>

<script setup>
import { useDisplay } from 'vuetify'
import portfolioJsonData from '~/data/portfolio.json'
import { computed, onMounted, onUnmounted, ref } from 'vue'

const display = useDisplay()

const contentCols = computed(() => (display.xs.value || display.sm.value ? 12 : 12))

const portfolioData = portfolioJsonData

function pickRandomUnique(list, count) {
  if (count <= 0) return []
  if (list.length <= count) return [...list]

  const copied = [...list]
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copied[i], copied[j]] = [copied[j], copied[i]]
  }
  return copied.slice(0, count)
}

// SSR hydration mismatch 방지:
// - 서버에서는 안정적으로 "앞 8개"를 렌더
// - 클라이언트 마운트 후 랜덤 8개로 교체
const mainPortfolioItems = ref((portfolioData?.list ?? []).slice(0, 8))

let refreshInterval = null

onMounted(() => {
  // 초기 랜덤 선택
  mainPortfolioItems.value = pickRandomUnique(portfolioData?.list ?? [], 8)
  
  // 5초마다 랜덤하게 갱신
  refreshInterval = setInterval(() => {
    mainPortfolioItems.value = pickRandomUnique(portfolioData?.list ?? [], 8)
  }, 5000) // 5초 = 5000ms
})

onUnmounted(() => {
  // 컴포넌트 언마운트 시 interval 정리
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
})
</script>

<style lang="scss">
.main-container {
  .v-row.business-row {
    background-color: #fff;
    color: #000;
    padding: min(70px, 5vw) 0 min(70px, 5vw) min(90px, 7vw);
    // padding: 70px 0 70px 95px;

    .left-col {
      // max-width: 300px;
      // margin-right: 100px;
      margin-right: min(100px, 6vw);
      min-width: 200px;
      margin-bottom: 20px;

      .section-title {
        // font-weight: 700;
        // font-size: 25px;
        font-size: 2rem;
        padding: 20px 0;
        border-bottom: 1px solid #000;
      }

      .desc {
        margin-top: 20px;
        font-size: 15px;
        line-height: 25px;
      }

      .buttons {
        margin-top: 50px;
      }
    }

    .portfolio-col {
      width: 100%;
    }

    .portfolio-grid {
      width: 100%;
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
    }

    .portfolio-card {
      cursor: pointer;
      border: 1px solid rgba(0, 0, 0, 0.06);
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.5s ease;
      height: 100%;
      display: flex;
      flex-direction: column;
      flex: 1 1 calc(25% - 15px); // 한 줄에 4개씩 표시 (gap 20px 고려)
      min-width: 200px;
      max-width: calc(25% - 15px);
      animation: fadeIn 0.5s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .portfolio-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
      border-color: #0066ff;
    }

    .portfolio-card .v-img {
      flex-shrink: 0;
      width: 100%;
      height: auto;
      aspect-ratio: 4 / 3;
      object-fit: cover;
    }

    .portfolio-title {
      padding: 12px 10px;
      font-size: clamp(12px, 1.2vw, 15px);
      font-weight: 600;
      line-height: 1.4;
      flex-grow: 1;
      display: flex;
      align-items: center;
      min-height: 50px;
      word-break: keep-all;
      overflow-wrap: break-word;
    }
  }
}
</style>
