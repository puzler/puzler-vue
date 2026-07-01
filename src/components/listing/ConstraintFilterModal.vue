<script setup lang="ts">
import MdiIcon from '@/components/MdiIcon.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { CONSTRAINT_FILTER_GROUPS } from '@/constants/constraints'
import { CONSTRAINT_ICONS } from '@/types/constraintIcons'
import type { MatchModeEnum } from '@/graphql/generated/types'
import { MatchModeEnum as Match } from '@/graphql/generated/types'

const matchMode = defineModel<MatchModeEnum>('matchMode', { required: true })
const constraintTypes = defineModel<string[]>('constraintTypes', { required: true })
const emit = defineEmits<{ close: [] }>()

function toggle(value: string) {
  const set = new Set(constraintTypes.value)
  if (set.has(value)) set.delete(value)
  else set.add(value)
  constraintTypes.value = [...set]
}
</script>

<template>
  <BaseModal
    variant="sheet"
    size="md"
    @close="emit('close')"
  >
    <!-- Header -->
    <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line shrink-0">
      <h3 class="font-display font-semibold text-ink-text text-sm">
        Filter by Constraint
      </h3>
      <div class="flex items-center gap-3">
        <div class="inline-flex rounded-lg border border-line overflow-hidden text-xs">
          <button
            type="button"
            :class="['px-2.5 py-1', matchMode === Match.Any ? 'bg-action text-on-action' : 'text-soft hover:bg-paper']"
            title="Match puzzles with ANY selected constraint"
            @click="matchMode = Match.Any"
          >
            Any
          </button>
          <button
            type="button"
            :class="['px-2.5 py-1', matchMode === Match.All ? 'bg-action text-on-action' : 'text-soft hover:bg-paper']"
            title="Match puzzles with ALL selected constraints"
            @click="matchMode = Match.All"
          >
            All
          </button>
        </div>
        <button
          class="text-faint hover:text-soft text-xl leading-none"
          aria-label="Close"
          @click="emit('close')"
        >
          ×
        </button>
      </div>
    </div>

    <!-- Constraint grid -->
    <div class="overflow-y-auto flex-1 min-h-0 px-5 py-4 flex flex-col gap-4">
      <section
        v-for="group in CONSTRAINT_FILTER_GROUPS"
        :key="group.label"
        class="flex flex-col gap-2"
      >
        <span class="text-[11px] font-semibold uppercase tracking-wide text-faint">{{ group.label }}</span>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="opt in group.options"
            :key="opt.value"
            type="button"
            class="flex flex-col items-center justify-center gap-1.5 px-1 py-2.5 rounded-xl border text-center transition-colors"
            :class="constraintTypes.includes(opt.value)
              ? 'border-action bg-action-tint text-action'
              : 'border-line hover:border-action hover:bg-action-tint text-ink-text'"
            @click="toggle(opt.value)"
          >
            <MdiIcon
              v-if="CONSTRAINT_ICONS[opt.value]"
              :path="CONSTRAINT_ICONS[opt.value].path"
              :color="CONSTRAINT_ICONS[opt.value].color"
              :rotate="CONSTRAINT_ICONS[opt.value].rotate"
              :size="22"
            />
            <span class="text-[11px] leading-tight">{{ opt.label }}</span>
          </button>
        </div>
      </section>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between px-5 py-3 border-t border-line shrink-0">
      <button
        type="button"
        class="text-sm text-soft hover:text-action disabled:opacity-40 disabled:hover:text-soft"
        :disabled="!constraintTypes.length"
        @click="constraintTypes = []"
      >
        Clear{{ constraintTypes.length ? ` (${constraintTypes.length})` : '' }}
      </button>
      <button
        type="button"
        class="px-4 py-1.5 rounded-lg bg-action text-on-action text-sm font-medium hover:opacity-90"
        @click="emit('close')"
      >
        Done
      </button>
    </div>
  </BaseModal>
</template>
