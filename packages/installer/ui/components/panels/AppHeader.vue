<script setup lang="ts">
import Button from "../ui/Button.vue"
import { useInstaller } from "@/composables/useInstaller"
import config from "@common/config"

import { computed, ref, watch } from "vue"

const currentTheme = ref(document.documentElement.dataset.theme || "light")
watch(currentTheme, (v) => {
  document.documentElement.dataset.theme = v
})

const emits = defineEmits(["logoClick"])

const { connectionStatus: status } = useInstaller()
</script>

<template>
  <header class="app-header">
    <button
      class="cursor-pointer flex items-center gap-2"
      @click="emits('logoClick')"
    >
      <img
        v-if="config.ui?.appLogo && /^(http|data:|\/)/.test(config.ui.appLogo)"
        :src="config.ui.appLogo"
        alt="Logo"
        class="h-8"
      />
      <div v-else class="inline-flex max-w-24" v-html="config.ui?.appLogo" />
      <h1 class="text-lg font-semibold">
        {{ config.ui?.appTitle ?? "Installer" }}
      </h1>
    </button>
    <div id="cur-view" class="ml-4 me-auto" />
    <div class="flex flex-1 sm:flex-0 items-center justify-between gap-2">
      <div class="text-xs text-gray-500">v{{ config.version ?? "0.0.0" }}</div>
      <LocalePicker />
      <Button
        class="w-auto h-auto"
        icon-class="size-6"
        :icon="
          currentTheme === 'dark' ? 'i-ph-moon-duotone' : 'i-ph-sun-dim-duotone'
        "
        @click="currentTheme = currentTheme === 'dark' ? 'light' : 'dark'"
      />
      <Icon
        v-if="status !== 'connected'"
        icon="i-ph-dot-duotone"
        :title="`Connection Status: ${status}`"
        class="size-8"
        :class="{
          'text-amber-500': status === 'connecting',
          'text-red-500': status === 'disconnected' || status === 'failed'
        }"
      />
    </div>
  </header>
</template>

<style>
.app-header {
  @apply w-full flex-wrap flex-shrink-0 px-4 p-2 flex items-center gap-3 border-0 border-b  sticky top-0 z-10 bg-inherit;
  min-height: var(--header-height);
}
.status-icon {
  @apply relative;
  &:before {
    content: "";
    width: 6px;
    height: 6px;
    box-shadow: 0px 0px 5px 3px var(--color-success);
    border-radius: 50%;
    position: absolute;
    border: 1px solid #ffffff05;
    background: transparent;
  }
}
</style>
