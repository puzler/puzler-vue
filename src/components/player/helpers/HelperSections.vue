<script setup lang="ts">
// The three math-helper sections, each gated by its own (competition-
// enforceable) player setting. Shared by the desktop drawer and mobile sheet.
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import SelectionCalculator from './SelectionCalculator.vue'
import KillerCageHelper from './KillerCageHelper.vue'
import SumCombinationHelper from './SumCombinationHelper.vue'

const player = usePlayerSettingsStore()
</script>

<template>
  <div class="flex flex-col gap-3 divide-y divide-line [&>*:not(:first-child)]:pt-3">
    <SelectionCalculator v-if="player.effective.enableSelectionCalculator" />
    <KillerCageHelper v-if="player.effective.enableKillerHelper" />
    <SumCombinationHelper v-if="player.effective.enableSumHelper" />
  </div>
</template>
