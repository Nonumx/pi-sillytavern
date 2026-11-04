<script setup lang="ts">
import { ref } from 'vue'
import { LibraryBig, Menu, SlidersHorizontal } from '@lucide/vue'
import Button from '@/components/ui/button/Button.vue'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer'
import CardPage from '@/features/card/CardPage.vue'
import ChatInput from '@/features/chat/ChatInput.vue'
import ChatMessageList from '@/features/chat/ChatMessageList.vue'
import PresetPage from '@/features/preset/PresetPage.vue'

const drawerOpen = ref(false)
const activeFeature = ref<'card' | 'preset'>('card')

function openFeature(feature: 'card' | 'preset') {
  activeFeature.value = feature
  drawerOpen.value = true
}
</script>

<template>
  <main class="relative flex h-dvh flex-col">
    <Button
      class="fixed top-4 left-4 z-40 rounded-full shadow-md"
      size="icon"
      aria-label="打开角色卡与预设"
      @click="openFeature('card')"
    >
      <Menu class="size-5" />
    </Button>

    <section aria-label="对话记录" aria-live="polite" class="mx-4 mb-2 min-h-0 flex-1">
      <ChatMessageList />
    </section>
    <ChatInput />

    <Drawer v-model:open="drawerOpen">
      <DrawerContent class="h-[80vh]">
        <DrawerTitle class="sr-only">角色卡与预设</DrawerTitle>
        <DrawerDescription class="sr-only">管理当前对话使用的角色卡与预设</DrawerDescription>

        <div class="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside class="shrink-0 border-b p-4 md:w-56 md:border-r md:border-b-0 md:p-6">
            <h1 class="hidden px-3 text-lg font-semibold md:block">Pi Tavern</h1>
            <nav aria-label="功能列表" class="flex gap-2 md:mt-6 md:flex-col">
              <button
                type="button"
                class="flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors md:justify-start"
                :class="activeFeature === 'card' ? 'bg-secondary' : 'hover:bg-accent'"
                @click="activeFeature = 'card'"
              >
                <LibraryBig class="size-4" />
                角色卡
              </button>
              <button
                type="button"
                class="flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors md:justify-start"
                :class="activeFeature === 'preset' ? 'bg-secondary' : 'hover:bg-accent'"
                @click="activeFeature = 'preset'"
              >
                <SlidersHorizontal class="size-4" />
                预设
              </button>
            </nav>
          </aside>

          <section class="min-h-0 flex-1">
            <CardPage v-if="activeFeature === 'card'" @selected="drawerOpen = false" />
            <PresetPage v-else />
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  </main>
</template>
