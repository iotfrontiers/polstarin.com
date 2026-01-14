<template>
  <div class="page-wrap">
    <CommonPageContainer
      header-bg-img="banner-corp.png"
      :tabItems="[
        { title: '인사말', targetUrl: '/corp/introduce' },
        { title: '사업영역', targetUrl: '/corp/field' },
        { title: '포트폴리오', targetUrl: '/corp/portfolio' },
        { title: '고객사', targetUrl: '/corp/client' },
        { title: '오시는길', targetUrl: '/corp/map' },
      ]"
    >
      <NuxtPage />
    </CommonPageContainer>
  </div>
</template>
<script lang="ts" setup></script>
<style lang="scss"></style>
