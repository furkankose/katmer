<script lang="ts" setup>
import { computed, ref } from "vue"

const selectedIndex = ref<number | null>(null)
const { tabs } = defineProps<{
  tabs: ({ key: string; title: string; icon?: string } | string)[]
}>()

const tabList = computed(() => {
  return tabs.map((t) => {
    return typeof t === "string" ? { key: t, title: t } : t
  })
})
</script>

<template>
  <div class="tabs tabs-lift bg-base-200 relative">
    <template v-for="(tab, index) in tabList">
      <label class="tab">
        <input
          type="radio"
          :value="index"
          :checked="selectedIndex === index"
          @click="selectedIndex = selectedIndex === index ? null : index"
        />
        <Icon class="me-2" v-if="tab.icon" :class="tab.icon" />
        {{ tab.title }}
      </label>
      <div
        class="tab-content border-base-300 bg-base-100 p-2 min-h-[300px] max-h-[300px] overflow-auto"
      >
        <slot :name="tab.key" />
      </div>
      <div
        class="divider divider-horizontal my-0 py-2 mx-0 w-0"
        v-if="selectedIndex === null && index < tabList.length - 1"
      />
    </template>
    <Button
      class="size-6 absolute end-2 top-2"
      icon="i-ph-x"
      v-if="selectedIndex !== null"
      @click="selectedIndex = null"
    ></Button>
  </div>
</template>

<style></style>
