<script setup lang="ts">
import { ref } from 'vue'
import { ChevronLeft, ChevronRight, LibraryBig, Menu, SlidersHorizontal } from '@lucide/vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import type { Swiper as SwiperInstance } from 'swiper'
import 'swiper/css'
import Button from '@/components/ui/button/Button.vue'
import Dialog from '@/components/ui/dialog/Dialog.vue'
import DialogContent from '@/components/ui/dialog/DialogContent.vue'
import DialogDescription from '@/components/ui/dialog/DialogDescription.vue'
import DialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import CardPage from '@/features/card/CardPage.vue'
import ChatInput from '@/features/chat/ChatInput.vue'
import ChatMessageList from '@/features/chat/ChatMessageList.vue'
import PresetPage from '@/features/preset/PresetPage.vue'

const drawerOpen = ref(false)
const featurePageOpen = ref(false)
const activeFeature = ref<'card' | 'preset'>('card')

function openFeature(feature: 'card' | 'preset') {
  activeFeature.value = feature
  featurePageOpen.value = true
}

function closeFeaturePage() {
  featurePageOpen.value = false
}

function handleSwipe(swiper: SwiperInstance) {
  if (swiper.activeIndex !== 1) closeFeaturePage()
}

function handleCardSelected() {
  featurePageOpen.value = false
  drawerOpen.value = false
}
</script>

<template>
  <main class="relative flex h-dvh flex-col">
    <Button
      class="fixed top-4 left-4 z-40 rounded-full shadow-md"
      size="icon"
      aria-label="打开角色卡与预设"
      @click="drawerOpen = true"
    >
      <Menu class="size-5" />
    </Button>

    <section aria-label="对话记录" aria-live="polite" class="mx-4 mb-2 min-h-0 flex-1">
      <ChatMessageList />
    </section>
    <ChatInput />

    <Drawer v-model:open="drawerOpen" swipe-direction="left">
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Pi Tavern</DrawerTitle>
          <DrawerDescription>选择要管理的功能</DrawerDescription>
        </DrawerHeader>
        <ul class="space-y-2 p-4 pt-0">
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-lg border bg-background p-4 text-left"
              @click="openFeature('card')"
            >
              <LibraryBig class="size-5 text-muted-foreground" />
              <span class="flex-1 font-medium">角色卡</span>
              <ChevronRight class="size-4 text-muted-foreground" />
            </button>
          </li>
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-lg border bg-background p-4 text-left"
              @click="openFeature('preset')"
            >
              <SlidersHorizontal class="size-5 text-muted-foreground" />
              <span class="flex-1 font-medium">预设</span>
              <ChevronRight class="size-4 text-muted-foreground" />
            </button>
          </li>
        </ul>
      </DrawerContent>
    </Drawer>

    <Dialog v-model:open="featurePageOpen">
      <DialogContent
        :show-close-button="false"
        class="top-0 left-0 h-dvh max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 p-0 sm:max-w-none"
      >
        <Swiper :initial-slide="1" class="h-dvh w-full" @slide-change="handleSwipe">
          <SwiperSlide class="bg-background" />
          <SwiperSlide>
            <div class="flex h-dvh flex-col bg-background">
              <header class="flex h-14 shrink-0 items-center gap-2 border-b px-3">
                <Button variant="ghost" size="icon" aria-label="返回功能列表" @click="closeFeaturePage">
                  <ChevronLeft class="size-5" />
                </Button>
                <DialogTitle class="text-base">{{ activeFeature === 'card' ? '角色卡' : '预设' }}</DialogTitle>
                <DialogDescription class="sr-only">
                  {{ activeFeature === 'card' ? '查看和选择角色卡' : '管理预设' }}
                </DialogDescription>
              </header>
              <div class="min-h-0 flex-1">
                <CardPage v-if="activeFeature === 'card'" @selected="handleCardSelected" />
                <PresetPage v-else />
              </div>
            </div>
          </SwiperSlide>
          <SwiperSlide class="bg-background" />
        </Swiper>
      </DialogContent>
    </Dialog>
  </main>
</template>
