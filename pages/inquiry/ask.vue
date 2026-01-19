<template>
  <VForm v-model="valid" ref="form" validateOn="blur">
    <table class="ask-table">
      <colgroup>
        <col width="20%" />
        <col width="80%" />
      </colgroup>
      <tbody>
        <tr>
          <th>작성자</th>
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
                  if (!value) {
                    return '작성자를 입력해주세요.'
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
              placeholder="선택 입력"
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
                  if (!value) {
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
          <td><VTextField variant="outlined" hideDetails="auto" density="compact" v-model="inputData.contact"></VTextField></td>
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
                  if (!value) {
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
                  if (!value) {
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
</template>
<script setup lang="ts">
import type { NotionAskReqeust } from '~/composables/notion'
import { VForm } from 'vuetify/components/VForm'
import { VTextField } from 'vuetify/components/VTextField'

const inputData: NotionAskReqeust = reactive({})
const valid = ref(false)
const form = ref<InstanceType<typeof VForm>>()
const authorTextInput = ref<InstanceType<typeof VTextField>>()
function init() {
  useDeepMerge(inputData, {
    author: '',
    contact: '',
    company: '',
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
  init()
}

onMounted(() => init())
</script>

<style lang="scss">
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
</style>
