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

      <VBtn @click="$router.push('/portfolio')" class="v-btn--blank gnb-menu-btn">포트폴리오</VBtn>

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
          <VListItem @click="$router.push('/community/pds')">자료실</VListItem>
        </VList>
      </VMenu>

      <VBtn @click="$router.push('/ask')" class="v-btn--blank gnb-menu-btn">기술/견적문의</VBtn>

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
    font-size: 23.4px;
    font-weight: 600;
    color: #ffffff !important;
    text-shadow: 
      1px 1px 2px rgba(0, 0, 0, 0.8),
      0 0 4px rgba(0, 0, 0, 0.5),
      -1px -1px 2px rgba(0, 0, 0, 0.8);
    letter-spacing: 0.5px;
    transition: all 0.2s ease;
  }

  .gnb-menu-btn:hover {
    text-shadow: 
      2px 2px 4px rgba(0, 0, 0, 0.9),
      0 0 6px rgba(0, 0, 0, 0.7),
      -2px -2px 4px rgba(0, 0, 0, 0.9);
    transform: translateY(-1px);
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
    filter: 
      drop-shadow(2px 2px 3px rgba(0, 0, 0, 0.9))
      drop-shadow(-2px -2px 3px rgba(0, 0, 0, 0.9))
      drop-shadow(2px -2px 3px rgba(0, 0, 0, 0.9))
      drop-shadow(-2px 2px 3px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 4px rgba(0, 0, 0, 0.7));
    transition: filter 0.2s ease;
  }

  .logo:hover {
    filter: 
      drop-shadow(3px 3px 4px rgba(0, 0, 0, 0.95))
      drop-shadow(-3px -3px 4px rgba(0, 0, 0, 0.95))
      drop-shadow(3px -3px 4px rgba(0, 0, 0, 0.95))
      drop-shadow(-3px 3px 4px rgba(0, 0, 0, 0.95))
      drop-shadow(0 0 6px rgba(0, 0, 0, 0.8));
  }

  .menus {
    gap: min(20px, 1vw);
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 12px 24px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

.overlay-menu {
  padding-left: 10px;
  padding-right: 10px;
  background-color: #1e293b !important;
}
</style>
