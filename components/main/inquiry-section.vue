<template>
  <VRow class="inquiry-row">
    <VCol cols="12" class="inquiry-header-col">
      <div class="section-header">
        <div class="section-title">제작의뢰</div>
        <div class="info-text">
          <VIcon icon="mdi-information-outline" size="small" class="info-icon" />
          <span>폴스타인은 모든 문의 48시간(평일 기준) 내에 답변을 준수하고 있습니다.</span>
        </div>
      </div>
    </VCol>
    <VCol cols="12" class="inquiry-col">
      <div v-if="loading" class="loading-text">로딩 중...</div>
      <div v-else-if="inquiryList && inquiryList.length > 0" class="inquiry-table-wrapper">
        <table class="inquiry-table">
          <thead>
            <tr>
              <th>번호</th>
              <th>제목</th>
              <th>작성자</th>
              <th>작성일</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="item in inquiryList" 
              :key="item.id"
              class="inquiry-row-item"
            >
              <td>{{ item.num }}</td>
              <td class="title-cell">
                <div class="d-flex align-center">
                  <VIcon 
                    v-if="item.password && item.password.trim()" 
                    icon="mdi-lock" 
                    size="small" 
                    class="mr-2"
                    color="grey-darken-1"
                  />
                  <span>{{ item.title }}</span>
                </div>
              </td>
              <td>{{ maskName(item.author) }}</td>
              <td>{{ formatDate(item.date) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="button-wrapper">
          <VBtn @click="$router.push('/ask')" variant="outlined" class="inquiry-btn">
            제작의뢰 바로가기 →
          </VBtn>
        </div>
      </div>
      <div v-else class="no-data-text">
        <div>등록된 문의가 없습니다.</div>
        <VBtn @click="$router.push('/ask')" variant="outlined" class="inquiry-btn mt-4">
          제작의뢰 바로가기 →
        </VBtn>
      </div>
    </VCol>
  </VRow>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
import { ref, computed, onMounted } from 'vue'
import type { NotionListResponse, NotionData } from '~/composables/notion'

const display = useDisplay()
const contentCols = computed(() => (display.xs.value || display.sm.value ? 12 : 12))

const inquiryList = ref<NotionData[]>([])
const loading = ref(true)

/**
 * 이름 마스킹 (첫 글자만 보이고 나머지는 *)
 */
function maskName(name: string | undefined): string {
  if (!name) return ''
  if (name.length <= 1) return name
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 1)
}

/**
 * 날짜 포맷팅
 */
function formatDate(dateString: string | undefined): string {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    
    let year, month, day, hours, minutes
    
    if (dateString.includes('+09:00')) {
      year = date.getUTCFullYear()
      month = String(date.getUTCMonth() + 1).padStart(2, '0')
      day = String(date.getUTCDate()).padStart(2, '0')
      hours = String(date.getUTCHours()).padStart(2, '0')
      minutes = String(date.getUTCMinutes()).padStart(2, '0')
    } else if (dateString.endsWith('Z')) {
      year = date.getUTCFullYear()
      month = String(date.getUTCMonth() + 1).padStart(2, '0')
      day = String(date.getUTCDate()).padStart(2, '0')
      hours = String(date.getUTCHours()).padStart(2, '0')
      minutes = String(date.getUTCMinutes()).padStart(2, '0')
    } else {
      year = date.getFullYear()
      month = String(date.getMonth() + 1).padStart(2, '0')
      day = String(date.getDate()).padStart(2, '0')
      hours = String(date.getHours()).padStart(2, '0')
      minutes = String(date.getMinutes()).padStart(2, '0')
    }
    
    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch (e) {
    return dateString
  }
}

async function loadInquiryList() {
  try {
    loading.value = true
    const response = await $fetch<{
      list: NotionData[]
      totalCount: number
      currentPage: number
      pageSize: number
      hasMore: boolean
    }>('/api/ask-list', {
      method: 'post',
      body: {
        page: 1,
        pageSize: 5, // 최근 5개만 표시
      },
    })

    if (response.list) {
      // 번호 매기기
      response.list.forEach((item, index) => {
        item.num = index + 1
      })
      inquiryList.value = response.list
    }
  } catch (e) {
    console.error('제작의뢰 목록 조회 오류:', e)
    inquiryList.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadInquiryList()
})
</script>

<style lang="scss">
.main-container {
  .v-row.inquiry-row {
    background-color: #fff;
    color: #000;
    padding: min(70px, 5vw) 0 min(70px, 5vw) min(90px, 7vw);

    .inquiry-header-col {
      margin-bottom: 30px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;

      .section-title {
        font-size: 2rem;
        font-weight: 700;
        margin: 0;
      }

      .info-text {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #666;
        flex: 1;
        min-width: 200px;

        .info-icon {
          color: #0066ff;
          flex-shrink: 0;
        }
      }
    }

    .inquiry-col {
      width: 100%;
    }

    .button-wrapper {
      display: flex;
      justify-content: center;
      margin-top: 30px;
    }

    .inquiry-btn {
      border-color: #0066ff;
      color: #0066ff;
      font-weight: 500;
      padding: 10px 24px;
      
      &:hover {
        background-color: #0066ff;
        color: #fff;
      }
    }

    .inquiry-table-wrapper {
      width: 100%;
      overflow-x: auto;
    }

    .inquiry-table {
      width: 100%;
      border-collapse: collapse;
      border-top: 2px solid #333;

      thead {
        background-color: #f5f5f5;

        th {
          padding: 12px 10px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
          border-bottom: 1px solid #ddd;

          &:first-child {
            width: 60px;
            text-align: center;
          }

          &:nth-child(2) {
            width: auto;
          }

          &:nth-child(3) {
            width: 100px;
            text-align: center;
          }

          &:nth-child(4) {
            width: 150px;
            text-align: center;
          }
        }
      }

      tbody {
        tr.inquiry-row-item {
          transition: background-color 0.2s ease;

          td {
            padding: 12px 10px;
            border-bottom: 1px solid #eee;
            font-size: 14px;

            &:first-child {
              text-align: center;
              color: #666;
            }

            &.title-cell {
              color: #333;
            }

            &:nth-child(3) {
              text-align: center;
            }

            &:nth-child(4) {
              text-align: center;
              color: #666;
              white-space: nowrap;
            }
          }
        }
      }
    }

    .loading-text {
      padding: 40px;
      text-align: center;
      color: #999;
      font-size: 14px;
    }

    .no-data-text {
      padding: 40px;
      text-align: center;
      color: #999;
      font-size: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  }
}
</style>
