<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronRightIcon } from '@lucide/vue'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

const props = defineProps<{
  content: string
  isThinking?: boolean
}>()

const open = ref(Boolean(props.isThinking))

watch(() => props.isThinking, (isThinking) => {
  open.value = Boolean(isThinking)
})

const preview = computed(() => props.content.split(/\r?\n/).slice(-5).join('\n'))
</script>

<template>
  <Collapsible
    v-model:open="open"
    data-testid="thinking-block"
    class="mb-3 rounded-md border border-border/60 bg-muted/30"
  >
    <CollapsibleTrigger
      class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-muted-foreground"
      data-testid="thinking-trigger"
    >
      <span>思考过程</span>
      <ChevronRightIcon class="size-4 transition-transform" :class="{ 'rotate-90': open }" />
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div data-testid="thinking-content" class="border-t border-border/60 px-3 py-2 text-sm leading-6 text-muted-foreground">
        <pre class="max-h-36 overflow-y-auto whitespace-pre-wrap font-sans">{{ preview }}</pre>
      </div>
    </CollapsibleContent>
  </Collapsible>
</template>
