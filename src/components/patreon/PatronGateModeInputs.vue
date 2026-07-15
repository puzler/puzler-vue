<script setup lang="ts">
import { computed } from 'vue'
import { PatronGateModeEnum } from '@/graphql/generated/types'
import type { PatronGateForm } from '@/constants/patreon'
import { formatCents } from '@/utils/currency'

// The mode-specific inputs of a patron gate: minimum-tier select, tier
// checkbox list, or pledge amount. Split from PatronGateFields to keep both
// templates lean; the form object flows through unchanged.
const model = defineModel<PatronGateForm>({ required: true })

const props = defineProps<{
  tiers: ReadonlyArray<{ id: string; title: string; amountCents: number }>
  currency?: string | null
}>()

const tiersAvailable = computed(() => props.tiers.length > 0)

function toggleTier(id: string) {
  const next = model.value.tierIds.includes(id)
    ? model.value.tierIds.filter((t) => t !== id)
    : [ ...model.value.tierIds, id ]
  model.value = { ...model.value, tierIds: next }
}

// The amount input works in major units; the form stores minor units.
const amountInput = computed({
  get: () => (model.value.minAmountCents == null ? '' : String(model.value.minAmountCents / 100)),
  set: (value: string) => {
    const parsed = Number.parseFloat(value)
    model.value = {
      ...model.value,
      minAmountCents: Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : null,
    }
  },
})
</script>

<template>
  <label
    v-if="model.mode === PatronGateModeEnum.MinTier && tiersAvailable"
    class="text-sm text-soft"
  >
    Minimum tier
    <select
      :value="model.minTierId ?? ''"
      class="mt-1 w-full px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink-text focus:border-action focus:outline-none"
      @change="model = { ...model, minTierId: ($event.target as HTMLSelectElement).value || null }"
    >
      <option value="">
        Any paying patron
      </option>
      <option
        v-for="tier in tiers"
        :key="tier.id"
        :value="tier.id"
      >
        {{ tier.title }} · {{ formatCents(tier.amountCents, currency) }} and up
      </option>
    </select>
  </label>

  <fieldset
    v-if="model.mode === PatronGateModeEnum.TierList && tiersAvailable"
    class="flex flex-col gap-1"
  >
    <legend class="text-sm text-soft mb-1">
      Qualifying tiers (pick any number)
    </legend>
    <label
      v-for="tier in tiers"
      :key="tier.id"
      class="flex items-center gap-2 text-sm text-ink-text cursor-pointer"
    >
      <input
        type="checkbox"
        :checked="model.tierIds.includes(tier.id)"
        @change="toggleTier(tier.id)"
      >
      {{ tier.title }} · {{ formatCents(tier.amountCents, currency) }}
    </label>
  </fieldset>

  <label
    v-if="model.mode === PatronGateModeEnum.MinAmount"
    class="text-sm text-soft"
  >
    Minimum pledge
    <span class="mt-1 flex items-center gap-2">
      <input
        v-model="amountInput"
        type="number"
        min="0.01"
        step="0.01"
        inputmode="decimal"
        class="w-32 px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink-text focus:border-action focus:outline-none"
      >
      <span class="text-xs text-faint">{{ currency || 'USD' }} per month</span>
    </span>
  </label>
</template>
