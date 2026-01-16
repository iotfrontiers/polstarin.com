<template>
  <VNavigationDrawer color="#1e293b" v-model="showDrawer" location="right" temporary :width="300">
    <VToolbar density="compact" color="blue-lighten-1">
      <VAppBarNavIcon @click="showDrawer = false" style="color:#fff"></VAppBarNavIcon>
      <VToolbarTitle>POLSTARIN Site Map</VToolbarTitle>
    </VToolbar>
    <VList density="compact">
      <VListItem @click="movePage('/')" prependIcon="mdi-home-circle">Home</VListItem>
      <VListGroup>
        <template v-slot:activator="{ props: prop }" value="1">
          <VListItem v-bind="prop" title="기업소개" density="compact" prependIcon="mdi-domain"></VListItem>
        </template>
        <VListItem @click="movePage('/corp/introduce')" prependIcon="mdi-account-tie">인사말</VListItem>
        <VListItem @click="movePage('/corp/field')" prependIcon="mdi-office-building-marker-outline">사업영역</VListItem>
        <VListItem @click="movePage('/corp/client')" prependIcon="mdi-handshake-outline">고객사</VListItem>
        <VListItem @click="movePage('/corp/map')" prependIcon="mdi-map-marker-distance">오시는길</VListItem>
      </VListGroup>

      <VListItem @click="movePage('/portfolio')" prependIcon="mdi-format-list-checkbox">포트폴리오</VListItem>

      <VListGroup>
        <template v-slot:activator="{ props: prop }">
          <VListItem v-bind="prop" title="커뮤니티" density="compact" prependIcon="mdi-account-group"></VListItem>
        </template>
        <VListItem @click="movePage('/community/notice')" prependIcon="mdi-bulletin-board">공지사항</VListItem>
        <VListItem @click="movePage('/community/news')" prependIcon="mdi-newspaper-variant-multiple-outline">News</VListItem>
        <VListItem @click="movePage('/community/education')" prependIcon="mdi-human-male-board">교육자료</VListItem>
        <VListItem @click="movePage('/community/pds')" prependIcon="mdi-download-box-outline">자료실</VListItem>
      </VListGroup>

      <VListItem @click="movePage('/ask')" prependIcon="mdi-file-document-edit">기술/견적문의</VListItem>

      <VListGroup v-if="productIntroMenu.show">
        <template v-slot:activator="{ props: prop }">
          <VListItem v-bind="prop" title="제품소개" density="compact" prependIcon="mdi-package-variant-closed"></VListItem>
        </template>
        <VListItem v-for="menu in productIntroMenu.menus" @click="moveProductPage(menu.id, menu.linkUrl)" prependIcon="mdi-archive-search-outline">{{
          menu.title
        }}</VListItem>
      </VListGroup>
    </VList>
  </VNavigationDrawer>
</template>
<script lang="ts" setup>
const showDrawer = useMainDrawerOpenedState()
const router = useRouter()
const productIntroMenu = useProductIntroMenu()

function movePage(path: string) {
  router.push(path)
  showDrawer.value = false
}

function moveProductPage(id: string, linkUrl: string) {
  openProductionUrl(id, linkUrl)
  showDrawer.value = false
}
</script>
