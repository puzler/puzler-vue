<script setup lang="ts">
import { computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { PatronGateModeEnum } from '@/graphql/generated/types'
import { GATE_MODE_OPTIONS, type PatronGateForm } from '@/constants/patreon'
import { toLocalInput, fromLocalInput } from '@/utils/datetimeLocal'
import PatronGateModeInputs from './PatronGateModeInputs.vue'

// Who qualifies for a patrons-only puzzle or collection, plus the optional
// scheduled release. Renders under the visibility choice whenever Patrons is
// selected; the parent owns persistence (the form rides the modal's save).
const model = defineModel<PatronGateForm>({ required: true })

const auth = useAuthStore()

const tiers = computed(() =>
  (auth.patreonCampaign?.tiers ?? []).filter((t) => t.published && !t.discarded),
)
const currency = computed(() => auth.patreonCampaign?.currency)
const tiersAvailable = computed(() => tiers.value.length > 0)

// A campaign with no published tiers can't offer tier gates: minimum pledge
// is the only meaningful mode.
watch(tiersAvailable, (available) => {
  if (!available && model.value.mode !== PatronGateModeEnum.MinAmount) {
    model.value = { ...model.value, mode: PatronGateModeEnum.MinAmount }
  }
}, { immediate: true })

const modeOptions = computed(() =>
  GATE_MODE_OPTIONS.map((option) => ({
    ...option,
    disabled: !tiersAvailable.value && option.value !== PatronGateModeEnum.MinAmount,
  })),
)

// One hint line under the segmented row (per-option hints made the stack tall).
const selectedHint = computed(
  () => modeOptions.value.find((option) => option.value === model.value.mode)?.hint ?? '',
)

const releaseInput = computed({
  get: () => toLocalInput(model.value.releasedAt),
  set: (value: string) => {
    model.value = { ...model.value, releasedAt: fromLocalInput(value) }
  },
})
</script>

<template>
  <div class="flex flex-col gap-3 px-3 py-3 rounded-xl border border-line bg-surface">
    <div>
      <p class="text-sm font-medium text-ink-text">
        Who qualifies
      </p>
      <p
        v-if="!tiersAvailable"
        class="mt-0.5 text-xs text-faint"
      >
        Your campaign has no published tiers, so gating is by pledge amount.
        Publish tiers on Patreon, then sync from Settings to pick them here.
      </p>
    </div>

    <div>
      <div
        role="radiogroup"
        aria-label="Who qualifies"
        class="grid grid-cols-3 gap-1.5"
      >
        <label
          v-for="option in modeOptions"
          :key="option.value"
          class="px-2 py-2 rounded-lg border text-center text-xs sm:text-sm leading-tight"
          :class="[
            model.mode === option.value ? 'border-action bg-action-tint text-ink-text font-medium' : 'border-line text-soft',
            option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-action',
          ]"
        >
          <input
            type="radio"
            :value="option.value"
            :checked="model.mode === option.value"
            :disabled="option.disabled"
            class="sr-only"
            @change="model = { ...model, mode: option.value }"
          >
          {{ option.label }}
        </label>
      </div>
      <p class="mt-1 text-xs text-faint">
        {{ selectedHint }}
      </p>
    </div>

    <PatronGateModeInputs
      v-model="model"
      :tiers="tiers"
      :currency="currency"
    />

    <label class="flex items-center gap-2 text-sm text-ink-text cursor-pointer">
      <input
        type="checkbox"
        :checked="model.patronsSinceRelease"
        @change="model = { ...model, patronsSinceRelease: !model.patronsSinceRelease }"
      >
      <span class="flex flex-col">
        <span>Only patrons who joined before this release</span>
        <span class="text-xs text-faint">New patrons won't unlock this; supporters at release time keep access.</span>
      </span>
    </label>

    <label class="text-sm text-soft border-t border-line pt-3">
      Scheduled release
      <input
        v-model="releaseInput"
        type="datetime-local"
        class="mt-1 w-full px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink-text focus:border-action focus:outline-none"
      >
      <span class="block mt-1 text-xs text-faint">
        Patrons see this appear at that moment. Leave empty to release right away.
      </span>
    </label>
  </div>
</template>
