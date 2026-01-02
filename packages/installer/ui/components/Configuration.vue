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

const { t } = useI18n()

const { snapshot, provideFormInput, pendingInteraction, status } =
  useInstaller()

const currentFormStep =
  useTemplateRef<InstanceType<typeof FormStep>[]>("currentFormStep")
const rootForm = useTemplateRef<{ node: FormKitNode }>("rootForm")

const state = reactive({
  activeStep: 0,
  stepsLayout: config.ui?.stepsLayout,
  values: (config.steps ?? []).reduce((defaults, step) => {
    return deepMerge(defaults, step.form?.defaults ?? {})
  }, {}),
  steps: [...(config.steps ?? [])]
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
        provideFormInput({
          values: rootForm.value?.node.value ?? {},
          stepIndex: lastValidStep
        })
      }
      state.activeStep = lastValidStep + 1
    }
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
    class="w-full flex-1 min-h-0"
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
      @stepClick="handleStepClick($event, true)"
    />

    <FormKit
      ref="rootForm"
      type="form"
      name="$root"
      :actions="false"
      preserve
      :value="state.values"
      :incomplete-message="false"
      class="$reset flex flex-col flex-1 w-full min-h-0"
      @submit="() => {}"
    >
      <FormStep
        v-for="(step, index) in state.steps"
        v-show="state.activeStep === index"
        ref="currentFormStep"
        :show-back="state.activeStep > 0"
        :handle-next="
          () =>
            index + 1 >= state.steps.length ?
              finalize()
            : handleStepClick(index + 1)
        "
        :handle-back="() => handleStepClick(index - 1)"
        :submit-label="isLastStep ? 'install' : 'next'"
        :step="step"
      />
    </FormKit>
  </div>
</template>

<style scoped></style>
