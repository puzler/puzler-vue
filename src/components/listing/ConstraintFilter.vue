<script setup lang="ts">
import { ref } from 'vue'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiShapeOutline } from '@mdi/js'
import ConstraintFilterModal from './ConstraintFilterModal.vue'
import type { MatchModeEnum } from '@/graphql/generated/types'

const matchMode = defineModel<MatchModeEnum>('matchMode', { required: true })
const constraintTypes = defineModel<string[]>('constraintTypes', { required: true })

const open = ref(false)
</script>

<template>
  <div class="shrink-0">
    <button
      type="button"
      class="relative p-1.5 rounded-lg hover:bg-paper"
      :class="constraintTypes.length ? 'text-action' : 'text-soft hover:text-action'"
      title="Filter by constraint"
      @click="open = true"
    >
      <MdiIcon
        :path="mdiShapeOutline"
        :size="18"
      />
      <span
        v-if="constraintTypes.length"
        class="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-action text-on-action text-[10px] font-semibold leading-4 text-center"
      >
        {{ constraintTypes.length }}
      </span>
    </button>

    <ConstraintFilterModal
      v-if="open"
      v-model:match-mode="matchMode"
      v-model:constraint-types="constraintTypes"
      @close="open = false"
    />
  </div>
</template>
