<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { chatWithVision } from './api/vision'
import CameraView from './components/CameraView.vue'
import HistoryList from './components/HistoryList.vue'
import VoiceInput from './components/VoiceInput.vue'
import type { ChatHistoryMessage, ChatHistoryItem, VisionChatResponse } from './types/chat'
import { isSpeechSynthesisSupported, speakText, stopSpeaking } from './utils/speech'
import {
  clearChatHistory,
  loadChatHistory,
  prependChatHistoryItem
} from './utils/storage'

const projectName = 'SightMate'
const question = ref('')
const cameraViewRef = ref<InstanceType<typeof CameraView> | null>(null)
const capturedImage = ref('')
const captureError = ref('')
const chatError = ref('')
const isSubmitting = ref(false)
const latestAnswer = ref<VisionChatResponse | null>(null)
const isSpeaking = ref(false)
const speechError = ref('')
const canSpeak = isSpeechSynthesisSupported()
const chatHistory = ref<ChatHistoryItem[]>(loadChatHistory())

const canSubmit = computed(() => question.value.trim().length > 0 && !isSubmitting.value)
const visibleError = computed(() => captureError.value || chatError.value || speechError.value)

function captureCurrentFrame() {
  captureError.value = ''

  try {
    capturedImage.value = cameraViewRef.value?.captureFrame() ?? ''
  } catch (error) {
    captureError.value = error instanceof Error ? error.message : '截图失败，请重试。'
  }
}

async function submitQuestion() {
  if (!canSubmit.value) {
    if (!question.value.trim()) {
      chatError.value = '请先输入问题，或使用语音输入生成问题。'
    }
    return
  }

  isSubmitting.value = true
  captureError.value = ''
  chatError.value = ''

  try {
    const imageBase64 = cameraViewRef.value?.captureFrame()
    if (!imageBase64) {
      throw new Error('请先打开摄像头，再发送问题。')
    }

    capturedImage.value = imageBase64
    latestAnswer.value = await chatWithVision({
      question: question.value.trim(),
      image_base64: imageBase64,
      history: buildRecentContext()
    })
    chatHistory.value = prependChatHistoryItem(chatHistory.value, {
      id: crypto.randomUUID(),
      question: question.value.trim(),
      answer: latestAnswer.value.answer,
      image_base64: imageBase64,
      model: latestAnswer.value.model,
      created_at: latestAnswer.value.created_at
    })
    playLatestAnswer()
  } catch (error) {
    chatError.value = error instanceof Error ? error.message : '请求失败，请稍后重试。'
  } finally {
    isSubmitting.value = false
  }
}

function buildRecentContext(): ChatHistoryMessage[] {
  return chatHistory.value
    .slice(0, 3)
    .reverse()
    .flatMap((item) => [
      {
        role: 'user' as const,
        content: item.question
      },
      {
        role: 'assistant' as const,
        content: item.answer
      }
    ])
}

function playLatestAnswer() {
  if (!latestAnswer.value) {
    return
  }

  speechError.value = ''

  try {
    speakText(latestAnswer.value.answer, {
      onStart: () => {
        isSpeaking.value = true
      },
      onEnd: () => {
        isSpeaking.value = false
      },
      onError: () => {
        isSpeaking.value = false
        speechError.value = '语音播报失败，请使用文字回答。'
      }
    })
  } catch (error) {
    isSpeaking.value = false
    speechError.value = error instanceof Error ? error.message : '语音播报失败，请使用文字回答。'
  }
}

function stopAnswerSpeech() {
  stopSpeaking()
  isSpeaking.value = false
}

function clearHistory() {
  clearChatHistory()
  chatHistory.value = []
}

onBeforeUnmount(() => {
  stopSpeaking()
})
</script>

<template>
  <main class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">AI 视觉对话助手</p>
        <h1>{{ projectName }}</h1>
      </div>
      <p class="privacy">
        SightMate 不会持续上传视频流，仅在用户主动提问时截取当前画面。
      </p>
    </header>

    <section class="workspace" aria-label="视觉对话工作区">
      <div class="video-column">
        <CameraView ref="cameraViewRef" />
      </div>

      <section class="chat-panel tool-panel" aria-labelledby="chat-title">
        <div class="panel-header">
          <div>
            <p class="eyebrow">对话</p>
            <h2 id="chat-title">当前视觉问答</h2>
          </div>
          <div class="camera-status" :class="{ active: latestAnswer }">
            {{ latestAnswer ? '已回答' : '待提问' }}
          </div>
        </div>

        <div v-if="visibleError" class="error-stack" role="alert">
          <p v-if="captureError" class="error-message">{{ captureError }}</p>
          <p v-if="chatError" class="error-message">{{ chatError }}</p>
          <p v-if="speechError" class="error-message">{{ speechError }}</p>
        </div>

        <p v-if="!canSpeak" class="hint-message">当前浏览器不支持语音播报，请阅读文字回答。</p>

        <div v-if="capturedImage" class="capture-preview compact-preview">
          <img :src="capturedImage" alt="本次提问截图预览" />
        </div>

        <div v-if="latestAnswer" class="answer-panel">
          <div class="answer-meta">
            <span>{{ latestAnswer.model }}</span>
            <span>{{ latestAnswer.created_at }}</span>
            <span>{{ isSpeaking ? '正在播报' : '播报就绪' }}</span>
          </div>
          <p>{{ latestAnswer.answer }}</p>
          <div class="camera-actions">
            <button
              class="secondary-button"
              type="button"
              :disabled="!canSpeak || isSpeaking"
              @click="playLatestAnswer"
            >
              重新播放
            </button>
            <button
              class="secondary-button"
              type="button"
              :disabled="!isSpeaking"
              @click="stopAnswerSpeech"
            >
              停止播报
            </button>
          </div>
        </div>

        <p v-else class="empty-answer">打开摄像头后，用语音或文字提问，SightMate 会在发送时截取当前画面。</p>

        <VoiceInput v-model="question" />

        <div class="submit-bar">
          <button
            class="primary-button"
            type="button"
            :disabled="!canSubmit"
            @click="submitQuestion"
          >
            {{ isSubmitting ? '正在分析...' : '发送并分析当前画面' }}
          </button>
          <button
            class="secondary-button"
            type="button"
            :disabled="isSubmitting"
            @click="captureCurrentFrame"
          >
            预览截图
          </button>
        </div>
      </section>
    </section>

    <HistoryList :items="chatHistory" @clear="clearHistory" />
  </main>
</template>
