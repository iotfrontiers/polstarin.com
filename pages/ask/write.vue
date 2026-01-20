<template>
  <VContainer class="ask-page-container" :fluid="true">
    <VRow class="page-header-row" :style="{ backgroundImage: 'url(/img/banner-inquiry.png)' }">
      <MainHeader />
    </VRow>
    <VRow class="content-wrap">
      <div class="section">
        <div class="sub-title text-h3 font-weight-black mb-15">제작의뢰</div>
        <VForm v-model="valid" ref="form" validateOn="blur">
          <table class="ask-table">
            <colgroup>
              <col width="20%" />
              <col width="80%" />
            </colgroup>
            <tbody>
              <tr>
                <th>성함</th>
                <td>
                  <VTextField
                    variant="outlined"
                    ref="authorTextInput"
                    required
                    class="required"
                    density="compact"
                    v-model="inputData.author"
                    hideDetails="auto"
                    :rules="[
                      value => {
                        if (!value || !value.trim()) {
                          return '성함을 입력해주세요.'
                        }
                        return true
                      },
                    ]"
                  ></VTextField>
                </td>
              </tr>
              <tr>
                <th>이메일</th>
                <td>
                  <VTextField
                    variant="outlined"
                    type="email"
                    required
                    hideDetails="auto"
                    density="compact"
                    v-model="inputData.email"
                    class="required"
                    :rules="[
                      value => {
                        if (!value || !value.trim()) {
                          return '이메일을 입력해주세요.'
                        }
                        if (/.+@.+\..+/.test(value)) return true
                        return '정확한 이메일을 입력해주세요.'
                      },
                    ]"
                  ></VTextField>
                </td>
              </tr>
              <tr>
                <th>연락처</th>
                <td>
                  <VTextField
                    variant="outlined"
                    hideDetails="auto"
                    density="compact"
                    v-model="inputData.contact"
                    required
                    class="required"
                    :rules="[
                      value => {
                        if (!value || !value.trim()) {
                          return '연락처를 입력해주세요.'
                        }
                        return true
                      },
                    ]"
                  ></VTextField>
                </td>
              </tr>
              <tr>
                <th>회사/소속</th>
                <td>
                  <VTextField
                    variant="outlined"
                    hideDetails="auto"
                    density="compact"
                    v-model="inputData.company"
                    required
                    class="required"
                    :rules="[
                      value => {
                        if (!value || !value.trim()) {
                          return '회사/소속을 입력해주세요.'
                        }
                        return true
                      },
                    ]"
                  ></VTextField>
                </td>
              </tr>
              <tr>
                <th>비밀번호</th>
                <td>
                  <VTextField
                    variant="outlined"
                    hideDetails="auto"
                    density="compact"
                    v-model="inputData.password"
                    type="password"
                    maxlength="4"
                    placeholder="영문, 숫자 4자"
                    required
                    class="required"
                    :rules="[
                      value => {
                        if (!value || !value.trim()) {
                          return '비밀번호를 입력해주세요.'
                        }
                        if (value.length !== 4) {
                          return '비밀번호는 4자리여야 합니다.'
                        }
                        if (!/^[A-Za-z0-9]{4}$/.test(value)) {
                          return '영문과 숫자만 입력 가능합니다.'
                        }
                        return true
                      },
                    ]"
                  ></VTextField>
                  <div class="password-hint mt-1">글을 읽을 때 필요한 비밀번호입니다. (영문, 숫자 4자)</div>
                </td>
              </tr>
              <tr>
                <th>제목</th>
                <td>
                  <VTextField
                    variant="outlined"
                    hideDetails="auto"
                    density="compact"
                    class="required"
                    v-model="inputData.title"
                    required
                    :rules="[
                      value => {
                        if (!value || !value.trim()) {
                          return '제목을 입력해주세요.'
                        }
                        return true
                      },
                    ]"
                  ></VTextField>
                </td>
              </tr>
              <tr>
                <th>메시지</th>
                <td>
                  <VTextarea
                    variant="outlined"
                    hideDetails="auto"
                    density="compact"
                    class="required"
                    v-model="inputData.content"
                    required
                    :rules="[
                      value => {
                        if (!value || !value.trim()) {
                          return '메시지를 입력해주세요.'
                        }
                        return true
                      },
                    ]"
                  ></VTextarea>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="d-flex align-center mt-2 justify-center">
            <VBtn @click="submit" color="blue">작성완료</VBtn>
            <VBtn class="ml-2" @click="init" color="grey">다시 작성하기</VBtn>
          </div>
        </VForm>
      </div>
    </VRow>
  </VContainer>
