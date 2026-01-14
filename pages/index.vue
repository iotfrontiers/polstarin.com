<template>
  <VContainer :fluid="true" class="main-container">
    <VRow class="main-row">
      <MainHeader />
      <section class="banner-text text-white">
        <p class="main-title">아이디어를 가치로 만듭니다.</p>
        <p class="main-sub">
          폴스타인 숙련된 개발자의 개발, 제조 경험과 노하우를 바탕으로 고객의 비지니스를 지원합니다.<br />
          유능한 전문 업체를 만나 제품과 서비스를 완성 하세요.
        </p>
      </section>
    </VRow>
    <MainBusinessArea />
    <MainNotice />
  </VContainer>
</template>
<script setup lang="ts"></script>
<style lang="scss">
.main-container {
  margin: 0;
  padding-bottom: 0;

  .v-row.main-row {
    min-height: min(1080px, max(100vw, 700px));
    background-image: url('~/assets/img/main/banner-top.png');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    position: relative;

    .banner-text {
      position: absolute;
      top: min(360px, 28vw);
      left: min(95px, 5vw);
      margin-right: 5vw;
      max-width: 620px;

      .main-title {
        font-size: min(3rem, 6.5vw);
        font-weight: 800;
        line-height: 1.3;
        margin: 0 0 16px 0;
        text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.5);
        letter-spacing: -0.03em;
      }

      .main-sub {
        font-size: min(1.1rem, 2.6vw);
        font-weight: 400;
        line-height: 1.7;
        margin: 0;
        text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.45);
      }
    }
  }
}
</style>
