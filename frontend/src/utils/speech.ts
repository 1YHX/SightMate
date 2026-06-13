export type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

export type SpeechRecognitionErrorEvent = {
  error: string
  message?: string
}

export type SpeechRecognitionEvent = {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      length: number
      [index: number]: {
        transcript: string
      }
    }
  }
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition

type WindowWithSpeechRecognition = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }

export function isSpeechRecognitionSupported() {
  const speechWindow = window as WindowWithSpeechRecognition
  return Boolean(speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition)
}

export function createSpeechRecognition(
  lang = 'zh-CN',
  options: {
    continuous?: boolean
    interimResults?: boolean
  } = {}
) {
  const speechWindow = window as WindowWithSpeechRecognition
  const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition

  if (!Recognition) {
    return null
  }

  const recognition = new Recognition()
  recognition.lang = lang
  recognition.continuous = options.continuous ?? false
  recognition.interimResults = options.interimResults ?? true

  return recognition
}

export function getSpeechErrorMessage(error: string) {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return '麦克风权限被拒绝，请允许浏览器使用麦克风，或直接使用文字输入。'
    case 'no-speech':
      return '没有识别到语音，请靠近麦克风重试，或直接使用文字输入。'
    case 'audio-capture':
      return '没有找到可用麦克风，请检查设备连接，或直接使用文字输入。'
    case 'network':
      return '语音识别服务暂时不可用，请稍后重试，或直接使用文字输入。'
    case 'aborted':
      return ''
    default:
      return '语音识别失败，请重试，或直接使用文字输入。'
  }
}

export function isSpeechSynthesisSupported() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

export function speakText(
  text: string,
  options: {
    lang?: string
    onStart?: () => void
    onEnd?: () => void
    onError?: () => void
  } = {}
) {
  if (!isSpeechSynthesisSupported()) {
    throw new Error('当前浏览器不支持语音播报。')
  }

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(toBriefSpeakableText(text))
  utterance.lang = options.lang ?? 'zh-CN'
  utterance.rate = 1.08
  utterance.pitch = 1.12
  utterance.voice = findLivelyChineseVoice()

  utterance.onstart = () => {
    options.onStart?.()
  }

  utterance.onend = () => {
    options.onEnd?.()
  }

  utterance.onerror = () => {
    options.onError?.()
  }

  window.speechSynthesis.speak(utterance)
}

function toSpeakableText(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, '代码内容已省略。')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toBriefSpeakableText(text: string) {
  const speakableText = toSpeakableText(text)
  const sentences = speakableText.match(/[^。！？!?]+[。！？!?]?/g) ?? [speakableText]
  const briefText = sentences.slice(0, 2).join('').trim()

  if (briefText.length <= 120) {
    return briefText
  }

  return `${briefText.slice(0, 120)}。`
}

function findLivelyChineseVoice() {
  const voices = window.speechSynthesis.getVoices()
  const preferredNames = [
    'Xiaoxiao',
    'Xiaoyi',
    'Ting-Ting',
    'Mei-Jia',
    'Sinji',
    'Google 普通话',
    'Google 國語',
    'Google 中文'
  ]

  return (
    voices.find((voice) => preferredNames.some((name) => voice.name.includes(name))) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith('zh')) ??
    null
  )
}

export function stopSpeaking() {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel()
  }
}
