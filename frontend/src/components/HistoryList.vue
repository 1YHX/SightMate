<script setup lang="ts">
import type { ChatHistoryItem } from '../types/chat'

defineProps<{
  items: ChatHistoryItem[]
}>()

defineEmits<{
  clear: []
}>()
</script>

<template>
  <section class="history-panel tool-panel" aria-labelledby="history-title">
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
        <img :src="item.image_base64" alt="历史截图" />
        <div class="history-content">
          <div class="answer-meta">
            <span>{{ item.model }}</span>
            <span>{{ item.created_at }}</span>
          </div>
          <p class="history-question">{{ item.question }}</p>
          <p class="history-answer">{{ item.answer }}</p>
        </div>
      </li>
    </ol>
  </section>
</template>
