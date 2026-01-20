<template>
  <VRow class="inquiry-row">
    <VCol class="left-col">
      <div class="section-title">제작의뢰</div>
      <div class="desc">
        <span class="text-grey-darken-2">최근 제작의뢰 현황을 확인하세요.</span>
      </div>
      <VRow class="buttons" align="center">
        <VCol>
          <VBtn @click="$router.push('/ask')" variant="outlined" class="inquiry-btn">
            제작의뢰 바로가기 →
          </VBtn>
        </VCol>
      </VRow>
    </VCol>
    <VCol :cols="contentCols" class="inquiry-col">
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
              @click="$router.push(`/ask/${item.id}`)"
              class="inquiry-row-item"
            >
              <td>{{ item.num }}</td>
              <td class="title-cell">{{ item.title }}</td>
              <td>{{ maskName(item.author) }}</td>
              <td>{{ formatDate(item.date) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="no-data-text">등록된 문의가 없습니다.</div>
    </VCol>
  </VRow>
</template>

<script setup>
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

    .left-col {
      margin-right: min(100px, 6vw);
      min-width: 200px;
      margin-bottom: 20px;

      .section-title {
        font-size: 2rem;
        padding: 20px 0;
        border-bottom: 1px solid #000;
      }

      .desc {
        margin-top: 20px;
        font-size: 15px;
        line-height: 25px;
      }

      .buttons {
        margin-top: 50px;
      }

      .inquiry-btn {
        border-color: #0066ff;
        color: #0066ff;
        font-weight: 500;
        
        &:hover {
          background-color: #0066ff;
          color: #fff;
        }
      }
    }

    .inquiry-col {
      width: 100%;
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
          cursor: pointer;
          transition: background-color 0.2s ease;

          &:hover {
            background-color: #f9f9f9;
          }

          td {
            padding: 12px 10px;
            border-bottom: 1px solid #eee;
            font-size: 14px;

            &:first-child {
              text-align: center;
              color: #666;
            }

            &.title-cell {
              color: #0066ff;
              text-decoration: underline;
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

    .loading-text,
    .no-data-text {
      padding: 40px;
      text-align: center;
      color: #999;
      font-size: 14px;
    }
  }
}
</style>
