<script setup lang="ts">
import { ref } from 'vue'
import CameraView from './components/CameraView.vue'
import VoiceInput from './components/VoiceInput.vue'

const projectName = 'SightMate'
const question = ref('')
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

    <CameraView />
    <VoiceInput v-model="question" />
  </main>
</template>
