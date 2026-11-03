<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import InputGroup from '@/components/ui/input-group/InputGroup.vue';
import InputGroupAddon from '@/components/ui/input-group/InputGroupAddon.vue';
import InputGroupButton from '@/components/ui/input-group/InputGroupButton.vue';
import InputGroupTextarea from '@/components/ui/input-group/InputGroupTextarea.vue';
import { ArrowUpIcon } from '@lucide/vue';
import { useChatStore } from './useChatStore';

const chat = useChatStore();
const { isSending } = storeToRefs(chat);
const content = ref('');
const canSend = computed(() => content.value.trim().length > 0 && !isSending.value);

async function send() {
    if (!canSend.value) return;

    const message = content.value;
    content.value = '';
    try {
        await chat.sendMessage(message);
    } catch (error) {
        content.value = message;
        console.error('发送消息失败', error);
    }
}
</script>

<template>
    <InputGroup>
        <InputGroupTextarea v-model="content" placeholder="输入些消息..." @keydown.enter.exact.prevent="send" />
        <InputGroupAddon align="block-end" class="justify-end">
            <InputGroupButton variant="default" class="rounded-full" size="icon-xs" :disabled="!canSend" @click="send">
                <ArrowUpIcon class="size-4" />
                <span class="sr-only">Send</span>
            </InputGroupButton>
        </InputGroupAddon>
    </InputGroup>
</template>
