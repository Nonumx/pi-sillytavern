import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchCharacterCards } from './api'
import type { CharacterCard } from './types'

const CARD_STORAGE_KEY = 'pi-tavern-selected-card'
const GREETING_STORAGE_KEY = 'pi-tavern-selected-greeting'

function readGreetingIndex(): number {
  const index = Number(localStorage.getItem(GREETING_STORAGE_KEY) ?? 0)
  return Number.isInteger(index) && index >= 0 ? index : 0
}

export const useCardStore = defineStore('card', () => {
  const cards = ref<CharacterCard[]>([])
  const selectedCardId = ref(localStorage.getItem(CARD_STORAGE_KEY) ?? undefined)
  const selectedGreetingIndex = ref(readGreetingIndex())
  const isLoading = ref(false)
  const error = ref('')

  async function loadCards() {
    if (isLoading.value) return

    isLoading.value = true
    error.value = ''
    try {
      cards.value = await fetchCharacterCards()
      if (
        selectedCardId.value &&
        !cards.value.some((card) => card.id === selectedCardId.value)
      ) {
        selectCard(undefined)
      }
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause)
    } finally {
      isLoading.value = false
    }
  }

  function selectCard(id: string | undefined, greetingIndex = 0) {
    selectedCardId.value = id
    selectedGreetingIndex.value = greetingIndex
    if (id) {
      localStorage.setItem(CARD_STORAGE_KEY, id)
      localStorage.setItem(GREETING_STORAGE_KEY, String(greetingIndex))
    } else {
      localStorage.removeItem(CARD_STORAGE_KEY)
      localStorage.removeItem(GREETING_STORAGE_KEY)
    }
  }

  return {
    cards,
    selectedCardId,
    selectedGreetingIndex,
    isLoading,
    error,
    loadCards,
    selectCard,
  }
})
