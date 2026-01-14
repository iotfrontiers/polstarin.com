<template>
  <div class="clients-page">
    <div class="container">
      <!-- Header -->
      <header class="header fade-in">
        <span class="header-subtitle">Our Clients</span>
        <h1 class="header-title">고객사</h1>
        <p class="header-desc">함께 성장하는 파트너</p>
      </header>

      <!-- Stats Section -->
      <section class="stats-grid fade-in delay-1" aria-label="고객사 성과 지표">
        <div class="stat-card">
          <span class="stat-number">150+</span>
          <span class="stat-label">테크 스타트업</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">80+</span>
          <span class="stat-label">대기업</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">250+</span>
          <span class="stat-label">제품 개발</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">15+</span>
          <span class="stat-label">양산 연계</span>
        </div>
      </section>

      <!-- Intro Text -->
      <section class="intro-section fade-in delay-2" aria-label="소개">
        <p class="intro-text">
          우리는 스타트업, 중소기업, 대기업 등 다양한 고객사와 함께<br />
          혁신적인 솔루션을 만들어가고 있습니다.
        </p>
      </section>

      <!-- Logo Grid -->
      <section class="clients-section fade-in delay-3" aria-label="주요 고객사">
        <h2 class="section-title">주요 고객사</h2>
        <div class="logo-grid">
          <div class="logo-card" v-for="name in clientNames" :key="name">
            <span class="logo-text">{{ name }}</span>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="features-section fade-in delay-3" aria-label="강점">
        <div class="features-header">
          <h2 class="section-title" style="margin-bottom: 10px">신뢰할 수 있는 파트너</h2>
          <p class="features-subtitle">고객의 성공을 위해 최선을 다합니다</p>
        </div>

        <div class="features-grid">
          <div class="feature-card">
            <span class="feature-icon">🎯</span>
            <h3 class="feature-title">검증된 기술력</h3>
            <p class="feature-desc">최신 기술 스택을 활용한<br />안정적이고 확장 가능한 개발</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">⚙️</span>
            <h3 class="feature-title">체계적인 프로세스</h3>
            <p class="feature-desc">애자일 방법론 기반의<br />투명하고 효율적인 협업</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🛠️</span>
            <h3 class="feature-title">지속적인 지원</h3>
            <p class="feature-desc">런칭 후에도 꾸준한<br />유지보수와 정기 업데이트</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
<script setup lang="ts">
const clientNames = [
  '현대자동차',
  'LG전자',
  'LG U+',
  '삼성전자',
  '한국전자통신연구원',
  '중소기업청',
  '중소벤처기업진흥공단',
  '네이버',
  '카카오',
  '쿠팡',
  '토스',
  '배달의민족',
  '서울대학교',
  '연세대학교',
  '울산과학기술원',
  'SK텔레콤',
]
</script>
<style lang="scss" scoped>
.clients-page {
  --primary-color: #0066ff;
  --secondary-color: #6b7280;
  --text-main: #1f2937;
  --text-sub: #6b7280;
  --bg-color: #ffffff;
  --bg-secondary: #f9fafb;
  --border-color: #e5e7eb;

  color: var(--text-main);
  background-color: var(--bg-color);

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 80px 20px;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .fade-in {
    animation: fadeIn 0.8s ease-out forwards;
  }

  .delay-1 {
    animation-delay: 0.1s;
  }
  .delay-2 {
    animation-delay: 0.2s;
  }
  .delay-3 {
    animation-delay: 0.3s;
  }

  .header {
    text-align: center;
    margin-bottom: 60px;
  }

  .header-subtitle {
    font-size: 14px;
    font-weight: 700;
    color: var(--primary-color);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 12px;
    display: block;
  }

  .header-title {
    font-size: 42px;
    font-weight: 700;
    margin: 0 0 16px 0;
    color: var(--text-main);
  }

  .header-desc {
    font-size: 20px;
    color: var(--text-sub);
    font-weight: 300;
    margin: 0;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    margin-bottom: 80px;
  }

  .stat-card {
    background: white;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 32px 20px;
    text-align: center;
    transition: all 0.3s ease;
  }

  .stat-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
    border-color: var(--primary-color);
  }

  .stat-number {
    display: block;
    font-size: 36px;
    font-weight: 700;
    color: var(--primary-color);
    margin-bottom: 8px;
    line-height: 1.2;
  }

  .stat-label {
    font-size: 15px;
    color: var(--text-sub);
    font-weight: 500;
  }

  .intro-section {
    text-align: center;
    max-width: 800px;
    margin: 0 auto 80px auto;
    padding: 40px;
    background-color: var(--bg-secondary);
    border-radius: 16px;
  }

  .intro-text {
    font-size: 18px;
    color: var(--text-main);
    font-weight: 400;
    margin: 0;
  }

  .clients-section {
    margin-bottom: 100px;
  }

  .section-title {
    text-align: center;
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 40px;
    color: var(--text-main);
  }

  .logo-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 20px;
  }

  .logo-card {
    background: white;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    height: 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    cursor: default;
    padding: 20px;
  }

  .logo-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.06);
    border-color: #d1d5db;
  }

  .logo-text {
    font-size: 16px;
    font-weight: 600;
    color: #374151;
    text-align: center;
    transition: all 0.3s ease;
  }

  .logo-card:hover .logo-text {
    color: var(--primary-color);
    transform: scale(1.05);
  }

  .features-section {
    background-color: var(--bg-secondary);
    padding: 80px 0;
    margin-top: 40px;
    border-radius: 24px;
  }

  .features-header {
    text-align: center;
    margin-bottom: 40px;
  }

  .features-subtitle {
    color: var(--text-sub);
    margin: 0;
  }

  .features-grid {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
    padding: 0 20px;
  }

  .feature-card {
    background: white;
    padding: 40px 30px;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    transition: transform 0.3s ease;
    text-align: center;
  }

  .feature-card:hover {
    transform: translateY(-5px);
  }

  .feature-icon {
    font-size: 32px;
    margin-bottom: 20px;
    display: block;
  }

  .feature-title {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 12px;
    color: var(--text-main);
  }

  .feature-desc {
    font-size: 15px;
    color: var(--text-sub);
    margin: 0;
    line-height: 1.6;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .logo-grid {
      grid-template-columns: repeat(3, 1fr);
    }
    .features-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 768px) {
    .container {
      padding: 60px 20px;
    }
    .header-title {
      font-size: 32px;
    }
    .logo-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .features-grid {
      grid-template-columns: 1fr;
      gap: 20px;
    }
    .features-section {
      padding: 60px 0;
    }
  }

  @media (max-width: 480px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }
    .logo-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .logo-card {
      height: 100px;
    }
  }
}
</style>
