<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

const videoRef = ref<HTMLVideoElement | null>(null)
const stream = ref<MediaStream | null>(null)
const isStarting = ref(false)
const errorMessage = ref('')

const isCameraActive = computed(() => stream.value !== null)

async function startCamera() {
  if (isStarting.value || stream.value) {
    return
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    errorMessage.value = '当前浏览器不支持摄像头访问，请更换现代浏览器后重试。'
    return
  }

  isStarting.value = true
  errorMessage.value = ''

  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    })

    stream.value = mediaStream
    await nextTick()

    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream
      await videoRef.value.play()
    }
  } catch (error) {
    stopCamera()
    errorMessage.value = getCameraErrorMessage(error)
  } finally {
    isStarting.value = false
  }
}

function stopCamera() {
  stream.value?.getTracks().forEach((track) => track.stop())
  stream.value = null

  if (videoRef.value) {
    videoRef.value.srcObject = null
  }
}

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return '摄像头权限被拒绝，请在浏览器地址栏允许摄像头访问后重试。'
    }

    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
      return '没有找到可用摄像头，请连接摄像头后重试。'
    }

    if (error.name === 'NotReadableError') {
      return '摄像头正在被其他应用占用，请关闭占用摄像头的应用后重试。'
    }
  }

  return '摄像头启动失败，请检查设备和浏览器权限后重试。'
}

onBeforeUnmount(() => {
  stopCamera()
})
</script>

<template>
  <section class="camera-panel" aria-labelledby="camera-title">
    <div class="panel-header">
      <div>
        <p class="eyebrow">实时画面</p>
        <h2 id="camera-title">摄像头预览</h2>
      </div>
      <div class="camera-status" :class="{ active: isCameraActive }">
        {{ isCameraActive ? '已开启' : '未开启' }}
      </div>
    </div>

    <div class="video-frame">
      <video
        v-show="isCameraActive"
        ref="videoRef"
        class="camera-video"
        autoplay
        muted
        playsinline
      />
      <div v-if="!isCameraActive" class="video-placeholder">
        <span>等待开启摄像头</span>
      </div>
    </div>

    <p v-if="errorMessage" class="error-message" role="alert">
      {{ errorMessage }}
    </p>

    <div class="camera-actions">
      <button
        class="primary-button"
        type="button"
        :disabled="isStarting || isCameraActive"
        @click="startCamera"
      >
        {{ isStarting ? '正在开启...' : '打开摄像头' }}
      </button>
      <button
        class="secondary-button"
        type="button"
        :disabled="!isCameraActive"
        @click="stopCamera"
      >
        关闭摄像头
      </button>
    </div>
  </section>
</template>
