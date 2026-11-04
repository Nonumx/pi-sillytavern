export interface ChatMessageData {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  reasoningContent?: string
  promptContent?: string
  isStreaming?: boolean
}

export type DisplayMessage =
  | { id: string; role: 'user' | 'system'; content: string }
  | {
      id: string
      role: 'assistant'
      html: string
      reasoningContent?: string
      isThinking?: boolean
    }
