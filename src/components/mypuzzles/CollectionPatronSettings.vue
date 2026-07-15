<script setup lang="ts">
import { ref, watch } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import { patronGateForm, patronGateInput } from '@/constants/patreon'
import PatronGateFields from '@/components/patreon/PatronGateFields.vue'
import SetCollectionPatronGateDocument from '@/graphql/gql/collections/mutations/SetCollectionPatronGate.graphql'
import ScheduleCollectionReleaseDocument from '@/graphql/gql/collections/mutations/ScheduleCollectionRelease.graphql'
import type {
  SetCollectionPatronGateMutation, SetCollectionPatronGateMutationVariables,
  ScheduleCollectionReleaseMutation, ScheduleCollectionReleaseMutationVariables,
  PatronGateModeEnum,
} from '@/graphql/generated/types'

// The patron gate + scheduled release for a patrons-only collection. Saves on
// change like every other control on the detail page.
const props = defineProps<{
  collectionId: string
  gate: {
    mode: PatronGateModeEnum
    minTier?: { id: string } | null
    tiers: { id: string }[]
    minAmountCents?: number | null
    patronsSinceRelease: boolean
  } | null
  releasedAt: string | null
}>()

const form = ref(patronGateForm(props.gate, props.releasedAt))

watch(form, (next, previous) => {
  void apolloClient.mutate<SetCollectionPatronGateMutation, SetCollectionPatronGateMutationVariables>({
    mutation: SetCollectionPatronGateDocument,
    variables: { id: props.collectionId, gate: patronGateInput(next) },
  })
  if ((next.releasedAt ?? null) !== (previous.releasedAt ?? null)) {
    void apolloClient.mutate<ScheduleCollectionReleaseMutation, ScheduleCollectionReleaseMutationVariables>({
      mutation: ScheduleCollectionReleaseDocument,
      variables: { id: props.collectionId, releasedAt: next.releasedAt },
    })
  }
})
</script>

<template>
  <PatronGateFields v-model="form" />
</template>
