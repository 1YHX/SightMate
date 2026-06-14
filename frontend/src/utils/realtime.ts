export type RealtimeClientOptions = {
  onStatus?: (status: string) => void
  onUserTranscript?: (text: string) => void
  onAssistantTranscript?: (text: string) => void
  onAssistantDone?: (text: string) => void
  onError?: (message: string) => void
}

const INPUT_SAMPLE_RATE = 16000
const OUTPUT_SAMPLE_RATE = 24000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

export class RealtimeClient {
  private socket: WebSocket | null = null
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private scriptProcessor: ScriptProcessorNode | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private playbackContext: AudioContext | null = null
  private nextPlaybackTime = 0
  private assistantText = ''

  constructor(private readonly options: RealtimeClientOptions = {}) {}

  async start() {
    this.options.onStatus?.('正在连接实时模型')
    const apiUrl = new URL(API_BASE_URL, window.location.origin)
    const socketProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
    const socketUrl = `${socketProtocol}//${apiUrl.host}/api/realtime/ws`
    this.socket = new WebSocket(socketUrl)

    await new Promise<void>((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('实时连接创建失败。'))
        return
      }

      this.socket.onopen = () => resolve()
      this.socket.onerror = () => reject(new Error('实时模型连接失败。'))
    })

    this.bindSocketEvents()
    this.sendSessionUpdate()
    await this.startMicrophone()
    this.options.onStatus?.('实时聆听中')
  }

  stop() {
    this.scriptProcessor?.disconnect()
    this.sourceNode?.disconnect()
    this.mediaStream?.getTracks().forEach((track) => track.stop())
    void this.audioContext?.close()
    void this.playbackContext?.close()
    this.socket?.close()

    this.socket = null
    this.audioContext = null
    this.mediaStream = null
    this.scriptProcessor = null
    this.sourceNode = null
    this.playbackContext = null
    this.nextPlaybackTime = 0
    this.assistantText = ''
  }

  sendVideoFrame(dataUrl: string) {
    const base64Image = dataUrl.split(',')[1]
    if (!base64Image || base64Image.length > 256 * 1024) {
      return
    }

    this.send({
      type: 'input_image_buffer.append',
      image: base64Image
    })
  }

  private bindSocketEvents() {
    if (!this.socket) {
      return
    }

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleServerEvent(message)
      } catch {
        this.options.onError?.('实时模型返回了无法解析的消息。')
      }
    }

    this.socket.onclose = () => {
      this.options.onStatus?.('实时连接已断开')
    }
  }

  private sendSessionUpdate() {
    this.send({
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        input_audio_format: 'pcm',
        output_audio_format: 'pcm',
        voice: 'Tina',
        input_audio_transcription: {
          model: 'qwen3-asr-flash-realtime'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.2,
          silence_duration_ms: 800,
          create_response: true,
          interrupt_response: true
        }
      }
    })
  }

  private async startMicrophone() {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    })
    this.audioContext = new AudioContext()
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)
    this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1)

    this.scriptProcessor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0)
      const pcm16 = downsampleToPcm16(input, this.audioContext?.sampleRate ?? 48000, INPUT_SAMPLE_RATE)
      this.send({
        type: 'input_audio_buffer.append',
        audio: arrayBufferToBase64(pcm16.buffer)
      })
    }

    this.sourceNode.connect(this.scriptProcessor)
    this.scriptProcessor.connect(this.audioContext.destination)
  }

  private handleServerEvent(message: Record<string, unknown>) {
    switch (message.type) {
      case 'input_audio_buffer.speech_started':
        this.options.onStatus?.('听到你说话')
        break
      case 'input_audio_buffer.speech_stopped':
        this.options.onStatus?.('正在思考')
        break
      case 'conversation.item.input_audio_transcription.completed':
        if (typeof message.transcript === 'string') {
          this.options.onUserTranscript?.(message.transcript)
        }
        break
      case 'conversation.item.input_audio_transcription.delta':
        if (typeof message.text === 'string' || typeof message.stash === 'string') {
          const text = typeof message.text === 'string' ? message.text : ''
          const stash = typeof message.stash === 'string' ? message.stash : ''
          this.options.onUserTranscript?.(`${text}${stash}`)
        }
        break
      case 'response.audio_transcript.delta':
        if (typeof message.delta === 'string') {
          this.assistantText += message.delta
          this.options.onAssistantTranscript?.(this.assistantText)
        }
        break
      case 'response.audio_transcript.done':
        if (typeof message.transcript === 'string') {
          this.assistantText = message.transcript
        }
        this.options.onAssistantDone?.(this.assistantText)
        this.assistantText = ''
        break
      case 'response.audio.delta':
        if (typeof message.delta === 'string') {
          this.playAudioDelta(message.delta)
        }
        break
      case 'error':
        this.options.onError?.(String(message.message ?? '实时模型调用失败。'))
        break
    }
  }

  private playAudioDelta(base64Audio: string) {
    const pcm16 = base64ToInt16Array(base64Audio)
    if (!pcm16.length) {
      return
    }

    if (!this.playbackContext) {
      this.playbackContext = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE })
      this.nextPlaybackTime = this.playbackContext.currentTime
    }

    const audioBuffer = this.playbackContext.createBuffer(1, pcm16.length, OUTPUT_SAMPLE_RATE)
    const channel = audioBuffer.getChannelData(0)
    for (let index = 0; index < pcm16.length; index += 1) {
      channel[index] = pcm16[index] / 32768
    }

    const source = this.playbackContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.playbackContext.destination)
    const startTime = Math.max(this.nextPlaybackTime, this.playbackContext.currentTime)
    source.start(startTime)
    this.nextPlaybackTime = startTime + audioBuffer.duration
  }

  private send(payload: Record<string, unknown>) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload))
    }
  }
}

function downsampleToPcm16(input: Float32Array, sourceRate: number, targetRate: number) {
  if (sourceRate === targetRate) {
    return floatToPcm16(input)
  }

  const ratio = sourceRate / targetRate
  const outputLength = Math.floor(input.length / ratio)
  const output = new Float32Array(outputLength)

  for (let index = 0; index < outputLength; index += 1) {
    output[index] = input[Math.floor(index * ratio)] ?? 0
  }

  return floatToPcm16(output)
}

function floatToPcm16(input: Float32Array) {
  const output = new Int16Array(input.length)
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index] ?? 0))
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return output
}

function arrayBufferToBase64(buffer: ArrayBufferLike) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function base64ToInt16Array(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Int16Array(bytes.buffer)
}
