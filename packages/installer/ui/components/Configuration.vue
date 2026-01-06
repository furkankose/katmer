<script lang="ts" setup>
import {
  computed,
  defineComponent,
  reactive,
  ref,
  toValue,
  useTemplateRef,
  watch
} from "vue"
import { FormKit, useFormKitContext } from "@formkit/vue"
import FormStep from "@/components/ui/FormStep.vue"
import { deepMerge } from "@/utils/object.utils"
import config from "@app/config"
import { useI18n } from "vue-i18n"
import { useInstaller } from "@/composables/useInstaller"
import { createMessage, type FormKitNode } from "@formkit/core"
import { isEmpty } from "es-toolkit/compat"
import type { StepConfig } from "@type/forms"
import Card from "@/components/ui/Card.vue"
import FlowError from "@/components/FlowError.vue"

const { t } = useI18n()

const { snapshot, provideFormInput, status } = useInstaller()

const currentFormStep =
  useTemplateRef<InstanceType<typeof FormStep>[]>("currentFormStep")
const rootForm = useTemplateRef<{ node: FormKitNode }>("rootForm")

const normalizedSteps = [] as StepConfig[]
let defaultValues = {} as any

for (const [stepId, steps] of Object.entries(config.steps)) {
  normalizedSteps.push(...(steps || []))
  for (const step of steps) {
    defaultValues = deepMerge(defaultValues, step.form?.defaults ?? {})
  }
}

const loading = ref(false)
const state = reactive({
  activeStep: 0,
  stepsLayout: config.ui?.stepsLayout,
  values: defaultValues,
  steps: normalizedSteps
})

const isLastStep = computed(() => state.activeStep === state.steps.length - 1)

async function finalize() {
  provideFormInput({
    values: rootForm.value?.node.value ?? {},
    stepIndex: state.steps.length - 1
  })
}
async function triggerValidation(node?: FormKitNode | null) {
  if (!node) {
    return false
  }
  await node.settled
  let isStepValid = true
  for (const stepChild of node.stepItems) {
    stepChild.walk((node) => {
      node.store.set(
        createMessage({
          key: "submitted",
          value: true,
          visible: false
        })
      )
    })
    stepChild.store.set(
      createMessage({
        key: "submitted",
        value: true,
        visible: false
      })
    )
    if (!toValue(stepChild.context.state.valid)) {
      isStepValid = false
    }
  }
  return isStepValid
}
async function handleStepClick(navigateTo: number) {
  loading.value = true
  try {
    const currentStep = state.activeStep

    if (navigateTo === currentStep) {
      return
    }

    if (navigateTo < 0) {
      state.activeStep = 0
      return
    }

    if (navigateTo < currentStep) {
      state.activeStep = navigateTo
    } else {
      const formRefs = currentFormStep.value || []
      let lastValidStep: number | undefined

      for (
        let i = currentStep;
        i < Math.min(navigateTo, formRefs.length - 1);
        i++
      ) {
        if (await triggerValidation(formRefs[i]?.formStep?.node)) {
          lastValidStep = i
        } else {
          break
        }
      }

      const storedStep = snapshot.value?.context.uiState?.formStepIndex

      if (lastValidStep !== undefined) {
        // send current cumulative values + index to engine
        if (!storedStep || storedStep <= lastValidStep) {
          const res = await provideFormInput({
            values: rootForm.value?.node.value ?? {},
            stepIndex: lastValidStep
          })
          if (res.status === "failed") {
            return
          }
        }
        state.activeStep = lastValidStep + 1
      }
    }
  } finally {
    loading.value = false
  }
}

// rehydrate from engine (after refresh/reconnect)
watch(
  () => snapshot.value,
  (snap) => {
    if (!snap) return

    if (!isEmpty(snap.context.values)) {
      state.values = {
        ...(snap.context.values ?? {})
      }
    }

    const uiState = snap.context.uiState
    if (uiState && typeof uiState.formStepIndex === "number") {
      const idx = uiState.formStepIndex
      state.activeStep = Math.min(
        Math.max(idx, 0),
        Math.max(state.steps.length - 1, 0)
      )
    }
  },
  { immediate: true, deep: true }
)
</script>

<template>
  <div
    class="w-full flex-1 min-h-0 relative"
    :class="
      state.stepsLayout === 'vertical' ?
        'flex flex-col md:flex-row'
      : 'flex flex-col'
    "
  >
    <FormSteps
      v-if="!config.ui?.hideSteps"
      :steps="state.steps"
      :active-index="state.activeStep"
      :layout="state.stepsLayout"
      :clickable="true"
      :skippable="true"
      :disabled="status !== 'awaitingInput'"
      @stepClick="handleStepClick($event)"
    />
    <FlowError v-show="status === 'failed'" :snapshot="snapshot" />
    <FormKit
      v-show="status !== 'failed'"
      ref="rootForm"
      type="form"
      name="$root"
      :actions="false"
      preserve
      :value="state.values"
      :incomplete-message="false"
      class="$reset flex flex-col flex-1 w-full min-h-0 relative"
      @submit="() => {}"
    >
      <Overlay v-if="loading" :scrim="0" class="w-full"> <Spinner /></Overlay>

      <FormStep
        v-for="(step, index) in state.steps"
        v-show="state.activeStep === index"
        ref="currentFormStep"
        :disabled="loading"
        :show-back="state.activeStep > 0"
        :handle-next="
          () =>
            index + 1 >= state.steps.length ?
              finalize()
            : handleStepClick(index + 1)
        "
        :handle-back="() => handleStepClick(index - 1)"
        :next-label="isLastStep ? 'install' : 'next'"
        :step="step"
      />
    </FormKit>
  </div>
</template>

<style scoped></style>
