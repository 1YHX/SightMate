export type ChatRole = 'user' | 'assistant'

export type ChatHistoryMessage = {
  role: ChatRole
  content: string
}

export type VisionChatRequest = {
  question: string
  image_base64: string
  history: ChatHistoryMessage[]
}

export type VisionChatResponse = {
  answer: string
  model: string
  created_at: string
}

export type ChatTurn = {
  id: string
  question: string
  answer: string
  image_base64: string
  model: string
  created_at: string
}

export type ChatHistoryItem = ChatTurn

export type ChatSession = {
  id: string
  title: string
  turns: ChatTurn[]
  created_at: string
  updated_at: string
}

export type SpeechSynthesisRequest = {
  text: string
}

export type SpeechSynthesisResponse = {
  audio_url: string
  format: string
  model: string
}
