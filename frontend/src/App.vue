<script setup lang="ts">
const projectName = 'SightMate'
</script>

<template>
  <main class="app-shell">
    <section class="intro">
      <p class="eyebrow">AI 视觉对话助手</p>
      <h1>{{ projectName }}</h1>
      <p class="description">
        项目初始化已完成。后续 PR 会继续接入摄像头预览、语音输入、视觉问答、语音播报和历史记录。
      </p>
      <p class="privacy">
        SightMate 不会持续上传视频流，仅在用户主动提问时截取当前画面。
      </p>
    </section>
  </main>
</template>
