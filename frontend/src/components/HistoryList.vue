<script setup lang="ts">
import { ref } from 'vue'
import type { ChatHistoryItem } from '../types/chat'

defineProps<{
  items: ChatHistoryItem[]
  activeId?: string
}>()

defineEmits<{
  clear: []
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

function summarize(text: string, maxLength = 64) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}
</script>

<template>
  <aside class="history-panel tool-panel" aria-labelledby="history-title">
    <div class="panel-header">
      <div>
        <p class="eyebrow">历史归档</p>
        <h2 id="history-title">本地保存记录</h2>
      </div>
      <button
        class="secondary-button compact-button"
        type="button"
        :disabled="!items.length"
        @click="$emit('clear')"
      >
        清空历史
      </button>
    </div>

    <p v-if="!items.length" class="hint-message">暂无本地历史记录。</p>

    <ol v-else class="history-list">
      <li v-for="item in items" :key="item.id" class="history-item">
        <div class="history-content">
          <div class="answer-meta">
            <span>{{ item.model }}</span>
            <span>{{ item.created_at }}</span>
          </div>
          <button
            class="history-summary-button"
            type="button"
            :class="{ active: activeId === item.id }"
            @click="$emit('select', item.id); toggleItem(item.id)"
          >
            <span>{{ summarize(item.question) }}</span>
            <span>{{ expandedIds.has(item.id) ? '收起' : '展开' }}</span>
          </button>
          <div v-if="expandedIds.has(item.id)" class="history-detail">
            <p class="history-question">你：{{ item.question }}</p>
            <p class="history-answer">SightMate：{{ item.answer }}</p>
          </div>
        </div>
      </li>
    </ol>
  </aside>
</template>
