<template>
  <div class="page-wrap">
    <CommonPageContainer
      header-bg-img="banner-inquiry.png"
      :tabItems="[
        { title: '제작의뢰', targetUrl: '/inquiry/ask' },
        { title: '자료실', targetUrl: '/inquiry/pds' },
      ]"
    >
      <NuxtPage />
    </CommonPageContainer>
  </div>
</template>
<script lang="ts" setup></script>
<style lang="scss"></style>
