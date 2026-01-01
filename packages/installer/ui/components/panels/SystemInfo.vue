<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useWebsocket } from "../../composables/useWebsocket"

const sysInfo = ref()
const { send } = useWebsocket()
onMounted(async () => {
  sysInfo.value = await send("system/info")
})

defineExpose({
  title: "System Info"
})
</script>
<template>
  <div title="System Info" class="h-full flex flex-col overflow-auto">
    <pre class="whitespace-break-spaces p-2 text-sm">{{ sysInfo }}</pre>
  </div>
</template>
<style></style>
