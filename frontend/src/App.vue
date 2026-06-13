<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { synthesizeSpeech } from './api/speech'
import { chatWithVision } from './api/vision'
import CameraView from './components/CameraView.vue'
import HistoryList from './components/HistoryList.vue'
import type { ChatHistoryMessage, ChatSession, ChatTurn, VisionChatResponse } from './types/chat'
import {
  createSpeechRecognition,
  getSpeechErrorMessage,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  speakText,
  stopSpeaking,
  type BrowserSpeechRecognition
} from './utils/speech'
import {
  addTurnToSession,
  clearChatHistory,
  createEmptySession,
  loadChatSessions
} from './utils/storage'

const projectName = 'SightMate'
const question = ref('')
const cameraViewRef = ref<InstanceType<typeof CameraView> | null>(null)
const chatThreadRef = ref<HTMLElement | null>(null)
const captureError = ref('')
const chatError = ref('')
const isSubmitting = ref(false)
const latestAnswer = ref<VisionChatResponse | null>(null)
const isSpeaking = ref(false)
const speechError = ref('')
const canBrowserSpeak = isSpeechSynthesisSupported()
const canSpeak = true
const canContinuouslyListen = isSpeechRecognitionSupported()
const chatSessions = ref<ChatSession[]>(loadChatSessions())
const isConversationMode = ref(false)
const conversationRecognition = ref<BrowserSpeechRecognition | null>(null)
const interruptionRecognition = ref<BrowserSpeechRecognition | null>(null)
const conversationStatus = ref('未开启')
const pendingTranscript = ref('')
const selectedSessionId = ref<string | undefined>(chatSessions.value[0]?.id)
const professionalAudio = ref<HTMLAudioElement | null>(null)
let autoSubmitTimer: number | undefined
let interruptionStartTimer: number | undefined

const visibleError = computed(() => captureError.value || chatError.value || speechError.value)
const selectedSession = computed(() =>
  chatSessions.value.find((session) => session.id === selectedSessionId.value) ?? chatSessions.value[0]
)
const chatTimeline = computed(() => selectedSession.value?.turns ?? [])
const isVideoConversationActive = computed(() => isConversationMode.value)

watch(
  () => [selectedSessionId.value, chatTimeline.value.length],
  () => {
    void scrollChatToBottom()
  },
  { flush: 'post' }
)

