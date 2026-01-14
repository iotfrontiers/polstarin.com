<template>
  <VContainer :fluid="true" class="main-container">
    <VRow class="main-row">
      <MainHeader />
      <section class="banner-text text-white">
        <p>We are IT experts</p>
        <p class="logo"></p>
        <p style="line-height: 1.6">
          폴스타인는 숙련된 개발자의 개발, 제조경험과
          <br />
          노하우를 바탕으로 고객의 비지니스를 지원합니다.
          <br /><br />
          유능한 전문 업체를 만나 제품과 서비스를 완성하고, 고객의 이야기를 가치로 바꿔보세요.
        </p>
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
      font-size: 20px;
      margin-right: 5vw;

      p {
        margin: 5px 0;
        line-height: 25px;
        text-shadow: 2px 2px 4px gray;

        // &.title {
        //   font-weight: 900;
        //   font-size: 45px;
        //   margin: 20px 0;
        //   text-shadow: none;
        // }
        &.logo {
          width: 301px;
          height: 47px;
          background-image: url('/logo/logo-white.png');
          background-repeat: no-repeat;
          margin: 10px 0 25px;
        }
      }
    }
  }
}
</style>
