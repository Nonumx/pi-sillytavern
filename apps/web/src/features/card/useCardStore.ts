import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchCharacterCards } from './api'
import type { CharacterCard } from './types'

const STORAGE_KEY = 'pi-tavern-selected-card'

export const useCardStore = defineStore('card', () => {
  const cards = ref<CharacterCard[]>([])
  const selectedCardId = ref(localStorage.getItem(STORAGE_KEY) ?? undefined)
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

  function selectCard(id: string | undefined) {
    selectedCardId.value = id
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  }

  return { cards, selectedCardId, isLoading, error, loadCards, selectCard }
})
