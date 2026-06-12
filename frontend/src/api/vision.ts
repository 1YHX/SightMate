import type { VisionChatRequest, VisionChatResponse } from '../types/chat'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

export async function chatWithVision(request: VisionChatRequest) {
  const response = await fetch(`${API_BASE_URL}/api/vision/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    throw new Error(`视觉问答请求失败，状态码：${response.status}`)
  }

  return (await response.json()) as VisionChatResponse
}
