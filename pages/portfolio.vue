<template>
  <VContainer class="portfolio-page-container" :fluid="true">
    <VRow class="page-header-row" :style="{ backgroundImage: 'url(/img/banner-portfolio.png)' }">
      <MainHeader />
      <div class="header-title-overlay">
        <h1 class="page-title">포트폴리오</h1>
      </div>
    </VRow>
    <VRow class="content-wrap">
      <div class="section">
        <NuxtPage />
      </div>
    </VRow>
  </VContainer>
</template>
<script lang="ts" setup></script>
<style lang="scss">
.portfolio-page-container {
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

  .header-title-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
    text-align: center;

    .page-title {
      font-size: min(4.5rem, 12vw);
      font-weight: 900;
      color: #ffffff;
      text-shadow: 
        4px 4px 15px rgba(0, 0, 0, 0.9),
        0 0 30px rgba(0, 0, 0, 0.8),
        -3px -3px 10px rgba(0, 0, 0, 0.9);
      margin: 0;
      letter-spacing: -0.02em;
      -webkit-text-stroke: 1px rgba(0, 0, 0, 0.4);
    }
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

    img {
      max-width: 100%;
    }
  }
}
</style>
