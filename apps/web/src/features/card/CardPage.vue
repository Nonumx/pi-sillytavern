<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Check, RefreshCw } from '@lucide/vue'
import Alert from '@/components/ui/alert/Alert.vue'
import Button from '@/components/ui/button/Button.vue'
import ScrollArea from '@/components/ui/scroll-area/ScrollArea.vue'
import Spinner from '@/components/ui/spinner/Spinner.vue'
import { useChatStore } from '@/features/chat/useChatStore'
import { useCardStore } from './useCardStore'
import type { CharacterCard } from './types'

const emit = defineEmits<{
  selected: []
}>()

const cardStore = useCardStore()
const chatStore = useChatStore()
const {
  cards,
  selectedCardId,
  selectedGreetingIndex: appliedGreetingIndex,
  isLoading,
  error,
} = storeToRefs(cardStore)
const previewCardId = ref<string>()
const previewGreetingIndex = ref(0)

const previewCard = computed(() =>
  cards.value.find((card) => card.id === previewCardId.value),
)
const greetings = computed(() => {
  const card = previewCard.value
  if (!card) return []
  return [card.first_mes, ...card.data.alternate_greetings].filter(
    (text) => text.trim().length > 0,
  )
})
const activeGreetingIndex = computed(() =>
  greetings.value[previewGreetingIndex.value] === undefined
    ? 0
    : previewGreetingIndex.value,
)
const activeGreeting = computed(
  () => greetings.value[activeGreetingIndex.value] ?? '',
)
const isCurrentGreeting = computed(
  () =>
    chatStore.messages.length > 0 &&
    selectedCardId.value === previewCardId.value &&
    appliedGreetingIndex.value === activeGreetingIndex.value,
)

watch(
  cards,
  (items) => {
    if (items.some((card) => card.id === previewCardId.value)) return
    previewCardId.value =
      items.find((card) => card.id === selectedCardId.value)?.id ?? items[0]?.id
  },
  { immediate: true },
)
watch(
  previewCardId,
  (id) => {
    previewGreetingIndex.value =
      id === selectedCardId.value ? appliedGreetingIndex.value : 0
  },
  { immediate: true },
)

onMounted(() => void cardStore.loadCards())

function selectCard(card: CharacterCard) {
  if (!isCurrentGreeting.value) {
    cardStore.selectCard(card.id, activeGreetingIndex.value)
    chatStore.resetConversation(activeGreeting.value)
  }
  emit('selected')
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div v-if="isLoading" class="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
      <Spinner class="size-5" />
      <span class="text-sm">正在加载角色卡</span>
    </div>

    <div v-else-if="error" class="flex flex-1 items-center justify-center p-6">
      <Alert variant="destructive" class="max-w-md">
        <div class="flex items-center justify-between gap-4">
          <span>{{ error }}</span>
          <Button variant="outline" size="sm" @click="cardStore.loadCards">
            <RefreshCw />
            重试
          </Button>
        </div>
      </Alert>
    </div>

    <div v-else-if="cards.length === 0" class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      暂无可用角色卡
    </div>

    <div v-else class="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[16rem_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]">
      <ScrollArea class="min-w-0 border-b md:border-r md:border-b-0">
        <div class="flex gap-2 overflow-x-auto p-3 md:flex-col md:overflow-visible">
          <button
            v-for="card in cards"
            :key="card.id"
            type="button"
            class="flex min-w-56 items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent md:w-full md:min-w-0"
            :class="previewCardId === card.id ? 'border-primary bg-accent' : 'bg-background'"
            @click="previewCardId = card.id"
          >
            <img :src="card.imageUrl" :alt="card.name" class="size-12 shrink-0 rounded-md object-cover" />
            <span class="min-w-0 flex-1 truncate font-medium">{{ card.name }}</span>
            <Check v-if="selectedCardId === card.id" class="size-4 shrink-0 text-primary" />
          </button>
        </div>
      </ScrollArea>

      <section v-if="previewCard" class="min-h-0 min-w-0">
        <article class="flex h-full min-h-0 min-w-0 flex-col p-4 md:p-6">
          <div class="shrink-0">
            <div class="flex items-center gap-4">
              <img
                :src="previewCard.imageUrl"
                :alt="previewCard.name"
                class="aspect-square w-1/3 max-w-32 shrink-0 rounded-xl border object-cover shadow-sm"
              />
              <div class="min-w-0 flex-1">
                <h3 class="line-clamp-2 min-w-0 break-words text-xl font-semibold">{{ previewCard.name }}</h3>
                <p class="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {{ previewCard.data.character_book?.entries.length ?? 0 }} 条世界书 ·
                  {{ previewCard.data.alternate_greetings.length }} 个备选开局
                </p>
                <span v-if="selectedCardId === previewCard.id" class="mt-2 inline-block rounded-full bg-secondary px-2 py-1 text-xs">
                  当前角色卡
                </span>
              </div>
            </div>
            <Button class="mt-4" @click="selectCard(previewCard)">
              {{ isCurrentGreeting ? '返回当前对话' : selectedCardId === previewCard.id ? '使用此开局' : '使用此角色卡' }}
            </Button>
          </div>

          <dl class="mt-6 flex min-h-0 flex-1 flex-col gap-6">
            <div v-if="previewCard.description" class="shrink-0">
              <dt class="text-sm font-semibold">角色描述</dt>
              <dd class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{{ previewCard.description }}</dd>
            </div>
            <div v-if="previewCard.personality" class="shrink-0">
              <dt class="text-sm font-semibold">性格</dt>
              <dd class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{{ previewCard.personality }}</dd>
            </div>
            <div v-if="previewCard.scenario" class="shrink-0">
              <dt class="text-sm font-semibold">场景</dt>
              <dd class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{{ previewCard.scenario }}</dd>
            </div>
            <div v-if="greetings.length > 0" class="flex min-h-0 flex-1 flex-col">
              <div class="flex shrink-0 items-center justify-between gap-3">
                <dt class="text-sm font-semibold">开场白</dt>
                <select
                  v-if="greetings.length > 1"
                  v-model.number="previewGreetingIndex"
                  aria-label="选择开场白"
                  class="h-8 max-w-36 rounded-md border bg-background px-2 text-xs shadow-xs"
                >
                  <option v-for="(_, index) in greetings" :key="index" :value="index">
                    {{ index === 0 ? '默认开局' : `备选开局 ${index}` }}
                  </option>
                </select>
              </div>
              <ScrollArea class="mt-2 min-h-0 flex-1">
                <dd class="whitespace-pre-wrap pr-3 text-sm leading-7 text-muted-foreground">{{ activeGreeting }}</dd>
              </ScrollArea>
            </div>
          </dl>
        </article>
      </section>
    </div>
  </div>
</template>