async function submitQuestion(questionOverride?: string) {
  const currentQuestion = questionOverride?.trim() ?? question.value.trim()

  if (!currentQuestion || isSubmitting.value) {
    if (!currentQuestion) {
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

    latestAnswer.value = await chatWithVision({
      question: currentQuestion,
      image_base64: imageBase64,
      history: buildRecentContext()
    })
    const historyItem: ChatTurn = {
      id: crypto.randomUUID(),
      question: currentQuestion,
      answer: latestAnswer.value.answer,
      image_base64: imageBase64,
      model: latestAnswer.value.model,
      created_at: latestAnswer.value.created_at
    }
    const result = addTurnToSession(chatSessions.value, selectedSessionId.value, historyItem)
    chatSessions.value = result.sessions
    selectedSessionId.value = result.sessionId
    await scrollChatToBottom()
    playLatestAnswer()
  } catch (error) {
    chatError.value = error instanceof Error ? error.message : '请求失败，请稍后重试。'
  } finally {
    isSubmitting.value = false
  }
}

function buildRecentContext(): ChatHistoryMessage[] {
  return (selectedSession.value?.turns ?? [])
    .slice(-3)
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
  void scrollChatToBottom()
  void playProfessionalAnswer(latestAnswer.value.answer)
}

async function playProfessionalAnswer(answer: string) {
  stopSpeaking()
  stopProfessionalAudio()
  isSpeaking.value = true

  try {
    const speech = await synthesizeSpeech({ text: answer })
    const audio = new Audio(speech.audio_url)
    professionalAudio.value = audio

    audio.onended = () => {
      professionalAudio.value = null
      isSpeaking.value = false
      resumeConversationIfNeeded()
    }
    audio.onerror = () => {
      professionalAudio.value = null
      playBrowserAnswer(answer)
    }

    await audio.play()
  } catch {
    playBrowserAnswer(answer)
  }
}

function playBrowserAnswer(answer: string) {
  try {
    speakText(answer, {
      onStart: () => {
        isSpeaking.value = true
      },
      onEnd: () => {
        isSpeaking.value = false
        if (!pendingTranscript.value) {
          resumeConversationIfNeeded()
        }
      },
      onError: () => {
        isSpeaking.value = false
        speechError.value = '语音播报失败，请使用文字回答。'
        if (!pendingTranscript.value) {
          resumeConversationIfNeeded()
        }
      }
    })
  } catch (error) {
    isSpeaking.value = false
    speechError.value = error instanceof Error ? error.message : '语音播报失败，请使用文字回答。'
  }
}

function stopProfessionalAudio() {
  professionalAudio.value?.pause()
  if (professionalAudio.value) {
    professionalAudio.value.currentTime = 0
  }
  professionalAudio.value = null
}

function stopAnswerSpeech() {
  stopSpeaking()
  stopProfessionalAudio()
  isSpeaking.value = false
  resumeConversationIfNeeded()
}

function clearHistory() {
  clearChatHistory()
  chatSessions.value = []
  selectedSessionId.value = undefined
  latestAnswer.value = null
  stopSpeaking()
  stopProfessionalAudio()
  isSpeaking.value = false
}

function startNewSession() {
  const result = createEmptySession(chatSessions.value)
  chatSessions.value = result.sessions
  selectedSessionId.value = result.sessionId
  latestAnswer.value = null
  question.value = ''
  void scrollChatToBottom()
}

async function startVideoConversation() {
  captureError.value = ''
  chatError.value = ''
  speechError.value = ''

  try {
    await cameraViewRef.value?.startCamera()
  } catch (error) {
    captureError.value = error instanceof Error ? error.message : '摄像头启动失败，请检查权限。'
    return
  }

  if (!cameraViewRef.value?.isCameraActive) {
    captureError.value = '摄像头没有成功开启，请检查浏览器权限。'
    return
  }

  startConversationMode()
}

function stopVideoConversation() {
  stopConversationMode()
  stopSpeaking()
  isSpeaking.value = false
  cameraViewRef.value?.stopCamera()
}

function selectHistoryItem(id: string) {
  selectedSessionId.value = id
  const session = chatSessions.value.find((item) => item.id === id)
  const lastTurn = session?.turns[session.turns.length - 1]
  if (lastTurn) {
    latestAnswer.value = {
      answer: lastTurn.answer,
      model: lastTurn.model,
      created_at: lastTurn.created_at
    }
  }
  void scrollChatToBottom()
}

async function scrollChatToBottom() {
  await nextTick()
  const chatThread = chatThreadRef.value
  if (!chatThread) {
    return
  }

  chatThread.scrollTo({
    top: chatThread.scrollHeight,
    behavior: 'smooth'
  })
}

function startConversationMode() {
  if (!canContinuouslyListen) {
    chatError.value = '当前浏览器不支持连续语音识别，请使用手动输入。'
    return
  }

  if (isConversationMode.value) {
    return
  }

  isConversationMode.value = true
  conversationStatus.value = '正在聆听'
  startConversationRecognition()
}

function stopConversationMode() {
  isConversationMode.value = false
  conversationStatus.value = '未开启'
  pendingTranscript.value = ''
  clearAutoSubmitTimer()
  clearInterruptionStartTimer()
  stopInterruptionRecognition()
  conversationRecognition.value?.abort()
  conversationRecognition.value = null
}

function startConversationRecognition() {
  if (
    !isConversationMode.value ||
    isSubmitting.value ||
    isSpeaking.value ||
    conversationRecognition.value
  ) {
    return
  }

  const recognition = createSpeechRecognition('zh-CN', {
    continuous: true,
    interimResults: true
  })

  if (!recognition) {
    chatError.value = '当前浏览器不支持连续语音识别，请使用手动输入。'
    stopConversationMode()
    return
  }

  conversationRecognition.value = recognition

  recognition.onstart = () => {
    conversationStatus.value = '正在聆听'
  }

  recognition.onend = () => {
    conversationRecognition.value = null
    if (isConversationMode.value && !isSubmitting.value && !isSpeaking.value) {
      window.setTimeout(startConversationRecognition, 300)
    }
  }

  recognition.onerror = (event) => {
    const message = getSpeechErrorMessage(event.error)
    if (message && event.error !== 'no-speech') {
      chatError.value = message
    }

    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      stopConversationMode()
    }
  }

  recognition.onresult = (event) => {
    let finalText = ''
    let interimText = ''

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index]
      const transcript = result[0]?.transcript.trim() ?? ''

      if (result.isFinal) {
        finalText += transcript
      } else {
        interimText += transcript
      }
    }

    const nextTranscript = (finalText || interimText).trim()

    if (!nextTranscript || isSubmitting.value) {
      return
    }

    question.value = nextTranscript
    pendingTranscript.value = nextTranscript

    if (finalText) {
      submitPendingConversationQuestion()
      return
    }

    conversationStatus.value = '听到问题，等待你说完'
    clearAutoSubmitTimer()
    autoSubmitTimer = window.setTimeout(submitPendingConversationQuestion, 1200)
  }

  try {
    recognition.start()
  } catch {
    conversationRecognition.value = null
    chatError.value = '连续语音识别启动失败，请重新开启。'
    stopConversationMode()
  }
}

