<script setup lang="ts">
import { useInstaller } from "@/composables/useInstaller"
import Card from "@/components/ui/Card.vue"
import { useI18n } from "vue-i18n"
import Configuration from "@/components/Configuration.vue"

const { t, te } = useI18n()

const { snapshot, status, isConnecting, start, retry, cancel } = useInstaller()
</script>
<template>
  <div class="min-h-screen flex flex-col items-center bg-base-100">
    <AppHeader @logoClick="cancel" />
    <section id="prepend-main" />
    <main class="flex flex-col flex-1">
      <Overlay v-if="isConnecting" class="w-full">
        <Spinner>
          <h3 class="font-bold">
            {{ t("connecting") }}
          </h3>
          <div class="text-xs">
            {{ t("connectingInfo") }}
          </div>
        </Spinner>
      </Overlay>
      <template v-else>
        <Landing v-if="status === 'idle'" />
        <Card
          v-else-if="status === 'completed'"
          tag="section"
          class="mt-8 bg-success text-success-content"
        >
          <h2 class="card-title text-xl">
            <Icon icon="i-ph-check-circle-duotone" />
            {{ t("installationCompleted") }}
          </h2>
          <p class="mb-4">
            {{ t("installationCompletedInfo") }}
          </p>
          <div class="card-actions">
            <button class="btn btn-primary" type="button" @click="start">
              {{ t("runAgain") }}
            </button>
          </div>
        </Card>
        <Configuration
          v-else-if="
            status === 'failed' ||
            status === 'running' ||
            status === 'awaitingInput'
          "
        />
        <!-- Unknown state -->
        <Card v-else tag="section" class="mt-8 bg-warning text-warning-content">
          <h2 class="card-title">{{ t("unknownState") }}</h2>
          <p>
            {{ t("unknownStateInfo", [status]) }}
            {{ status }}
          </p>
        </Card>
      </template>
      <Tabs
        :tabs="[{ title: 'Logs', key: 'logs', icon: 'i-ph-file-text' }]"
        class="mt-auto border-t"
      >
        <template #logs>
          <LogsConsole />
        </template>
      </Tabs>
    </main>
  </div>
</template>
