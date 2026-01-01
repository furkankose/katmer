<script setup lang="ts">
import { twMerge } from "tailwind-merge"

defineProps<{
  icon?: string | boolean
  label?: string
  color?: "primary" | "secondary" | "error" | "info" | "warning" | "neutral"
  iconClass?: string
  disabled?: boolean
  ghost?: boolean
  link?: boolean
  active?: boolean
  outlined?: boolean
  filled?: boolean
  text?: boolean
}>()

// to prevent class removal
function colorToVariant(color?: string) {
  switch (color) {
    case "primary":
      return "btn-primary"
    case "error":
      return "btn-error"
    case "secondary":
      return "btn-secondary"
    case "warning":
      return "btn-warning"
    case "info":
      return "btn-info"
    case "neutral":
      return "btn-neutral"
  }
  return ""
}
</script>

<template>
  <button
    :disabled="disabled"
    :class="
      twMerge(
        'btn relative',
        outlined ? 'btn-outline' : '',
        text || ghost ? 'btn-ghost' : '',
        link ? 'btn-link' : '',
        icon || typeof icon === 'string' ? 'btn-link btn-circle' : '',
        active ? 'btn-active' : '',
        disabled ? 'btn-disabled' : '',
        colorToVariant(color),
        ($attrs.class as any) || ''
      )
    "
  >
    <Icon
      v-if="typeof icon === 'string' && icon"
      :class="twMerge(icon, iconClass)"
    />
    <slot>{{ label }}</slot>
  </button>
</template>
