<template>
  <VRow class="about-us-row">
    <VCol :cols="12">
      <div class="section-title">About Us</div>
    </VCol>
    <VCol :cols="12">
      <div class="sub-title">이야기를 가치로 만듭니다.</div>
    </VCol>
    <VCol :cols="12" style="padding-top: 0">
      <div class="desc">
        폴스타인 숙련된 개발자의 개발, 제조 경험과 노하우를 바탕으로 고객의 비지니스를 지원합니다.<br />
        유능한 전문 업체를 만나 제품과 서비스를 완성 하세요. 고객의 이야기를 가치로 바꿔드립니다.
      </div>
    </VCol>
  </VRow>
</template>
<style lang="scss">
.main-container {
  .about-us-row {
    min-height: 334px;
    background: url('~/assets/img/main/about-bg.png');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    position: relative;

    flex-direction: column;
    // padding-left: 95px;
    // padding-top: 40px;

    padding-left: min(95px, 5vw);
    padding-top: min(40px, 3vw);
    color: #fff;

    .desc {
      color: #fff;
    }

    .section-title {
      // font-size: 32px;
      // font-weight: 600;
      max-width: 250px;
      padding-bottom: 10px;
      border-bottom: 1px solid #fff;
      text-shadow: 2px 2px 4px gray;
      color: #fff;
    }

    .sub-title {
      font-size: 22px;
      font-weight: 500;
      margin: 0;
      color: #fff;
    }
  }
}
</style>
