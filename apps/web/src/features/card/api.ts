import type { CharacterCard } from './types'

export async function fetchCharacterCards(): Promise<CharacterCard[]> {
  const response = await fetch('/api/cards')
  const payload = (await response.json()) as {
    cards?: CharacterCard[]
    error?: string
  }

  if (!response.ok) {
    throw new Error(payload.error ?? `角色卡列表加载失败：${response.status}`)
  }

  return payload.cards ?? []
}