function submitPendingConversationQuestion() {
  const nextQuestion = pendingTranscript.value.trim()

  if (!nextQuestion || isSubmitting.value) {
    return
  }

  clearAutoSubmitTimer()
  pendingTranscript.value = ''
  question.value = nextQuestion
  conversationStatus.value = '正在分析'
  conversationRecognition.value?.stop()
  void submitQuestion(nextQuestion)
}

function clearAutoSubmitTimer() {
  if (autoSubmitTimer) {
    window.clearTimeout(autoSubmitTimer)
    autoSubmitTimer = undefined
  }
}

function startInterruptionRecognition() {
  if (!isConversationMode.value || !canContinuouslyListen || interruptionRecognition.value) {
    return
  }

  const recognition = createSpeechRecognition('zh-CN', {
    continuous: true,
    interimResults: false
  })

  if (!recognition) {
    return
  }

  interruptionRecognition.value = recognition

  recognition.onresult = (event) => {
    let heardText = ''

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index]
      if (!result.isFinal) {
        continue
      }

      heardText += result[0]?.transcript.trim() ?? ''
    }

    if (heardText.trim().length < 2) {
      return
    }

    pendingTranscript.value = heardText.trim()
    question.value = pendingTranscript.value
    stopSpeaking()
    stopInterruptionRecognition()
    isSpeaking.value = false
    conversationStatus.value = '听到打断，等待你说完'
    clearAutoSubmitTimer()
    autoSubmitTimer = window.setTimeout(submitPendingConversationQuestion, 900)
  }

  recognition.onend = () => {
    interruptionRecognition.value = null
  }

  recognition.onerror = () => {
    interruptionRecognition.value = null
  }

  try {
    recognition.start()
  } catch {
    interruptionRecognition.value = null
  }
}

function scheduleInterruptionRecognition() {
  clearInterruptionStartTimer()
  interruptionStartTimer = window.setTimeout(() => {
    interruptionStartTimer = undefined
    if (isSpeaking.value) {
      startInterruptionRecognition()
    }
  }, 1200)
}

function stopInterruptionRecognition() {
  clearInterruptionStartTimer()
  interruptionRecognition.value?.abort()
  interruptionRecognition.value = null
}

function clearInterruptionStartTimer() {
  if (interruptionStartTimer) {
    window.clearTimeout(interruptionStartTimer)
    interruptionStartTimer = undefined
  }
}

function resumeConversationIfNeeded() {
  if (isConversationMode.value && !isSubmitting.value && !isSpeaking.value) {
    conversationStatus.value = '正在聆听'
    window.setTimeout(startConversationRecognition, 300)
  }
}

onBeforeUnmount(() => {
  stopConversationMode()
  clearAutoSubmitTimer()
  stopSpeaking()
  stopProfessionalAudio()
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

    <section class="app-body" aria-label="视觉对话工作区">
      <HistoryList
        :items="chatSessions"
        :active-id="selectedSessionId"
        @select="selectHistoryItem"
        @clear="clearHistory"
        @new-session="startNewSession"
      />

      <section class="workspace">
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

        <p v-if="!canBrowserSpeak" class="hint-message">
          当前浏览器不支持本地语音回退，将优先使用云端语音播报。
        </p>

        <div class="conversation-bar">
          <div>
            <p class="conversation-title">视频对话</p>
            <p class="conversation-status">
              {{ isVideoConversationActive ? conversationStatus : '点击一次即可开启摄像头和连续语音' }}
            </p>
          </div>
          <button
            class="primary-button"
            type="button"
            :disabled="!canContinuouslyListen"
            @click="isVideoConversationActive ? stopVideoConversation() : startVideoConversation()"
          >
            {{ isVideoConversationActive ? '结束视频对话' : '开始视频对话' }}
          </button>
        </div>

        <div
          v-if="chatTimeline.length"
          ref="chatThreadRef"
          class="chat-thread"
          aria-label="当前聊天记录"
        >
          <div v-for="item in chatTimeline" :key="item.id" class="chat-turn">
            <div class="chat-bubble user-bubble">
              <p>{{ item.question }}</p>
            </div>
            <div class="chat-bubble assistant-bubble">
              <div class="answer-meta">
                <span>{{ item.model }}</span>
                <span>{{ item.created_at }}</span>
                <span v-if="latestAnswer?.created_at === item.created_at">
                  {{ isSpeaking ? '正在播报' : '播报就绪' }}
                </span>
              </div>
              <p>{{ item.answer }}</p>
            </div>
          </div>
        </div>

        <p v-else class="empty-answer">点击开始视频对话后，直接说话提问，聊天记录会显示在这里。</p>

        <div v-if="latestAnswer" class="playback-bar">
          <button
            class="secondary-button"
            type="button"
            :disabled="!canSpeak || isSpeaking"
            @click="playLatestAnswer"
          >
            重新播放最新回答
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

        </section>
      </section>
    </section>
  </main>
</template>
