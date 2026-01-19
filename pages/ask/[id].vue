<template>
  <VContainer class="ask-detail-container" :fluid="true">
    <VRow class="page-header-row" :style="{ backgroundImage: 'url(/img/banner-inquiry.png)' }">
      <MainHeader />
    </VRow>
    <VRow class="content-wrap">
      <div class="section">
        <div class="sub-title text-h3 font-weight-black mb-15">제작의뢰</div>
        <BoardDetail apiUrl="/api/ask-detail" listPageUrl="/ask" />
      </div>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
</script>

<style lang="scss">
.ask-detail-container {
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
