<script setup lang="ts">
import { ref } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import BaseModal from '@/components/ui/BaseModal.vue'
import UpdateCollectionEntryDocument from '@/graphql/gql/collections/mutations/UpdateCollectionEntry.graphql'
import type {
  UpdateCollectionEntryMutation, UpdateCollectionEntryMutationVariables,
} from '@/graphql/generated/types'

// Per-entry hunt gates, all opt-in. The codeword is write-only (the server
// stores a digest), so the input starts blank; leaving it blank keeps the
// current codeword, Clear removes it. The release time round-trips through
// the datetime-local input in the author's local timezone.
const props = defineProps<{
  collectionId: string
  entry: { id: string; gated: boolean; hidden: boolean; finale: boolean; releasedAt?: string | null }
  entryLabel: string
}>()
const emit = defineEmits<{ close: [], saved: [] }>()

type Gates = { codeword?: string; hidden?: boolean; finale?: boolean; releasedAt?: string | null }

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const codeword = ref('')
const hidden = ref(props.entry.hidden)
const finale = ref(props.entry.finale)
const releaseInput = ref(toLocalInput(props.entry.releasedAt))
const busy = ref(false)
const error = ref<string | null>(null)

async function apply(gates: Gates) {
  busy.value = true
  error.value = null
  try {
    const { data } = await apolloClient.mutate<UpdateCollectionEntryMutation, UpdateCollectionEntryMutationVariables>({
      mutation: UpdateCollectionEntryDocument,
      variables: { collectionId: props.collectionId, entryId: props.entry.id, gates },
    })
    const result = data?.updateCollectionEntry
    if (!result?.collection) throw new Error(result?.errors?.[0] ?? 'Could not save gates')
    emit('saved')
    return true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not save gates'
    return false
  } finally {
    busy.value = false
  }
}

async function save() {
  const gates: Gates = { hidden: hidden.value, finale: finale.value }
  if (codeword.value.trim()) gates.codeword = codeword.value
  const release = releaseInput.value ? new Date(releaseInput.value).toISOString() : null
  if (release !== (props.entry.releasedAt ?? null)) gates.releasedAt = release
  if (await apply(gates)) emit('close')
}

async function clearCodeword() {
  if (await apply({ codeword: '', hidden: false })) {
    codeword.value = ''
    hidden.value = false
  }
}
</script>

<template>
  <BaseModal
    size="md"
    @close="emit('close')"
  >
    <div class="p-4 sm:p-5 flex flex-col gap-4">
      <div>
        <h2 class="font-display text-lg font-bold">
          Hunt gates
        </h2>
        <p class="text-xs text-soft truncate">
          {{ entryLabel }}
        </p>
      </div>

      <label class="flex flex-col gap-1.5 text-sm text-soft">
        Codeword
        <input
          v-model="codeword"
          :placeholder="entry.gated ? 'Set (leave blank to keep)' : 'None'"
          class="text-sm px-2.5 py-1.5 rounded-lg border border-line bg-surface text-ink-text focus:outline-none focus:border-action"
        >
        <span class="text-xs text-faint">
          Solvers type this on the collection page to unlock the entry. Case doesn't matter.
        </span>
        <button
          v-if="entry.gated"
          type="button"
          class="self-start text-xs text-red-600 hover:underline disabled:opacity-50"
          :disabled="busy"
          @click="clearCodeword"
        >
          Clear codeword
        </button>
      </label>

      <label class="flex items-start gap-2 text-sm text-soft">
        <input
          v-model="hidden"
          type="checkbox"
          class="mt-0.5"
        >
        <span>
          Hidden until the codeword is entered
          <span class="block text-xs text-faint">A secret bonus. Requires a codeword.</span>
        </span>
      </label>

      <label class="flex items-start gap-2 text-sm text-soft">
        <input
          v-model="finale"
          type="checkbox"
          class="mt-0.5"
        >
        <span>
          Finale
          <span class="block text-xs text-faint">Unlocks only once every other puzzle in the collection is solved.</span>
        </span>
      </label>

      <label class="flex flex-col gap-1.5 text-sm text-soft">
        Scheduled release
        <input
          v-model="releaseInput"
          type="datetime-local"
          class="text-sm px-2.5 py-1.5 rounded-lg border border-line bg-surface text-ink-text focus:outline-none focus:border-action"
        >
        <span class="text-xs text-faint">
          Invisible to solvers until this moment. Leave empty to release right away.
        </span>
      </label>

      <p
        v-if="error"
        class="text-xs text-red-600"
      >
        {{ error }}
      </p>

      <div class="flex justify-end gap-3">
        <button
          class="text-sm text-soft hover:text-ink-text"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          class="text-sm px-3 py-1.5 rounded-lg bg-action text-on-action hover:bg-action-deep disabled:opacity-50"
          :disabled="busy"
          @click="save"
        >
          Save gates
        </button>
      </div>
    </div>
  </BaseModal>
</template>
