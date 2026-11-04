import type { ChatMessageData } from './types'

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      role?: string
      content?: string | null
    }
  }>
  error?: string
}

export interface ChatCompletionDelta {
  content?: string
  reasoningContent?: string
}

export type ChatTransport = (
  messages: ChatMessageData[],
  onDelta: (delta: ChatCompletionDelta) => void,
  cardId?: string,
) => Promise<void>

interface ChatCompletionChunk {
  choices?: Array<{
    delta?: {
      content?: string | null
      reasoning_content?: string | null
    }
  }>
  error?: string
}

function parseChunk(data: string): ChatCompletionDelta | null {
  if (!data || data === '[DONE]') return null

  const chunk = JSON.parse(data) as ChatCompletionChunk
  if (chunk.error) throw new Error(chunk.error)
  const delta = chunk.choices?.[0]?.delta
  return {
    ...(typeof delta?.content === 'string' ? { content: delta.content } : {}),
    ...(typeof delta?.reasoning_content === 'string'
      ? { reasoningContent: delta.reasoning_content }
      : {}),
  }
}

async function readStream(
  response: Response,
  onDelta: (delta: ChatCompletionDelta) => void,
) {
  if (!response.body) throw new Error('流式聊天响应没有响应体')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const consume = (line: string) => {
    if (!line.startsWith('data:')) return
    const delta = parseChunk(line.slice('data:'.length).trim())
    if (delta && (delta.content || delta.reasoningContent)) onDelta(delta)
  }

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    lines.forEach(consume)
    if (done) break
  }
  if (buffer) consume(buffer)
}

export const requestChatCompletion: ChatTransport = async (
  messages: ChatMessageData[],
  onDelta: (delta: ChatCompletionDelta) => void,
  cardId?: string,
) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, cardId }),
  })

  if (!response.ok) {
    const payload = (await response.json()) as ChatCompletionResponse
    throw new Error(payload.error ?? `聊天请求失败：${response.status}`)
  }

  if (response.headers.get('content-type')?.includes('text/event-stream')) {
    await readStream(response, onDelta)
    return
  }

  const payload = (await response.json()) as ChatCompletionResponse

  const content = payload.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('OpenAI 没有返回可用的回复')
  }

  onDelta({ content })
}
