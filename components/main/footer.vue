<template>
  <VFooter class="bg-grey-darken-4 d-flex flex-column align-stretch">
    <div class="pt-0 flex-1-1-100">
      <VDivider color="white mt-10 mb-3" :thickness="2" />

      POLSTARIN <span class="ml-1 mr-1">|</span> 대표전화 : <a href="tel:010-7607-4451">010-7607-4451</a> <span class="ml-1 mr-1">|</span> 팩스 :
      <a href="fax:0504-163-4451">0504-163-4451</a> <span class="ml-1 mr-1">|</span> 이메일 :
      <a href="mailto:jongju0920@kakao.com">jongju0920@kakao.com</a> <br />
      주소 : 경기도 의왕시 안양판교로 82 포일어울림센터 816호
    </div>
  </VFooter>
</template>
<script setup lang="ts"></script>
<style lang="scss">
footer.v-footer {
  padding: 0 95px 50px 95px;

  a {
    color: #fff;
    text-decoration: none;
  }

  @media (max-width: 630px) {
    padding: 0 3vw 50px 3vw;
  }
}
</style>
