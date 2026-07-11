<script setup lang="ts">
import { computed, ref } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import EnforcedSettingsList from '@/components/mypuzzles/EnforcedSettingsList.vue'
import CompetitionScoringFields from '@/components/mypuzzles/CompetitionScoringFields.vue'
import UpdateCompetitionConfigDocument from '@/graphql/gql/collections/mutations/UpdateCompetitionConfig.graphql'
import type {
  UpdateCompetitionConfigMutation, UpdateCompetitionConfigMutationVariables,
  CollectionDetailQuery,
} from '@/graphql/generated/types'

type Config = NonNullable<NonNullable<CollectionDetailQuery['collection']>['competitionConfig']>
type Entry = NonNullable<CollectionDetailQuery['collection']>['entries'][number]

// The contest terms: time limit, submission policy, scoring knobs, and the
// enforced player settings. Everything saves on change; the whole panel locks
// once anyone has competed (fairness — the server enforces it too).
const props = defineProps<{ collectionId: string; config: Config; entries: Entry[] }>()
const emit = defineEmits<{ saved: [] }>()

const error = ref<string | null>(null)
const locked = computed(() => props.config.locked)

const hasFogPuzzle = computed(() =>
  props.entries.some((e) => e.puzzle?.constraintTypes?.includes('fog')))

async function save(config: UpdateCompetitionConfigMutationVariables['config']) {
  error.value = null
  const { data } = await apolloClient.mutate<UpdateCompetitionConfigMutation, UpdateCompetitionConfigMutationVariables>({
    mutation: UpdateCompetitionConfigDocument,
    variables: { id: props.collectionId, config },
  })
  const result = data?.updateCollection
  if (result?.collection) emit('saved')
  else error.value = result?.errors?.[0] ?? 'Could not save'
}
</script>

<template>
  <section class="flex flex-col gap-4 rounded-xl border border-line p-4">
    <div>
      <h2 class="font-display text-lg font-bold">
        Competition settings
      </h2>
      <p
        v-if="locked"
        class="text-xs text-action mt-0.5"
      >
        Locked: someone has already competed, so the terms are frozen.
      </p>
      <p
        v-else-if="!config.timeLimitSeconds"
        class="text-xs text-red-600 mt-0.5"
      >
        Set a time limit so solvers can start.
      </p>
    </div>

    <div :class="locked ? 'opacity-50 pointer-events-none' : ''">
      <CompetitionScoringFields
        :config="config"
        @save="save"
      />
    </div>

    <p
      v-if="hasFogPuzzle"
      class="text-xs text-amber-700 bg-spark-tint rounded-lg p-2.5"
    >
      This competition contains a fog puzzle. Fog reveals per-cell correctness as solvers
      progress, and savvy competitors could exploit that. Include it only if you're OK with it.
    </p>

    <details :class="locked ? 'opacity-50 pointer-events-none' : ''">
      <summary class="text-sm font-semibold text-ink-text cursor-pointer">
        Enforced player settings
      </summary>
      <p class="text-xs text-faint mt-1 mb-2">
        Force a setting on or off for every competitor, or leave it to them.
        Collaboration is always off during a competition.
      </p>
      <EnforcedSettingsList
        :enforced="(config.enforcedSettings ?? {}) as Record<string, boolean>"
        :disabled="locked"
        @update="save({ enforcedSettings: $event })"
      />
    </details>

    <p
      v-if="error"
      class="text-xs text-red-600"
    >
      {{ error }}
    </p>
  </section>
</template>
