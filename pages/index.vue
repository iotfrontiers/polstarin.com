<template>
  <VContainer :fluid="true" class="main-container">
    <VRow class="main-row">
      <MainHeader />
      <section class="banner-text text-white">
        <p class="main-message">아이디어만 가져오세요.<br />같이 고민하면 길이 보입니다.</p>
      </section>
    </VRow>
    <MainBusinessArea />
    <MainAboutUs />
    <MainHistory />
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
      top: min(380px, 30vw);
      left: min(95px, 5vw);
      margin-right: 5vw;
      max-width: 600px;

      .main-message {
        font-size: min(3.5rem, 8vw);
        font-weight: 700;
        line-height: 1.4;
        margin: 0;
        text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.5);
        letter-spacing: -0.02em;
      }
    }
  }
}
</style>
