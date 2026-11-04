import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import MarkdownIt from 'markdown-it'
import { useCardStore } from '@/features/card/useCardStore'
import { requestChatCompletion } from './api'
import type { ChatMessageData, DisplayMessage } from './types'

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true })

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessageData[]>([])
  const isSending = ref(false)

  const displayMessages = computed<DisplayMessage[]>(() =>
    messages.value.map((message) => {
      if (message.role !== 'assistant') {
        return {
          id: message.id,
          role: message.role,
          content: message.content,
        }
      }

      return {
        id: message.id,
        role: message.role,
        html: markdown.render(message.content),
        reasoningContent: message.reasoningContent,
        isThinking: message.isStreaming,
      }
    }),
  )

  async function sendMessage(content: string) {
    const text = content.trim()
    if (!text || isSending.value) return

    const cardStore = useCardStore()
    isSending.value = true
    const userId = crypto.randomUUID()
    const assistantId = crypto.randomUUID()
    messages.value.push({ id: userId, role: 'user', content: text })
    const history = [...messages.value]
    messages.value.push({
      id: assistantId,
      role: 'assistant',
      content: '',
      reasoningContent: '',
      isStreaming: true,
    })

    try {
      await requestChatCompletion(
        history,
        (delta) => {
          const assistant = messages.value.find(
            (message) => message.id === assistantId,
          )
          if (!assistant) return
          if (delta.content) assistant.content += delta.content
          if (delta.reasoningContent) {
            assistant.reasoningContent =
              (assistant.reasoningContent ?? '') + delta.reasoningContent
          }
        },
        cardStore.selectedCardId,
      )
    } catch (error) {
      messages.value = messages.value.filter(
        (message) => message.id !== userId && message.id !== assistantId,
      )
      throw error
    } finally {
      const assistant = messages.value.find(
        (message) => message.id === assistantId,
      )
      if (assistant) assistant.isStreaming = false
      isSending.value = false
    }
  }

  function resetConversation(opening = '') {
    messages.value = opening.trim()
      ? [{ id: crypto.randomUUID(), role: 'assistant', content: opening }]
      : []
  }

  return { messages, isSending, displayMessages, sendMessage, resetConversation }
})
