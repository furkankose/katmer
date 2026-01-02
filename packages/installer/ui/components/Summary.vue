<script lang="ts" setup>
import { computed, type Ref, ref } from "vue"

defineOptions({
  inheritAttrs: false
})
import { FormKitIcon, useFormKitContext } from "@formkit/vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

const context = useFormKitContext()

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === "[object Object]"

const isSpecialObject = (value: unknown): boolean =>
  value instanceof Date ||
  value instanceof RegExp ||
  value instanceof Map ||
  value instanceof Set

function normalizeToDotPaths(input: unknown): Record<string, any> {
  const includeArrayIndex = false,
    separator = ".",
    skipUndefined = true,
    treatSpecialObjectsAsLeaf = true

  const result = {} as any

  function walk(value: unknown, path: string[]) {
    if (value === undefined && skipUndefined) return

    const key = path.join(separator)

    if (
      value === null ||
      typeof value !== "object" ||
      (treatSpecialObjectsAsLeaf && isSpecialObject(value))
    ) {
      if (key) result[key] = value
      return
    }

    if (Array.isArray(value)) {
      if (!includeArrayIndex) {
        result[key] = value
        return
      }

      for (let i = 0; i < value.length; i++) {
        walk(value[i], [...path, String(i)])
      }
      return
    }

    if (isPlainObject(value)) {
      for (const [k, v] of Object.entries(value)) {
        walk(v, [...path, k])
      }
      return
    }

    // Fallback (non-plain object)
    if (key) result[key] = value
  }

  walk(input, [])
  return result
}

const finalProps = computed(() => {
  const parent = context.value!.node.parent
  if (!parent) {
    return []
  }
  const normalizedValues = normalizeToDotPaths(parent.value)
  const observedValues = [] as {
    label: string
    type: string
    shown: Ref<boolean>
    value: any
  }[]

  for (const [key, val] of Object.entries(normalizedValues)) {
    const node = parent.context!.node.at(key)

    if (node && node.props.label) {
      if (node.props.validation?.includes("confirm:")) {
        continue
      }
      let value = val
      const baseType = node.props.type || node.type
      let type = baseType
      if (baseType === "repeater") {
        type = "text"
        value = value.map((item) => node.props.itemSummary(item)).join(" \n")
      }
      observedValues.push({
        label: node.props.label,
        type,
        shown: ref(false),
        value: value
      })
    }
  }
  return observedValues
})
</script>

<template>
  <table class="w-full table-fixed border-collapse text-sm">
    <thead>
      <tr class="border-b border-base-200">
        <th class="w-1/3 py-2 px-3 text-left font-medium text-base-content/70">
          {{ t("field") }}
        </th>
        <th class="w-2/3 py-2 px-3 text-left font-medium text-base-content/70">
          {{ t("value") }}
        </th>
      </tr>
    </thead>

    <tbody>
      <tr
        v-for="item in finalProps"
        :key="item.label"
        class="border-b border-base-200 last:border-0"
      >
        <td class="py-2 px-3 align-top font-medium">
          {{ t(item.label) }}
        </td>

        <td class="py-2 px-3 flex gap-2 text-base-content/80">
          <div class="truncate">
            <template v-if="item.type === 'password' && !item.shown.value">
              {{
                Array(item.value?.length || 0)
                  .fill("*")
                  .join("")
              }}
            </template>
            <template v-else>
              {{ item.value }}
            </template>
          </div>
          <FormKitIcon
            v-if="item.type === 'password'"
            :icon="item.shown.value ? 'i-ph-eye-slash' : 'i-ph-eye'"
            class="w-5 h-5 inline-block cursor-pointer"
            @click="item.shown.value = !item.shown.value"
          />
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped></style>
