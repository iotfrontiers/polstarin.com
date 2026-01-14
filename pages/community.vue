<template>
  <div class="page-wrap">
    <CommonPageContainer
      header-bg-img="banner-commnity.png"
      :tabItems="[
        { title: '공지사항', targetUrl: '/community/notice' },
        { title: 'News', targetUrl: '/community/news' },
        { title: '교육자료', targetUrl: '/community/education' },
        { title: '자료실', targetUrl: '/community/pds' },
      ]"
    >
      <NuxtPage />
    </CommonPageContainer>
  </div>
</template>
<script lang="ts" setup></script>
<style lang="scss"></style>
