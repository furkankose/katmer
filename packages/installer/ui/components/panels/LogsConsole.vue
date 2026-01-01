<script setup lang="ts">
import type { LogEntry } from "../../../common"
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue"
import { Filter } from "../../utils/ansi_to_html.ts"
import { useInstaller } from "@/composables/useInstaller.ts"

const messageList = useTemplateRef("messageList")

function getLevelIcon(level: string) {
  if (level === "info") {
    return `<i class='ic ic-mask i-ph-info-duotone text-blue-300'></i>`
  }
  if (level === "warn") {
    return `<i class='ic ic-mask i-ph-warning text-amber-600'></i>`
  }
  if (level === "debug") {
    return `<i class='ic ic-mask i-ph-file-text-duotone text-gray-700'></i>`
  }
  if (level === "error") {
    return `<i class='ic ic-mask i-ph-x-circle-fill text-red-300'></i>`
  }
  return `<i class="">&nbsp;</i>`
}

let cReturn = -1
let lastElement = null as null | {
  wrapper: HTMLElement
  message: HTMLElement
}
const filter = new Filter()
let lastBuffer = ""

function createMessageEl(logInput: LogEntry) {
  const { timestamp, level, data, message } = logInput

  const messages =
    Array.isArray(data) ? [...data]
    : data ? [data]
    : []
  if (message) {
    messages.push(message)
  }
  if (!messageList.value) return

  function appendMessageEl(innerHtml?: string) {
    const messageWrapper = document.createElement("li")
    messageWrapper.className = `log l-${level}`
    messageWrapper.innerHTML = `
          ${getLevelIcon(level)}
          <div class="message">${innerHtml || ""}</div>
          <div class="timestamp">${new Date(timestamp).toLocaleTimeString()}</div>
        `
    messageList.value!.appendChild(messageWrapper)

    return {
      wrapper: messageWrapper,
      message: messageWrapper.querySelector(".message")! as HTMLElement
    }
  }
  for (let i = 0; i < messages.length; i++) {
    const entry = messages[i]
    const str = typeof entry === "string" ? entry : JSON.stringify(entry)

    if (str.includes("\r") || str.includes("\n")) {
      for (let j = 0; j < str.length; j++) {
        if (!lastElement) {
          lastElement = appendMessageEl()
        }
        const ch = str[j]
        if (ch === "\r") {
          cReturn = 0
        } else if (ch === "\n") {
          lastElement.message.innerHTML = filter.toHtml(lastBuffer).trim()
          lastBuffer = ""
          lastElement = null
          cReturn = -1
        } else {
          if (cReturn !== -1) {
            if (cReturn > lastBuffer.length - 1) {
              lastBuffer = lastBuffer + ch
            } else {
              lastBuffer =
                str.substring(0, cReturn) + ch + str.substring(cReturn + 1)
            }
            cReturn++
          } else {
            lastBuffer += ch
          }
          lastElement.message.innerHTML = filter.toHtml(lastBuffer).trim()
        }
      }
    } else {
      appendMessageEl(filter.toHtml(str))
      lastElement = null
      lastBuffer = ""
    }
  }

  messageList.value.scroll({
    top: messageList.value.scrollHeight,
    behavior: "smooth"
  })
}

const { onMessage } = useInstaller()

const { levels, selectedLevel, levelStyleVars, toggleLevel } = useLogLevel()

onMounted(async () => {
  const off = onMessage("installer:log", (data) => {
    console.log(data)
    createMessageEl(data)
  })

  onBeforeUnmount(off)
})

function useLogLevel() {
  const levels = ["error", "warn", "info", "debug"]

  const selectedLevel = ref([...levels])

  return {
    levels,
    selectedLevel,
    toggleLevel(level: string) {
      const existing = selectedLevel.value.indexOf(level)
      if (existing >= 0) {
        selectedLevel.value.splice(existing, 1)
      } else {
        selectedLevel.value.push(level)
      }
    },
    levelStyleVars: computed(() => {
      const finalLevels = {} as any
      for (const l of levels) {
        finalLevels[`--l-${l}`] =
          selectedLevel.value.includes(l) ? "flex" : "none"
      }
      return finalLevels
    })
  }
}

defineExpose({
  title: "Logs"
})
</script>
<template>
  <div title="Logs" class="logs">
    <div class="logs-header">
      <span class="flex-1" />
      <div>
        <button
          v-for="level in levels"
          :key="level"
          class="level-btn"
          :class="{ 'bg-orange-500': selectedLevel.includes(level) }"
          @click="toggleLevel(level)"
        >
          {{ level }}
        </button>
      </div>
    </div>
    <ul ref="messageList" class="logs-container" :style="levelStyleVars" />
  </div>
</template>
<style>
.level-btn {
  @apply px-1 mx-0.5 hover:bg-orange-200 active:bg-orange-600 text-sm rounded-sm;
}

.logs {
  @apply h-full flex flex-col;

  .logs-container {
    @apply overflow-auto p-2;
  }

  .logs-header {
    @apply flex;
  }

  .message {
    @apply text-gray-600  dark:text-gray-200 ml-2 whitespace-break-spaces break-all;
  }

  .log {
    @apply flex w-full text-xs relative py-0.5;

    &:not(:last-of-type):after {
      @apply border-b border-gray-200/20 absolute bottom-0 left-0 right-0 dark:border-gray-700/10;
      content: "";
    }

    &:hover {
      @apply bg-gray-200/50 dark:bg-gray-50/10;
    }
  }

  .timestamp {
    @apply text-gray-300 ml-auto whitespace-nowrap;
  }

  i {
    @apply size-3 mt-0.5 flex-shrink-0;
  }

  .l-error {
    display: var(--l-error, none);
  }

  .l-info {
    display: var(--l-info, none);
  }

  .l-warn {
    display: var(--l-warn, none);
  }

  .l-debug {
    display: var(--l-debug, none);
  }
}
</style>
