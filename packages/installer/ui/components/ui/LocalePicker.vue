<script lang="ts" setup>
import { useI18n } from "vue-i18n"
import { FormKitIcon } from "@formkit/vue"
import config from "@common/config"

const i18n = useI18n()
const availableLocales = (config.i18n?.locales ||
  i18n.availableLocales ||
  []) as (string | Record<string, any>)[]

function handleLocaleChange(value) {
  i18n.locale.value = value
}
</script>

<template>
  <FormKit
    type="dropdown"
    placeholder="Select a role…"
    :value="i18n.locale.value"
    :classes="{
      outer: '$reset btn relative btn-link btn-circle w-auto h-auto',
      wrapper: '$reset contents',
      inner: '$reset',
      control: '$reset flex hover:border-primary rounded-full'
    }"
    validation="required"
    :options="
      availableLocales.map((locale) =>
        typeof locale === 'string' ?
          { label: locale, value: locale }
        : {
            label: locale.label || locale,
            value: locale.code || locale
          }
      )
    "
    variant="primary"
    size="md"
    :full-width="false"
    @input="handleLocaleChange"
  >
    <template #activator="activatorProps">
      <FormKitIcon
        icon="i-ph-globe-stand-duotone"
        v-bind="activatorProps"
        class="w-5 h-5 block"
      />
    </template>
  </FormKit>
</template>

<style scoped></style>
