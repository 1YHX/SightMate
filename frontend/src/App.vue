<script setup lang="ts">
import { ref } from 'vue'
import CameraView from './components/CameraView.vue'
import VoiceInput from './components/VoiceInput.vue'

const projectName = 'SightMate'
const question = ref('')
const cameraViewRef = ref<InstanceType<typeof CameraView> | null>(null)
const capturedImage = ref('')
const captureError = ref('')

function captureCurrentFrame() {
  captureError.value = ''

  try {
    capturedImage.value = cameraViewRef.value?.captureFrame() ?? ''
  } catch (error) {
    captureError.value = error instanceof Error ? error.message : '截图失败，请重试。'
  }
}
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

    <CameraView ref="cameraViewRef" />
    <VoiceInput v-model="question" />

    <section class="capture-panel" aria-labelledby="capture-title">
      <div class="panel-header">
        <div>
          <p class="eyebrow">当前帧</p>
          <h2 id="capture-title">提问截图</h2>
        </div>
        <div class="camera-status" :class="{ active: capturedImage }">
          {{ capturedImage ? '已截取' : '未截取' }}
        </div>
      </div>

      <p class="hint-message">
        点击按钮会从当前摄像头画面截取一张 JPEG 图片，最长边限制为 1024px。
      </p>

      <p v-if="captureError" class="error-message" role="alert">
        {{ captureError }}
      </p>

      <div v-if="capturedImage" class="capture-preview">
        <img :src="capturedImage" alt="当前摄像头截图预览" />
      </div>

      <div class="camera-actions">
        <button class="primary-button" type="button" @click="captureCurrentFrame">
          截取当前画面
        </button>
      </div>
    </section>
  </main>
</template>
