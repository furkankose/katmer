<script setup lang="ts">
import { useTemplateRef } from "vue"
import type { FormKitNode } from "@formkit/core"
import { FormKit, FormKitSchema } from "@formkit/vue"
import { useI18n } from "vue-i18n"
import { Step } from "@/plugins/formkit/components/step"
import Summary from "@/components/Summary.vue"

const props = defineProps({
  step: { type: Object, required: true },
  handleNext: { type: Function as () => () => void, required: true },
  handleBack: { type: Function as () => () => void, default: null },
  submitLabel: { type: String, default: "next" },
  showBack: { type: Boolean, default: false }
})

defineEmits<{
  cancel: []
}>()

const { t } = useI18n()

const formStep = useTemplateRef<{ node: FormKitNode }>("formStep")

defineExpose({ formStep })
</script>

<template>
  <FormKit
    :key="step.name"
    ref="formStep"
    name="__$hidden"
    type="step"
    role="region"
    :aria-labelledby="`form-step-title-${step.name}`"
  >
    <template #default="{ classes }">
      <!-- BODY -->
      <section :class="classes.body">
        <h2 :id="`form-step-title-${step.name}`" :class="classes.title">
          {{ t(step.label ?? step.name) }}
        </h2>

        <p v-if="step.description" :class="classes.description">
          {{ t(step.description) }}
        </p>

        <div v-show="step.name !== '$summary'">
          <FormKitSchema :schema="step.form?.schema ?? []" />
        </div>

        <Summary v-if="step.name === '$summary'" />
      </section>

      <!-- ACTIONS -->
      <footer
        :class="classes.actions"
        role="group"
        aria-label="Form navigation"
      >
        <button v-if="showBack" type="button" class="btn" @click="handleBack">
          {{ t("back") }}
        </button>
        <div class="flex-1" />
        <button
          type="button"
          class="btn btn-ghost text-error"
          @click="$emit('cancel')"
        >
          {{ t("cancel") }}
        </button>

        <button type="button" class="btn btn-primary" @click="handleNext">
          {{ t(submitLabel) }}
        </button>
      </footer>
    </template>
  </FormKit>
</template>

<style></style>
