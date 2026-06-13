<script setup lang="ts">
import { ref } from 'vue'
import type { ChatSession } from '../types/chat'

defineProps<{
  items: ChatSession[]
  activeId?: string
}>()

defineEmits<{
  clear: []
  delete: [id: string]
  newSession: []
  select: [id: string]
}>()

const expandedIds = ref<Set<string>>(new Set())

function toggleItem(id: string) {
  const nextIds = new Set(expandedIds.value)
  if (nextIds.has(id)) {
    nextIds.delete(id)
  } else {
    nextIds.add(id)
  }
  expandedIds.value = nextIds
}

function summarize(text: string, maxLength = 32) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}
</script>

<template>
  <aside class="history-panel tool-panel" aria-labelledby="history-title">
    <div class="panel-header">
      <div>
        <p class="eyebrow">历史归档</p>
        <h2 id="history-title">对话</h2>
      </div>
      <button class="secondary-button compact-button" type="button" @click="$emit('newSession')">
        新对话
      </button>
    </div>

    <div class="history-actions">
      <button
        class="secondary-button compact-button"
        type="button"
        :disabled="!items.length"
        @click="$emit('clear')"
      >
        清空历史
      </button>
    </div>

    <p v-if="!items.length" class="hint-message">暂无本地对话。</p>

    <ol v-else class="history-list">
      <li v-for="item in items" :key="item.id" class="history-item">
        <div class="history-content">
          <div class="answer-meta">
            <span>{{ item.turns[item.turns.length - 1]?.model ?? 'SightMate' }}</span>
            <span>{{ item.updated_at }}</span>
            <span>{{ item.turns.length }} 轮</span>
          </div>
          <div class="history-row">
            <button
              class="history-summary-button"
              type="button"
              :class="{ active: activeId === item.id }"
              @click="$emit('select', item.id); toggleItem(item.id)"
            >
              <span>{{ summarize(item.title) }}</span>
              <span>{{ expandedIds.has(item.id) ? '收起' : '展开' }}</span>
            </button>
            <button
              class="history-delete-button"
              type="button"
              aria-label="删除对话"
              title="删除对话"
              @click.stop="$emit('delete', item.id)"
            >
              删除
            </button>
          </div>
          <div v-if="expandedIds.has(item.id)" class="history-detail">
            <p
              v-for="turn in item.turns.slice(-3)"
              :key="turn.id"
              class="history-answer"
            >
              {{ summarize(turn.question, 40) }}
            </p>
          </div>
        </div>
      </li>
    </ol>
  </aside>
</template>
