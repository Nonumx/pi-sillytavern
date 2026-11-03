<script setup lang="ts">
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import MessageScroller from '@/components/ui/message-scroller/MessageScroller.vue';
import MessageScrollerContent from '@/components/ui/message-scroller/MessageScrollerContent.vue';
import MessageScrollerItem from '@/components/ui/message-scroller/MessageScrollerItem.vue';
import MessageScrollerProvider from '@/components/ui/message-scroller/MessageScrollerProvider.vue';
import MessageScrollerViewport from '@/components/ui/message-scroller/MessageScrollerViewport.vue';
import MessageScrollerButton from '@/components/ui/message-scroller/MessageScrollerButton.vue';
import UserMessage from './UserMessage.vue';
import AssistantMessage from './AssistantMessage.vue';
import SystemMessage from './SystemMessage.vue';

const chat = useChatStore()
const { displayMessages } = storeToRefs(chat)

onMounted(() => {
    chat.loadPreset(TEST_PRESET_ID)
    chat.loadCharacterCard(TEST_CHARACTER_CARD_ID)
})
</script>

<template>
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
        <MessageScroller>
            <MessageScrollerViewport>
                <MessageScrollerContent class="pt-4">
                    <MessageScrollerItem v-for="(message, index) in displayMessages" :key="message.id" :messageId="message.id"
                        :scrollAnchor="index === displayMessages.length - 1">
                        <UserMessage v-if="message.role === 'user'" :content="message.content" />
                        <AssistantMessage
                            v-if="message.role === 'assistant'"
                            :html="message.html"
                            :reasoning-content="message.reasoningContent"
                            :is-thinking="message.isThinking"
                        />
                        <SystemMessage v-if="message.role === 'system'" :content="message.content" />
                    </MessageScrollerItem>
                </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton direction="end" aria-label="滚动到底部" />
        </MessageScroller>
    </MessageScrollerProvider>
</template>
