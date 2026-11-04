import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import MarkdownIt from 'markdown-it'
import { useCardStore } from '@/features/card/useCardStore'
import { requestChatCompletion } from './api'
import { isHtmlDocumentCodeBlock, renderHtmlInIframe } from './htmlFrame'
import { applyRegexScripts } from './regex'
import type { ChatMessageData, DisplayMessage } from './types'

const markdown = new MarkdownIt({ html: true, linkify: true, breaks: true })
const defaultFence = markdown.renderer.rules.fence

markdown.renderer.rules.fence = (tokens, index, options, env, self) => {
  const token = tokens[index]!
  if (isHtmlDocumentCodeBlock(token.content)) {
    return renderHtmlInIframe(token.content)
  }
  return (
    defaultFence?.(tokens, index, options, env, self) ??
    self.renderToken(tokens, index, options)
  )
}

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
    if (cardStore.selectedCardId && cardStore.cards.length === 0) {
      await cardStore.loadCards()
    }
    const regexScripts =
      cardStore.cards.find((card) => card.id === cardStore.selectedCardId)?.data
        .extensions?.regex_scripts ?? []
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

      const assistant = messages.value.find(
        (message) => message.id === assistantId,
      )
      if (assistant) {
        const generatedContent = assistant.content
        assistant.content = applyRegexScripts(
          generatedContent,
          regexScripts,
          'markdown',
        )
        assistant.promptContent = applyRegexScripts(
          generatedContent,
          regexScripts,
          'prompt',
        )
      }
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
    if (!opening.trim()) {
      messages.value = []
      return
    }

    const cardStore = useCardStore()
    const regexScripts =
      cardStore.cards.find((card) => card.id === cardStore.selectedCardId)?.data
        .extensions?.regex_scripts ?? []
    messages.value = [
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: applyRegexScripts(opening, regexScripts, 'markdown'),
        promptContent: applyRegexScripts(opening, regexScripts, 'prompt'),
      },
    ]
  }

  return { messages, isSending, displayMessages, sendMessage, resetConversation }
})
