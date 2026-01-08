<template>
  <VRow class="maps-wrap" no-gutters>
    <VCol class="mb-10">
      <span>경기도 의왕시 안양판교로 82 포일어울림센터 816호</span>
    </VCol>
    <VCol :cols="12" align="center">
      <div class="map-image-container">
        <img :src="mapImageSrc" alt="오시는 길 지도" class="map-image" />
      </div>
    </VCol>
  </VRow>
</template>
<script lang="ts" setup>
// 이미지 경로를 여기에 설정하세요
// 예: '/img/map.jpg'
const mapImageSrc = '/img/map.jpg'
</script>

<style lang="scss">
.maps-wrap {
  .map-image-container {
    width: 90%;
    max-width: 1200px;
    margin: 0 auto;

    .map-image {
      width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }
}
</style>
