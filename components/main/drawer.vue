<template>
  <VNavigationDrawer color="#1e293b" v-model="showDrawer" location="right" temporary :width="300">
    <VToolbar density="compact" color="blue-lighten-1">
      <VAppBarNavIcon @click="showDrawer = false" style="color:#fff"></VAppBarNavIcon>
      <VToolbarTitle>Frontier Site Map</VToolbarTitle>
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

      <VListItem @click="movePage('/corp/portfolio')" prependIcon="mdi-format-list-checkbox">포트폴리오</VListItem>

      <VListGroup>
        <template v-slot:activator="{ props: prop }" value="2">
          <VListItem v-bind="prop" title="사업분야" density="compact" prependIcon="mdi-card-account-details-outline"></VListItem>
        </template>
        <VListItem @click="movePage('/field/display')" prependIcon="mdi-television">응용 LED 디스플레이</VListItem>
        <VListItem @click="movePage('/field/smart-factory')" prependIcon="mdi-factory">스마트팩토리(빌딩 자동화), 기계식 주차장</VListItem>
        <VListItem @click="movePage('/field/dev')" prependIcon="mdi-dev-to">개발(S/W & H/W)</VListItem>
        <VListItem @click="movePage('/field/out-sourcing')" prependIcon="mdi-account-search-outline">인력 아웃소싱 사업</VListItem>
      </VListGroup>

      <VListGroup>
        <template v-slot:activator="{ props: prop }">
          <VListItem v-bind="prop" title="커뮤니티" density="compact" prependIcon="mdi-account-group"></VListItem>
        </template>
        <VListItem @click="movePage('/community/notice')" prependIcon="mdi-bulletin-board">공지사항</VListItem>
        <VListItem @click="movePage('/community/news')" prependIcon="mdi-newspaper-variant-multiple-outline">News</VListItem>
        <VListItem @click="movePage('/community/education')" prependIcon="mdi-human-male-board">교육자료</VListItem>
        <VListItem @click="movePage('/inquiry/pds')" prependIcon="mdi-download-box-outline">자료실</VListItem>
      </VListGroup>

      <VListGroup>
        <template v-slot:activator="{ props: prop }">
          <VListItem v-bind="prop" title="문의사항" density="compact" prependIcon="mdi-phone-dial-outline"></VListItem>
        </template>
        <VListItem @click="movePage('/inquiry/ask')" prependIcon="mdi-file-document-edit">기술/견적문의</VListItem>
      </VListGroup>

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
