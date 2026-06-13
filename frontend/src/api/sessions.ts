import type { ChatSession, ChatTurn } from '../types/chat'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

export async function listChatSessions() {
  const response = await fetch(`${API_BASE_URL}/api/sessions`)
  if (!response.ok) {
    throw new Error(`历史会话读取失败，状态码：${response.status}`)
  }

  return (await response.json()) as ChatSession[]
}

export async function createChatSession(title = '新视频对话') {
  const response = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  })
  if (!response.ok) {
    throw new Error(`历史会话创建失败，状态码：${response.status}`)
  }

  return (await response.json()) as ChatSession
}

export async function addChatTurn(sessionId: string, turn: ChatTurn) {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/turns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ turn })
  })
  if (!response.ok) {
    throw new Error(`历史会话保存失败，状态码：${response.status}`)
  }

  return (await response.json()) as ChatSession
}

export async function deleteChatSession(sessionId: string) {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
    method: 'DELETE'
  })
  if (!response.ok) {
    throw new Error(`历史会话删除失败，状态码：${response.status}`)
  }
}

export async function clearChatSessions() {
  const response = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: 'DELETE'
  })
  if (!response.ok) {
    throw new Error(`历史会话清空失败，状态码：${response.status}`)
  }
}
