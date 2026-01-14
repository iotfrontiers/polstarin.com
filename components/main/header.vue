<template>
  <div class="top-menu d-flex justify-space-between flex-grow-1 align-center">
    <div class="logo" @click="() => logoClick()"></div>
    <div class="d-flex justify-space-between menus align-center">
      <VMenu transition="scroll-y-transition">
        <template v-slot:activator="{ props }">
          <VBtn v-bind="props" class="v-btn--blank gnb-menu-btn">기업소개</VBtn>
        </template>
        <VList class="overlay-menu">
          <VListItem @click="$router.push('/corp/introduce')">인사말</VListItem>
          <VListItem @click="$router.push('/corp/field')">사업영역</VListItem>
          <VListItem @click="$router.push('/corp/client')">고객사</VListItem>
          <VListItem @click="$router.push('/corp/map')">오시는길</VListItem>
        </VList>
      </VMenu>

      <VBtn @click="$router.push('/corp/portfolio')" class="v-btn--blank gnb-menu-btn">포트폴리오</VBtn>

      <VMenu transition="scroll-y-transition">
        <template v-slot:activator="{ props }">
          <VBtn v-bind="props" class="v-btn--blank gnb-menu-btn">사업분야</VBtn>
        </template>
        <VList class="overlay-menu">
          <VListItem @click="$router.push('/field/display')">응용 LED 디스플레이</VListItem>
          <VListItem @click="$router.push('/field/smart-factory')">스마트팩토리(빌딩 자동화), 기계식 주차장</VListItem>
          <VListItem @click="$router.push('/field/dev')">개발(S/W & H/W)</VListItem>
          <VListItem @click="$router.push('/field/out-sourcing')">인력 아웃소싱 사업</VListItem>
        </VList>
      </VMenu>

      <VMenu transition="scroll-y-transition">
        <template v-slot:activator="{ props }">
          <VBtn v-bind="props" class="v-btn--blank gnb-menu-btn">커뮤니티</VBtn>
        </template>
        <VList class="overlay-menu">
          <VListItem @click="$router.push('/community/notice')">공지사항</VListItem>
          <VListItem @click="$router.push('/community/news')">News</VListItem>
          <VListItem @click="$router.push('/community/education')">교육자료</VListItem>
          <VListItem @click="$router.push('/inquiry/pds')">자료실</VListItem>
        </VList>
      </VMenu>

      <VBtn @click="$router.push('/inquiry/ask')" class="v-btn--blank gnb-menu-btn">기술/견적문의</VBtn>

      <VMenu transition="scroll-y-transition" v-if="productIntroMenu.show">
        <template v-slot:activator="{ props }">
          <VBtn v-bind="props" class="v-btn--blank gnb-menu-btn">제품소개</VBtn>
        </template>
        <VList class="overlay-menu">
          <VListItem @click="openProductionUrl(menu.id, menu.linkUrl)" v-for="menu in productIntroMenu.menus" :key="menu.id">{{
            menu.title
          }}</VListItem>
        </VList>
      </VMenu>

      <VBtn icon="mdi-menu" style="margin-right: 20px;color:#fff" @click="() => (showDrawer = !showDrawer)" class="v-btn--blank"></VBtn>
    </div>
  </div>
</template>
<script setup lang="ts">
import { openProductionUrl } from '#imports'

const showDrawer = useMainDrawerOpenedState()
const router = useRouter()
const productIntroMenu = useProductIntroMenu()

function logoClick() {
  router.push('/')
  showDrawer.value = false
}
</script>
<style lang="scss">
.top-menu {
  // margin: 54px 0 0 95px;
  margin: min(4vw, 54px) 0 0 min(2vw, 95px);
  max-height: 50px;
  min-height: 50px;
  font-weight: 600;

  .gnb-menu-btn {
    font-size: 16px;
  }

  @media screen and (max-width: 700px) {
    .gnb-menu-btn {
      display: none;
    }
  }

  .logo {
    width: 100%;
    height: 100%;
    background-image: url('/logo/logo-white.png');
    background-repeat: no-repeat;
    background-size: 14rem;
    background-position-y: center;
    cursor: pointer;
  }

  .menus {
    // gap: 20px;
    gap: min(20px, 1vw);
  }
}

.overlay-menu {
  padding-left: 10px;
  padding-right: 10px;
  background-color: #1e293b !important;
}
</style>
