<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <CommonLoading />
  </div>
</template>
<script setup lang="ts">
import '~/assets/main.scss'
import { onMounted } from 'vue'

// 모바일에서 데스크탑 레이아웃 자동 축소 설정
function setMobileViewport() {
  if (typeof window === 'undefined') return

  const desktopWidth = 1200 // 데스크탑 기준 너비
  const screenWidth = window.innerWidth || window.screen.width || window.screen.availWidth

  // 모바일 기기 감지 (1200px 미만)
  if (screenWidth < 1200) {
    // 화면 너비에 맞춰 자동 스케일 계산
    const initialScale = screenWidth / desktopWidth
    
    // 뷰포트 메타 태그 업데이트
    let viewport = document.querySelector('meta[name="viewport"]')
    if (!viewport) {
      viewport = document.createElement('meta')
      viewport.setAttribute('name', 'viewport')
      document.getElementsByTagName('head')[0].appendChild(viewport)
    }
    
    // 초기 스케일을 화면 크기에 맞춰 자동 설정
    viewport.setAttribute(
      'content',
      `width=${desktopWidth},initial-scale=${initialScale.toFixed(3)},minimum-scale=0.1,maximum-scale=5,user-scalable=yes`
    )
  }
}

// 즉시 실행 (DOMContentLoaded 이전에 실행되도록)
if (typeof window !== 'undefined') {
  // DOM이 준비되기 전에 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setMobileViewport()
    })
  } else {
    // 이미 로드된 경우 즉시 실행
    setMobileViewport()
  }
  
  // 페이지 로드 완료 후 한 번 더 실행
  window.addEventListener('load', () => {
    setMobileViewport()
  })
}

onMounted(() => {
  setMobileViewport()
  
  // 화면 회전 및 리사이즈 시에도 다시 설정
  window.addEventListener('resize', setMobileViewport)
  window.addEventListener('orientationchange', () => {
    setTimeout(setMobileViewport, 100)
  })
})
</script>
