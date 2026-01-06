<script lang="ts" setup>
import Card from "@/components/ui/Card.vue"
import { useInstaller } from "@/composables/useInstaller"
import { useI18n } from "vue-i18n"

const { snapshot, retry, cancel } = useInstaller()
const { t, te } = useI18n()
</script>

<template>
  <Card tag="section" class="flex items-center w-full">
    <div class="flex items-center space-x-4">
      <Icon icon="i-ph-warning-bold" />
      <div>
        <h2 class="text-xl">{{ t("installationFailed") }}</h2>
        <p class="mb-4">
          {{
            (
              snapshot?.context.lastError?.code &&
              te(snapshot.context.lastError.code)
            ) ?
              t(snapshot.context.lastError.code)
            : (snapshot?.context.lastError?.message ?? t("unexpectedError"))
          }}
        </p>
      </div>
    </div>
    <div class="card-actions justify-center">
      <button class="btn btn-primary" type="button" @click="retry">
        {{ t("retry") }}
      </button>
      <button class="btn btn-ghost" type="button" @click="cancel">
        {{ t("cancel") }}
      </button>
    </div>
  </Card>
</template>

<style scoped></style>
