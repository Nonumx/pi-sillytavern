<script setup lang="ts">
import Bubble from '@/components/ui/bubble/Bubble.vue';
import BubbleContent from '@/components/ui/bubble/BubbleContent.vue';
import Message from '@/components/ui/message/Message.vue';
import MessageContent from '@/components/ui/message/MessageContent.vue';

defineProps<{ content: string }>()
</script>

<template>
    <Message align="end">
        <MessageContent>
            <Bubble>
                <BubbleContent>{{content}}</BubbleContent>
            </Bubble>
        </MessageContent>
    </Message>
</template>