<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  createSpeechRecognition,
  getSpeechErrorMessage,
  isSpeechRecognitionSupported,
  type BrowserSpeechRecognition
} from '../utils/speech'

const question = defineModel<string>({ required: true })

const recognition = ref<BrowserSpeechRecognition | null>(null)
const isListening = ref(false)
const interimText = ref('')
const errorMessage = ref('')
const isSupported = isSpeechRecognitionSupported()

const canStartListening = computed(() => isSupported && !isListening.value)

watch(
  question,
  () => {
    if (errorMessage.value && isSupported) {
      errorMessage.value = ''
    }
  }
)

function startListening() {
  if (!canStartListening.value) {
    if (!isSupported) {
      errorMessage.value = '当前浏览器不支持语音识别，请使用文字输入。'
    }
    return
  }

  const nextRecognition = createSpeechRecognition()

  if (!nextRecognition) {
    errorMessage.value = '当前浏览器不支持语音识别，请使用文字输入。'
    return
  }

  recognition.value = nextRecognition
  interimText.value = ''
  errorMessage.value = ''

  nextRecognition.onstart = () => {
    isListening.value = true
  }

  nextRecognition.onend = () => {
    isListening.value = false
    interimText.value = ''
    recognition.value = null
  }

  nextRecognition.onerror = (event) => {
    const message = getSpeechErrorMessage(event.error)
    if (message) {
      errorMessage.value = message
    }
  }

  nextRecognition.onresult = (event) => {
    let finalText = ''
    let currentInterimText = ''

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index]
      const transcript = result[0]?.transcript.trim() ?? ''

      if (result.isFinal) {
        finalText += transcript
      } else {
        currentInterimText += transcript
      }
    }

    if (finalText) {
      question.value = [question.value.trim(), finalText].filter(Boolean).join(' ')
    }

    interimText.value = currentInterimText
  }

  try {
    nextRecognition.start()
  } catch {
    recognition.value = null
    isListening.value = false
    errorMessage.value = '语音识别启动失败，请重试，或直接使用文字输入。'
  }
}

function stopListening() {
  recognition.value?.stop()
}

onBeforeUnmount(() => {
  recognition.value?.abort()
})
</script>

<template>
  <section class="voice-panel tool-panel" aria-labelledby="voice-title">
    <div class="panel-header">
      <div>
        <p class="eyebrow">语音提问</p>
        <h2 id="voice-title">问题输入</h2>
      </div>
      <div class="camera-status" :class="{ active: isListening }">
        {{ isListening ? '识别中' : '待输入' }}
      </div>
    </div>

    <label class="question-label" for="question-input">你的问题</label>
    <textarea
      id="question-input"
      v-model="question"
      class="question-input"
      rows="4"
      placeholder="可以直接输入问题，也可以点击语音输入。"
    />

    <p v-if="interimText" class="interim-text">
      {{ interimText }}
    </p>

    <p v-if="!isSupported" class="hint-message">
      当前浏览器不支持 Web Speech API，请使用文字输入。
    </p>
    <p v-if="errorMessage" class="error-message" role="alert">
      {{ errorMessage }}
    </p>

    <div class="camera-actions">
      <button
        class="primary-button"
        type="button"
        :disabled="!canStartListening"
        @click="startListening"
      >
        {{ isListening ? '正在聆听...' : '开始语音输入' }}
      </button>
      <button
        class="secondary-button"
        type="button"
        :disabled="!isListening"
        @click="stopListening"
      >
        停止识别
      </button>
    </div>
  </section>
</template>
