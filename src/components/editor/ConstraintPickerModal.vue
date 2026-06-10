<script setup lang="ts">
import MdiIcon from '@/components/MdiIcon.vue'
import { CONSTRAINT_ICONS } from '@/types/constraintIcons'

interface Option {
  type: string
  label: string
}

const props = defineProps<{
  title: string
  options: Option[]
  disabledTypes?: string[]
}>()

const emit = defineEmits<{
  pick: [type: string, label: string]
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="emit('close')"
    >
      <div class="bg-surface rounded-xl shadow-xl w-64 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-display font-semibold text-ink-text text-sm">
            Add {{ title }}
          </h3>
          <button
            class="text-faint hover:text-soft text-lg leading-none"
            @click="emit('close')"
          >
            ×
          </button>
        </div>

        <div class="flex flex-col gap-0.5">
          <button
            v-for="opt in options"
            :key="opt.type"
            :disabled="props.disabledTypes?.includes(opt.type)"
            class="flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-sm transition-colors"
            :class="props.disabledTypes?.includes(opt.type)
              ? 'text-faint cursor-not-allowed'
              : 'text-ink-text hover:bg-action-tint hover:text-action'"
            @click="!props.disabledTypes?.includes(opt.type) && (emit('pick', opt.type, opt.label), emit('close'))"
          >
            <MdiIcon
              v-if="CONSTRAINT_ICONS[opt.type]"
              :path="CONSTRAINT_ICONS[opt.type].path"
              :color="props.disabledTypes?.includes(opt.type) ? 'rgb(209 213 219)' : CONSTRAINT_ICONS[opt.type].color"
              :rotate="CONSTRAINT_ICONS[opt.type].rotate"
              :size="16"
            />
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
