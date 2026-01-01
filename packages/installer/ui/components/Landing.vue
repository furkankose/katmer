<script lang="ts" setup>
import { useConfig } from "@common/useConfig"
import { useI18n } from "vue-i18n"
import { useInstaller } from "@/composables/useInstaller"
import Card from "@/components/ui/Card.vue"

const config = useConfig()

const { t } = useI18n()
const { isConnected, isConnecting, start } = useInstaller()
</script>

<template>
  <Card tag="section">
    <h2 class="card-title text-2xl font-semibold mb-2">
      {{ t(config.ui?.landing?.title ?? "landing.title") }}
    </h2>
    <p class="text-base-content/70 mb-6">
      {{ t(config.ui?.landing?.description ?? "landing.description") }}
    </p>
    <div class="card-actions justify-center md:justify-end">
      <button class="btn btn-primary" :disabled="!isConnected" @click="start">
        {{ t("startInstallation") }}
        <span v-if="isConnecting" class="loading loading-spinner loading-sm" />
      </button>
    </div>
  </Card>
</template>

<style scoped></style>
