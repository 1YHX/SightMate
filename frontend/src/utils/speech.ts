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

export function createSpeechRecognition(lang = 'zh-CN') {
  const speechWindow = window as WindowWithSpeechRecognition
  const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition

  if (!Recognition) {
    return null
  }

  const recognition = new Recognition()
  recognition.lang = lang
  recognition.continuous = false
  recognition.interimResults = true

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
