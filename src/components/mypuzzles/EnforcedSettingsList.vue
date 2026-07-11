<script setup lang="ts">
import EnforcedSettingRow from '@/components/mypuzzles/EnforcedSettingRow.vue'
import { ENFORCEABLE_SETTING_GROUPS } from '@/utils/playerSettingMeta'
import type { PlayerSettings } from '@/utils/playerSettings'

// The full player-settings suite as author tri-states. `enforced` maps setting
// key => forced value; absent keys are the solver's choice. Collaboration is
// excluded (hard-blocked during runs regardless).
const props = defineProps<{
  enforced: Record<string, boolean>
  disabled?: boolean
}>()
const emit = defineEmits<{ update: [enforced: Record<string, boolean>] }>()

function valueFor(key: keyof PlayerSettings): boolean | null {
  return key in props.enforced ? props.enforced[key] : null
}

function setValue(key: keyof PlayerSettings, value: boolean | null) {
  const next = { ...props.enforced }
  if (value === null) delete next[key]
  else next[key] = value
  emit('update', next)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <section
      v-for="group in ENFORCEABLE_SETTING_GROUPS"
      :key="group.title"
    >
      <p class="text-[11px] font-semibold uppercase tracking-widest text-soft mb-1">
        {{ group.title }}
      </p>
      <EnforcedSettingRow
        v-for="item in group.items"
        :key="item.key"
        :label="item.label"
        :hint="item.hint"
        :value="valueFor(item.key)"
        :disabled="disabled"
        @update="setValue(item.key, $event)"
      />
    </section>
  </div>
</template>
