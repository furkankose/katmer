<script setup lang="ts">
import { computed } from "vue"
import type { StepConfig } from "@type/forms" // Ensure this path exists in your project
import { useI18n } from "vue-i18n"

const props = withDefaults(
  defineProps<{
    steps: StepConfig[]
    activeIndex: number
    layout?: "simple" | "horizontal" | "vertical"
    clickable?: boolean
    skippable?: boolean
    disabled?: boolean
  }>(),
  {
    layout: "horizontal",
    clickable: true,
    skippable: true,
    disabled: false
  }
)

const emit = defineEmits<{
  (e: "stepClick", index: number): void
}>()

const { t } = useI18n()

const isStepDisabled = (i: number) =>
  props.disabled ||
  !props.clickable ||
  (!props.skippable && i > props.activeIndex)

function onClick(i: number) {
  if (isStepDisabled(i)) return
  emit("stepClick", i)
}
</script>

<template>
  <component
    :is="layout === 'vertical' ? 'aside' : 'div'"
    class="form-stepper"
    :class="`form-stepper--${layout}`"
  >
    <template v-if="layout === 'simple'">
      <p role="status" class="form-stepper__simple-text">
        {{ t("stepXofY", [activeIndex + 1, steps.length]) }}
      </p>
    </template>

    <nav v-else class="form-stepper__nav" aria-label="Progress">
      <ol
        class="form-stepper__list"
        :class="{
          'form-stepper__list--horizontal': layout === 'horizontal',
          'form-stepper__list--vertical': layout !== 'horizontal'
        }"
      >
        <li
          v-for="(step, i) in steps"
          :key="step.name ?? i"
          class="form-stepper__item"
          :class="{
            'form-stepper__item--vertical': layout !== 'horizontal',
            'form-stepper__item--current': activeIndex === i,
            'form-stepper__item--completed': i < activeIndex
          }"
        >
          <button
            type="button"
            class="form-stepper__button"
            :class="{ 'form-stepper__button--disabled': isStepDisabled(i) }"
            :aria-current="activeIndex === i ? 'step' : undefined"
            :disabled="isStepDisabled(i)"
            @click="onClick(i)"
          >
            <span v-if="i < activeIndex" class="sr-only">
              {{ t("completed") }}:
            </span>

            <span class="form-stepper__badge" aria-hidden="true">
              {{ i + 1 }}
            </span>

            <div class="form-stepper__item-body">
              <span class="form-stepper__label">
                {{ t(step.label ?? step.name) }}
              </span>
            </div>
          </button>

          <span
            v-if="layout === 'horizontal' && i < steps.length - 1"
            class="form-stepper__connector"
            aria-hidden="true"
          />
        </li>
      </ol>
    </nav>
  </component>
</template>

<style>
@layer components {
  /* Utility for screen readers (Tailwind usually has this, but ensuring it's here) */
  .sr-only {
    @apply absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0;
    clip: rect(0, 0, 0, 0);
  }

  /* --- Layout Containers --- */
  .form-stepper {
    @apply border-b  p-2;
  }

  .form-stepper--horizontal {
    @apply sticky top-0 bg-base-100/80 backdrop-blur z-10 overflow-x-auto;
  }

  .form-stepper--vertical {
    @apply md:border-b-0 md:border-r md:w-64 flex-shrink-0;
  }

  .form-stepper--simple {
    @apply px-6 py-3;
  }

  .form-stepper__simple-text {
    @apply text-sm text-base-content/70 font-medium;
  }

  .form-stepper__nav {
    @apply w-full;
  }

  .form-stepper__list {
    @apply list-none p-0 m-0;
  }

  .form-stepper__list--horizontal {
    @apply flex items-center gap-4;
  }

  /* --- List Item Wrapper --- */
  .form-stepper__item {
    @apply flex items-center gap-2;
  }

  /* --- Interactive Button --- */
  .form-stepper__button {
    @apply flex items-center gap-2 flex-1 cursor-pointer
      /* Reset button styles */
    bg-transparent border-0 px-2 py-3 text-left transition-colors duration-200;

    /* Focus styles for keyboard accessibility */
    &:focus-visible {
      @apply outline-none ring-1 ring-primary ring-inset rounded-sm;
    }

    /* Hover states handled on the button now, not the li */
    &:hover .form-stepper__label {
      @apply text-primary;
    }
  }

  .form-stepper__button--disabled {
    @apply opacity-50 cursor-not-allowed;
    /* Remove hover effect on disabled */
    &:hover .form-stepper__label {
      @apply text-base-content/70; /* Reset to default or relevant color */
    }
  }

  /* --- Visual States --- */

  /* Current Step */
  .form-stepper__item--current .form-stepper__label {
    @apply text-primary;
  }

  .form-stepper__item--current .form-stepper__badge {
    @apply bg-primary text-primary-content border-primary;
  }

  .form-stepper__item--current .form-stepper__item-body {
    @apply text-primary font-semibold;
  }

  /* Completed Step */
  .form-stepper__item--completed .form-stepper__badge {
    @apply bg-primary/10 text-primary border-primary/40;
  }

  .form-stepper__item--completed .form-stepper__item-body {
    @apply text-base-content/80;
  }

  /* Hover adjustment for completed items */
  .form-stepper__item--completed
    .form-stepper__button:hover
    .form-stepper__item-body {
    @apply text-primary;
  }

  /* --- Elements --- */
  .form-stepper__item-body {
    @apply flex items-center gap-2 text-xs md:text-sm;
  }

  .form-stepper__badge {
    @apply inline-flex items-center justify-center w-5 h-5 rounded-full border
    text-[10px] font-semibold flex-shrink-0
    bg-base-100 text-base-content/60 border-base-content/20 transition-colors;
  }

  .form-stepper__label {
    @apply truncate;
  }

  /* Connector Line */
  .form-stepper__connector {
    @apply hidden md:block h-px w-6 bg-base-content/10 flex-shrink-0;
  }

  .form-stepper__item--completed .form-stepper__connector {
    @apply bg-primary/70;
  }
}
</style>
