<template>
  <BoardList :listData="pdsList" detailPageUrl="/community/pds/" />
</template>
<script setup lang="ts">
import pdsList from '~/data/pds.json'
</script>
