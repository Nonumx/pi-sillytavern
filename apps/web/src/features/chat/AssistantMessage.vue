<script setup lang="ts">
import { ref } from 'vue'
import { useEventListener } from "@vueuse/core"
import ThinkingBlock from './ThinkingBlock.vue'

defineProps<{
    html: string
    reasoningContent?: string
    isThinking?: boolean
}>()

const root = ref<HTMLElement | null>(null)

function updateFrameHeight(event: MessageEvent<{ type?: string; height?: number }>) {
    if (event.data?.type !== 'simple-tavern-html-height' || typeof event.data.height !== 'number') return

    const frame = Array.from(root.value?.querySelectorAll<HTMLIFrameElement>('.message-html-frame') ?? [])
        .find((candidate) => candidate.contentWindow === event.source)
    if (frame) frame.style.height = `${Math.max(40, Math.ceil(event.data.height))}px`
}

useEventListener('message', updateFrameHeight)
</script>

<template>
    <ThinkingBlock
        v-if="reasoningContent"
        :content="reasoningContent"
        :is-thinking="isThinking"
    />
    <article ref="root" v-html="html" />
</template>
