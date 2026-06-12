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
