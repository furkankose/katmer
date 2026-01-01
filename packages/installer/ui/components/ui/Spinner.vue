<template>
  <div
    :class="
      twMerge(
        'flex flex-col items-center relative',
        overlay ? 'bg-gray-50' : '',
        $attrs.class
      )
    "
    role="progressbar"
    :aria-valuemin="0"
    :aria-valuemax="100"
    :aria-valuenow="intermediate ? undefined : clamped"
  >
    <svg
      :style="{ width: size + 'px', height: size + 'px' }"
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      :class="intermediate ? 'cp-rotate' : ''"
    >
      <!-- Track -->
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke="trackColor"
        :stroke-width="stroke"
        fill="none"
      />
      <!-- Progress -->
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke="color"
        :stroke-width="stroke"
        :stroke-linecap="rounded ? 'round' : 'butt'"
        fill="none"
        :style="progressStyle"
        :class="intermediate ? 'cp-dash' : ''"
        :transform="`rotate(-90 ${center} ${center})`"
      />
    </svg>

    <!-- Center label (slot or default %) -->
    <div v-if="!noText || $slots.default" class="block font-semibold mt-2">
      <slot>{{ Math.round(clamped) }}%</slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { twMerge } from "tailwind-merge"
const props = withDefaults(
  defineProps<{
    value?: number
    size?: number | string
    stroke?: number
    overlay?: boolean
    color?: string
    trackColor?: string
    rounded?: boolean
    indeterminate?: boolean
    durationMs?: number
    noText?: boolean
  }>(),
  {
    size: 64,
    stroke: 2,
    color: "#FF7A00", // Tailwind blue-500
    trackColor: "#e5e7eb", // Tailwind gray-200
    rounded: false,
    indeterminate: true,
    durationMs: 1400,
    noText: true
  }
)

const clamped = computed(() => Math.min(100, Math.max(0, Number(props.value))))
const center = computed(() => Number(props.size) / 2)
const radius = computed(() => (Number(props.size) - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)

const progressStyle = computed(() => {
  if (intermediate.value) {
    return {
      strokeDasharray: `${circumference.value * 0.3} ${circumference.value}`,
      animationDuration: `${props.durationMs}ms`
    } as Record<string, string | number>
  }
  const offset = circumference.value * (1 - clamped.value / 100)
  return {
    strokeDasharray: `${circumference.value} ${circumference.value}`,
    strokeDashoffset: String(offset),
    transition: "stroke-dashoffset 250ms ease"
  }
})

const intermediate = computed(() => {
  if (props.value !== undefined) {
    return false
  }
  return props.indeterminate !== false
})
</script>

<style scoped>
.cp-rotate {
  animation: cp-rotate 2s linear infinite;
}

.cp-dash {
  animation: cp-dash var(--cp-dur, 1.4s) ease-in-out infinite;
}

/* Spin the whole svg in indeterminate mode */
@keyframes cp-rotate {
  100% {
    transform: rotate(360deg);
  }
}

/* Material-like indeterminate dash */
@keyframes cp-dash {
  0% {
    stroke-dasharray: 1, 200;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 100, 200;
    stroke-dashoffset: -15;
  }
  100% {
    stroke-dasharray: 1, 200;
    stroke-dashoffset: -125;
  }
}
</style>
