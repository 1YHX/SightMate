import type { ChatHistoryItem, ChatSession, ChatTurn } from '../types/chat'

const CHAT_HISTORY_KEY = 'sightmate.chatHistory'
const CHAT_SESSIONS_KEY = 'sightmate.chatSessions'
const MAX_SESSIONS = 20
const MAX_TURNS_PER_SESSION = 100

export function loadChatSessions() {
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

    const migratedSessions = legacyItems
      .filter(isChatTurn)
      .map((item) => createSessionFromTurn(item))
      .slice(0, MAX_SESSIONS)
    saveChatSessions(migratedSessions)
    return migratedSessions
  } catch {
    return []
  }
}

export function loadChatHistory() {
  return loadChatSessions().flatMap((session) => session.turns)
}

export function saveChatSessions(sessions: ChatSession[]) {
  localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)))
}

export function saveChatHistory(history: ChatHistoryItem[]) {
  saveChatSessions(history.map((item) => createSessionFromTurn(item)))
}

export function clearChatHistory() {
  localStorage.removeItem(CHAT_HISTORY_KEY)
  localStorage.removeItem(CHAT_SESSIONS_KEY)
}

export function createChatSession(firstTurn?: ChatTurn): ChatSession {
  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  return {
    id: crypto.randomUUID(),
    title: firstTurn ? summarizeTitle(firstTurn.question) : '新视频对话',
    turns: firstTurn ? [firstTurn] : [],
    created_at: firstTurn?.created_at ?? now,
    updated_at: firstTurn?.created_at ?? now
  }
}

export function addTurnToSession(
  sessions: ChatSession[],
  sessionId: string | undefined,
  turn: ChatTurn
) {
  const targetSession = sessions.find((session) => session.id === sessionId)
  let nextSessions: ChatSession[]
  let nextSessionId: string

  if (targetSession) {
    const updatedSession = {
      ...targetSession,
      title: targetSession.turns.length ? targetSession.title : summarizeTitle(turn.question),
      turns: [...targetSession.turns, turn].slice(-MAX_TURNS_PER_SESSION),
      updated_at: turn.created_at
    }
    nextSessionId = updatedSession.id
    nextSessions = [
      updatedSession,
      ...sessions.filter((session) => session.id !== updatedSession.id)
    ].slice(0, MAX_SESSIONS)
  } else {
    const newSession = createChatSession(turn)
    nextSessionId = newSession.id
    nextSessions = [newSession, ...sessions].slice(0, MAX_SESSIONS)
  }

  saveChatSessions(nextSessions)
  return { sessions: nextSessions, sessionId: nextSessionId }
}

export function createEmptySession(sessions: ChatSession[]) {
  const newSession = createChatSession()
  const nextSessions = [newSession, ...sessions].slice(0, MAX_SESSIONS)
  saveChatSessions(nextSessions)
  return { sessions: nextSessions, sessionId: newSession.id }
}

export function deleteChatSession(sessions: ChatSession[], sessionId: string) {
  const nextSessions = sessions.filter((session) => session.id !== sessionId)
  saveChatSessions(nextSessions)
  return nextSessions
}

function createSessionFromTurn(turn: ChatTurn) {
  return createChatSession(turn)
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
