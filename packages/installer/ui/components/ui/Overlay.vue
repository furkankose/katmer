<template>
  <div class="overlay">
    <slot />
  </div>
</template>
<style>
.overlay {
  @apply absolute inset-0 z-20 flex items-center justify-center;

  &:after {
    @apply absolute inset-0 bg-gray-800/20 dark:bg-gray-600/60;
    z-index: -1;
    content: "";
  }
}
</style>
