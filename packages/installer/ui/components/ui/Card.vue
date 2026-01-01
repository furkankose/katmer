<script setup lang="ts">
withDefaults(
  defineProps<{
    bodyClasses?: any
    tag?: string
  }>(),
  {
    tag: "div"
  }
)
</script>

<template>
  <component :is="tag" class="card">
    <slot name="header" />
    <div v-if="$slots.title" class="card-title">
      <slot name="title" />
    </div>
    <slot name="prepend-inner" />
    <slot name="body">
      <div class="card-body" :class="bodyClasses">
        <slot />
      </div>
    </slot>
    <slot name="append-inner" />
    <div v-if="$slots.actions" class="card-actions">
      <slot name="actions" />
    </div>
    <slot name="append-outer" />
  </component>
</template>

<style scoped></style>
