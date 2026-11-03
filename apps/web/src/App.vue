<script setup lang="ts">
import ChatMessageList from '@/features/chat/ChatMessageList.vue';
import ChatInput from '@/features/chat/ChatInput.vue';
</script>

<template>
  <main class="flex h-dvh flex-col">
    <section aria-label="对话记录" aria-live="polite" class="mx-4 mb-2 min-h-0 flex-1">
      <ChatMessageList />
    </section>
    <ChatInput />
  </main>
</template>

<style scoped></style>
