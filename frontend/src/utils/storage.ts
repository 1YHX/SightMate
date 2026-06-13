import type { ChatSession, ChatTurn } from '../types/chat'

const CHAT_HISTORY_KEY = 'sightmate.chatHistory'
const CHAT_SESSIONS_KEY = 'sightmate.chatSessions'
const MAX_SESSIONS = 20

export function loadLocalChatSessions() {
  try {
    const sessionsValue = localStorage.getItem(CHAT_SESSIONS_KEY)
    if (sessionsValue) {
      const parsedValue = JSON.parse(sessionsValue)
      if (Array.isArray(parsedValue)) {
        return parsedValue.filter(isChatSession).slice(0, MAX_SESSIONS)
      }
    }

    const legacyValue = localStorage.getItem(CHAT_HISTORY_KEY)
    if (!legacyValue) {
      return []
    }

    const legacyItems = JSON.parse(legacyValue)
    if (!Array.isArray(legacyItems)) {
      return []
    }

    return legacyItems
      .filter(isChatTurn)
      .map((item) => createSessionFromTurn(item))
      .slice(0, MAX_SESSIONS)
  } catch {
    return []
  }
}

export function clearLocalChatHistory() {
  localStorage.removeItem(CHAT_HISTORY_KEY)
  localStorage.removeItem(CHAT_SESSIONS_KEY)
}

function createSessionFromTurn(turn: ChatTurn): ChatSession {
  return {
    id: crypto.randomUUID(),
    title: summarizeTitle(turn.question),
    turns: [turn],
    created_at: turn.created_at,
    updated_at: turn.created_at
  }
}

function summarizeTitle(text: string, maxLength = 18) {
  const normalizedText = text.replace(/\s+/g, ' ').trim()
  return normalizedText.length > maxLength ? `${normalizedText.slice(0, maxLength)}...` : normalizedText
}

function isChatSession(value: unknown): value is ChatSession {
  if (!value || typeof value !== 'object') {
    return false
  }

  const session = value as Record<string, unknown>
  return (
    typeof session.id === 'string' &&
    typeof session.title === 'string' &&
    Array.isArray(session.turns) &&
    session.turns.every(isChatTurn) &&
    typeof session.created_at === 'string' &&
    typeof session.updated_at === 'string'
  )
}

function isChatTurn(value: unknown): value is ChatTurn {
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
