<script setup>
const props = defineProps({
  context: Object,
  title: String,
  ignore: { type: Boolean, default: true }
})

console.log(props.context)
</script>

<template>
  <pre class="py-2 bg-gray-500">{{ context.value }}</pre>
</template>
