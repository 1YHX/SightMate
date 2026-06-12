import type { ChatHistoryItem } from '../types/chat'

const CHAT_HISTORY_KEY = 'sightmate.chatHistory'
const MAX_HISTORY_ITEMS = 20

export function loadChatHistory() {
  try {
    const rawValue = localStorage.getItem(CHAT_HISTORY_KEY)
    if (!rawValue) {
      return []
    }

    const parsedValue = JSON.parse(rawValue)
    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue.filter(isChatHistoryItem).slice(0, MAX_HISTORY_ITEMS)
  } catch {
    return []
  }
}

export function saveChatHistory(history: ChatHistoryItem[]) {
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)))
}

export function clearChatHistory() {
  localStorage.removeItem(CHAT_HISTORY_KEY)
}

export function prependChatHistoryItem(
  history: ChatHistoryItem[],
  item: ChatHistoryItem
) {
  const nextHistory = [item, ...history].slice(0, MAX_HISTORY_ITEMS)
  saveChatHistory(nextHistory)
  return nextHistory
}

function isChatHistoryItem(value: unknown): value is ChatHistoryItem {
  if (!value || typeof value !== 'object') {
    return false
  }

  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.question === 'string' &&
    typeof item.answer === 'string' &&
    typeof item.image_base64 === 'string' &&
    typeof item.model === 'string' &&
    typeof item.created_at === 'string'
  )
}
