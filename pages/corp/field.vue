<template>
  <div :class="{ 'pa-10': !mobile, 'pa-2': mobile }" style="width: 100%">
    <!-- Hero Section -->
    <section class="hero-section">
      <h1 class="hero-title">SERVICE AREAS</h1>
      <p class="hero-subtitle">폴스타인의 핵심 사업 영역을 소개합니다</p>
      <div class="divider"></div>
    </section>

    <!-- Services Grid -->
    <div class="services-grid">
      <!-- Service 1: S/W 개발 -->
      <VCard class="service-card">
        <div class="icon-wrapper">
          <i class="fa-solid fa-laptop-code"></i>
        </div>
        <VCardTitle class="service-title">S/W 개발</VCardTitle>
        <VCardText class="service-description">
          <p>
            <strong>웹/앱 개발:</strong> HTML을 통한 WEB 개발 및 Android, iOS 개발을 통한 APP 개발 및 서비스 오픈 대응<br>
            <strong>임베디드 소프트웨어:</strong> 임베디드 리눅스 펌웨어 개발, 실시간 OS(RTOS) 기반 시스템 구축<br>
            <strong>하드웨어 연동:</strong> 센서/액추에이터 제어, 통신 프로토콜(UART, SPI, I2C) 구현, 디바이스 드라이버 개발<br>
            사용자 중심의 UX/UI와 하드웨어 최적화를 고려한 통합 소프트웨어 솔루션을 제공합니다.
          </p>
        </VCardText>
      </VCard>

      <!-- Service 2: H/W 개발 -->
      <VCard class="service-card">
        <div class="icon-wrapper">
          <i class="fa-solid fa-microchip"></i>
        </div>
        <VCardTitle class="service-title">H/W 개발</VCardTitle>
        <VCardText class="service-description">
          <p>
            회로설계부터 ARTWORK 설계를 통한 PCB 보드 개발 및 제작. 펌웨어(Firmware) 개발을 통해 시스템 적용 및 정밀한
            디버깅을 진행합니다.
          </p>
        </VCardText>
      </VCard>

      <!-- Service 3: 제품 디자인 & UX/UI -->
      <VCard class="service-card">
        <div class="icon-wrapper">
          <i class="fa-solid fa-pen-ruler"></i>
        </div>
        <VCardTitle class="service-title">제품 디자인 & UX/UI</VCardTitle>
        <VCardText class="service-description">
          <p>
            제품 제작을 위한 초기 2D 스케치부터 3D 모델링, 그리고 WEB/APP 사용성을 극대화하는 직관적인 UX/UI 디자인을
            제공합니다.
          </p>
        </VCardText>
      </VCard>

      <!-- Service 4: 3D 기구설계 및 외형제작 -->
      <VCard class="service-card">
        <div class="icon-wrapper">
          <i class="fa-solid fa-cube"></i>
        </div>
        <VCardTitle class="service-title">3D 기구설계 및 외형제작</VCardTitle>
        <VCardText class="service-description">
          <p>
            전문 3D 설계 툴(SOLIDWORKS)을 활용한 정밀 설계. 제작 전 사전 시뮬레이션을 통해 경제적이고 신속하게 제품을
            제작합니다.
          </p>
        </VCardText>
      </VCard>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useDisplay } from 'vuetify'

const { mobile } = useDisplay()
</script>
<style lang="scss">
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

// Hero Section
.hero-section {
  text-align: center;
  margin-bottom: 3rem;

  .hero-title {
    font-size: 2.5rem;
    font-weight: 800;
    color: #1e293b;
    margin-bottom: 1rem;
    letter-spacing: -0.03em;
  }

  .hero-subtitle {
    color: #64748b;
    font-size: 1.1rem;
    max-width: 600px;
    margin: 0 auto 1.5rem;
  }

  .divider {
    width: 60px;
    height: 4px;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    margin: 0 auto;
    border-radius: 2px;
  }
}

// Services Grid
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

// Service Card
.service-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 3rem 2.5rem;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  border: 1px solid rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  height: 100%;

  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 20px 40px rgba(37, 99, 235, 0.1);
    border-color: rgba(37, 99, 235, 0.2);

    .icon-wrapper {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      transform: scale(1.1) rotate(-5deg);

      i {
        color: #ffffff;
      }
    }

    &::after {
      width: 200px;
      height: 200px;
      background: radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, rgba(255, 255, 255, 0) 70%);
    }
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 100px;
    height: 100px;
    background: radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, rgba(255, 255, 255, 0) 70%);
    border-radius: 0 0 0 100%;
    transition: width 0.3s ease, height 0.3s ease;
  }
}

.icon-wrapper {
  width: 70px;
  height: 70px;
  border-radius: 16px;
  background: rgba(37, 99, 235, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;

  i {
    font-size: 1.8rem;
    color: #2563eb;
    transition: color 0.3s ease;
  }
}

.service-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1rem;
  padding: 0;
}

.service-description {
  color: #64748b;
  line-height: 1.8;
  font-size: 0.95rem;
  padding: 0;
  flex-grow: 1;

  p {
    margin: 0;

    strong {
      color: #1e293b;
      font-weight: 600;
      display: inline-block;
      margin-top: 0.5rem;

      &:first-child {
        margin-top: 0;
      }
    }
  }
}

// Responsive
@media (max-width: 768px) {
  .hero-section {
    .hero-title {
      font-size: 2rem;
    }
  }

  .services-grid {
    grid-template-columns: 1fr;
  }

  .service-card {
    padding: 2rem;
  }
}
</style>
