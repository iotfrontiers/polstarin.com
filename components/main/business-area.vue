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
          <VBtn @click="$router.push('/corp/portfolio')">VIEW MORE</VBtn>
        </VCol>
      </VRow>
    </VCol>
    <VCol :cols="contentCols" class="portfolio-col">
      <VRow class="portfolio-grid" dense>
        <VCol v-for="item in mainPortfolioItems" :key="item.id" cols="12" sm="6" lg="3" class="d-flex">
          <VCard class="portfolio-card flex-fill" theme="light" @click="$router.push(`/corp/portfolio/${item.id}`)">
            <VImg :src="item.imgUrl" height="200" cover />
            <VCardTitle class="portfolio-title">
              {{ item.title }}
            </VCardTitle>
          </VCard>
        </VCol>
      </VRow>
    </VCol>
  </VRow>
</template>

<script setup>
import { useDisplay } from 'vuetify'
import portfolioJsonData from '~/data/portfolio.json'
import { computed, onMounted, ref } from 'vue'

const display = useDisplay()

const contentCols = computed(() => (display.xs.value || display.sm.value ? 12 : display.md.value ? 11 : 9))

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
// - 서버에서는 안정적으로 "앞 4개"를 렌더
// - 클라이언트 마운트 후 랜덤 4개로 교체
const mainPortfolioItems = ref((portfolioData?.list ?? []).slice(0, 4))

onMounted(() => {
  mainPortfolioItems.value = pickRandomUnique(portfolioData?.list ?? [], 4)
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
      margin: 0;
    }

    .portfolio-card {
      cursor: pointer;
      border: 1px solid rgba(0, 0, 0, 0.06);
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }

    .portfolio-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
      border-color: #0066ff;
    }

    .portfolio-title {
      padding: 14px 12px;
      font-size: 16px;
      font-weight: 600;
      line-height: 1.3;
    }
  }
}
</style>
