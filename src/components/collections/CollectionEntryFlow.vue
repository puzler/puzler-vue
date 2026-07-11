<script setup lang="ts">
import { computed } from 'vue'
import MdiIcon from '@/components/MdiIcon.vue'
import RichProseBody from '@/components/RichProseBody.vue'
import CollectionPuzzleRow from '@/components/collections/CollectionPuzzleRow.vue'
import { mdiLockOutline, mdiKeyOutline, mdiTrophyOutline } from '@mdi/js'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import { entryOpen, entrySolved, puzzleOrdinal, type FlowEntry } from '@/utils/collectionEntries'

type EntryPuzzle = { id: string; title: string; avgRating?: number | null; shareToken?: string | null }
type Entry = FlowEntry

// The collection's story: puzzles and narrative pages interleaved in author
// order. In a sequence collection everything past an unsolved puzzle stays
// locked, so the story is earned as you solve.
const props = defineProps<{
  entries: Entry[]
  puzzles: EntryPuzzle[]
  isSequence: boolean
  solved: Set<string>
  collectionId: string
  shareToken: string | null
  // Competition pages surface per-puzzle point values (when the author shows them).
  showPoints?: boolean
}>()

const puzzleById = computed(() => new Map(props.puzzles.map((p) => [ p.id, p ])))

function entryPuzzle(entry: Entry): EntryPuzzle | null {
  return entry.puzzle ? (puzzleById.value.get(entry.puzzle.id) ?? null) : null
}

// The collection context (`collection` + `ct`) powers next-puzzle navigation. A
// container-only puzzle isn't public, so we also pass its own share token, which
// the API surfaces only because we can already see this collection.
function puzzleLink(puzzle: EntryPuzzle) {
  return {
    name: 'puzzle',
    params: { id: puzzle.id },
    query: {
      collection: props.collectionId,
      ...(props.shareToken ? { ct: props.shareToken } : {}),
      ...(puzzle.shareToken ? { t: puzzle.shareToken } : {}),
    },
  }
}

function isUnlocked(index: number): boolean {
  return entryOpen(props.entries, index, props.isSequence, props.solved)
}

function puzzleNumber(index: number): number {
  return puzzleOrdinal(props.entries, index)
}

function storyHtml(entry: Entry): string {
  return sanitizeHtml(entry.storyPage?.bodyHtml ?? null)
}

// Why is this entry locked, in the viewer's terms? Codeword and finale gates
// beat the plain sequence explanation.
function lockHint(entry: Entry): { icon: string; text: string } {
  if (entry.gated) return { icon: mdiKeyOutline, text: 'Enter the codeword to unlock this.' }
  if (entry.finale) return { icon: mdiTrophyOutline, text: 'The finale unlocks once every other puzzle is solved.' }
  return { icon: mdiLockOutline, text: 'The story continues once the puzzles above are solved.' }
}
</script>

<template>
  <ol class="mt-6 flex flex-col gap-3">
    <li
      v-for="(entry, index) in entries"
      :key="entry.id"
    >
      <!-- Story page: revealed prose, or a locked teaser in sequence mode. -->
      <template v-if="entry.entryType === 'StoryPage'">
        <section
          v-if="isUnlocked(index)"
          :id="`story-${entry.id}`"
          class="py-2 scroll-mt-4"
        >
          <h2
            v-if="entry.storyPage?.title"
            class="font-display text-xl font-bold mb-1"
          >
            {{ entry.storyPage.title }}
          </h2>
          <RichProseBody
            v-if="storyHtml(entry)"
            :html="storyHtml(entry)"
          />
        </section>
        <div
          v-else
          class="flex items-center gap-3 p-4 rounded-xl border border-dashed border-line text-faint"
        >
          <MdiIcon
            :path="lockHint(entry).icon"
            :size="16"
            class="shrink-0"
          />
          <span class="text-sm italic">
            <template v-if="entry.storyTitle">{{ entry.storyTitle }} · </template>{{ lockHint(entry).text }}
          </span>
        </div>
      </template>

      <!-- Puzzle: playable link, or a locked row in sequence mode. -->
      <CollectionPuzzleRow
        v-else-if="entryPuzzle(entry)"
        :puzzle="entryPuzzle(entry)!"
        :link="puzzleLink(entryPuzzle(entry)!)"
        :unlocked="isUnlocked(index)"
        :show-number="isSequence || entry.finale === true"
        :number="puzzleNumber(index)"
        :is-solved="entrySolved(entry, solved)"
        :lock-icon="lockHint(entry).icon"
        :points="showPoints ? entry.points ?? null : null"
      />
    </li>
  </ol>
</template>
