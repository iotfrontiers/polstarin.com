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
    min-height: min(750px, max(100vw, 490px));
    background-image: url('~/assets/img/main/banner3.jpg');
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
        font-size: min(3.5rem, 7.5vw);
        font-weight: 900;
        line-height: 1.3;
        margin: 0 0 24px 0;
        text-shadow: 
          3px 3px 10px rgba(0, 0, 0, 0.8),
          0 0 20px rgba(0, 0, 0, 0.6),
          -2px -2px 6px rgba(0, 0, 0, 0.7);
        letter-spacing: -0.02em;
        color: #ffffff;
      }

      .main-sub {
        font-size: min(1.68rem, 3.84vw);
        font-weight: 500;
        line-height: 1.8;
        margin: 0;
        text-shadow: 
          2px 2px 8px rgba(0, 0, 0, 0.7),
          0 0 12px rgba(0, 0, 0, 0.5);
        color: #ffffff;
        letter-spacing: 0.01em;
      }
    }
  }
}
</style>