</template>
<script setup lang="ts">
import type { NotionAskReqeust } from '~/composables/notion'
import { VForm } from 'vuetify/components/VForm'
import { VTextField } from 'vuetify/components/VTextField'

const router = useRouter()
const inputData: NotionAskReqeust = reactive({})
const valid = ref(false)
const form = ref<InstanceType<typeof VForm>>()
const authorTextInput = ref<InstanceType<typeof VTextField>>()
function init() {
  useDeepMerge(inputData, {
    author: '',
    contact: '',
    company: '',
    password: '',
    content: '',
    email: '',
    title: '',
  })

  form.value.reset()
  authorTextInput.value.focus()
}

async function submit() {
  const validResult = await form.value.validate()
  if (!validResult.valid) {
    // 누락된 필수 항목 확인
    const missingFields: string[] = []
    
    if (!inputData.author || !inputData.author.trim()) {
      missingFields.push('성함')
    }
    if (!inputData.email || !inputData.email.trim()) {
      missingFields.push('이메일')
    }
    if (!inputData.contact || !inputData.contact.trim()) {
      missingFields.push('연락처')
    }
    if (!inputData.company || !inputData.company.trim()) {
      missingFields.push('회사/소속')
    }
    if (!inputData.password || !inputData.password.trim()) {
      missingFields.push('비밀번호')
    }
    if (!inputData.title || !inputData.title.trim()) {
      missingFields.push('제목')
    }
    if (!inputData.content || !inputData.content.trim()) {
      missingFields.push('메시지')
    }
    
    if (missingFields.length > 0) {
      alert(`다음 항목을 입력해주세요:\n${missingFields.join(', ')}`)
    }
    return
  }

  const body = useDeepMerge({}, toValue(inputData))

  if (!confirm('문의를 등록하시겠습니까?')) {
    return
  }

  try {
    await useLoadingTask(async () => {
      await $fetch('/api/ask', {
        method: 'post',
        body: body,
      })
    })
  } catch (e) {
    alert(COMMON_MESSAGES.ASK_ERROR)
    return
  }

  alert(COMMON_MESSAGES.ASK_COMPLETED)
  // 작성 완료 후 목록 페이지로 이동
  router.push('/ask')
}
onMounted(() => init())
</script>
<style lang="scss">
.ask-page-container {
  padding-bottom: 0;

  .v-row.page-header-row {
    min-height: min(506px, 80vw);
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }


  .content-wrap {
    height: auto;
    padding-bottom: 100px;
    padding-top: 90px;
    background-color: #fff;
    color: black;
  }

  .section {
    position: relative;
    width: 100%;
    max-width: 1300px;
    margin: 0 auto;
    padding: 0 10px;

    .sub-title {
      font-size: min(3rem, 10vw) !important;
    }

    img {
      max-width: 100%;
    }
  }
}

.ask-table {
  width: 100%;
  border-top: 2px solid #333;
  border-collapse: collapse;

  th {
    background-color: #eeeeee;
    border-bottom: 1px solid #ddd;
    min-width: 120px;
  }

  td {
    vertical-align: middle;
    padding: 10px;
    border-bottom: 1px solid #ddd;
  }
}

.password-hint {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}
</style>
