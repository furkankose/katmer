<script setup lang="ts">
defineProps<{
  scrim?: number
}>()
</script>
<template>
  <div class="overlay">
    <slot />
  </div>
</template>
<style>
.overlay {
  @apply absolute inset-0 z-20 flex items-center justify-center;

  &:after {
    @apply absolute inset-0 bg-black;
    z-index: -1;
    content: "";
    opacity: v-bind("scrim ?? 0.5");
  }
}
</style>
