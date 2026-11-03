<script setup lang="ts">
import Alert from '@/components/ui/alert/Alert.vue';
import AlertDescription from '@/components/ui/alert/AlertDescription.vue';
import Dialog from '@/components/ui/dialog/Dialog.vue';
import DialogContent from '@/components/ui/dialog/DialogContent.vue';
import DialogDescription from '@/components/ui/dialog/DialogDescription.vue';
import DialogTitle from '@/components/ui/dialog/DialogTitle.vue';
import DialogTrigger from '@/components/ui/dialog/DialogTrigger.vue';
import ScrollArea from '@/components/ui/scroll-area/ScrollArea.vue';

defineProps<{ content: string }>()
</script>

<template>
    <Dialog>
        <DialogTrigger as-child>
            <Alert
                role="button"
                class="cursor-pointer transition-colors hover:bg-muted/40"
            >
                <AlertDescription class="line-clamp-3 whitespace-pre-wrap">
                    {{ content }}
                </AlertDescription>
            </Alert>
        </DialogTrigger>

        <DialogContent class="sm:max-w-2xl">
            <DialogTitle class="sr-only">系统消息</DialogTitle>
            <ScrollArea class="max-h-[70vh]">
                <DialogDescription class="whitespace-pre-wrap pr-4">
                    {{ content }}
                </DialogDescription>
            </ScrollArea>
        </DialogContent>
    </Dialog>
</template>
