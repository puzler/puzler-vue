<script setup lang="ts">
import { computed } from 'vue'
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import CollectionEntryFlow from '@/components/collections/CollectionEntryFlow.vue'
import CompetitionMetaCard from '@/components/competitions/CompetitionMetaCard.vue'
import CompetitionEnforcedNotice from '@/components/competitions/CompetitionEnforcedNotice.vue'
import CompetitionStartCard from '@/components/competitions/CompetitionStartCard.vue'
import CompetitionScoreCard from '@/components/competitions/CompetitionScoreCard.vue'
import CompetitionLeaderboard from '@/components/competitions/CompetitionLeaderboard.vue'
import { useCompetitionStore } from '@/stores/competition'
import { useAuthStore } from '@/stores/auth'
import type { CollectionPublicQuery } from '@/graphql/generated/types'

type Collection = NonNullable<CollectionPublicQuery['collection']>

// The competition page's three lives: pre-run (rules + start + leaderboard,
// puzzles hidden), in-run (puzzle list + finish early; countdown lives in the
// global bar), and post-run (score card + leaderboard + review).
const props = defineProps<{
  collection: Collection
  solved: Set<string>
  shareToken: string | null
}>()
const emit = defineEmits<{ reload: [] }>()

const competition = useCompetitionStore()
const auth = useAuthStore()

const isAuthor = computed(() => auth.user?.username === props.collection.author.username)
const myRun = computed(() => props.collection.myCompetitionRun ?? null)
const inRun = computed(() => competition.isActiveFor(props.collection.id))
const postRun = computed(() => myRun.value !== null && !inRun.value)
const ready = computed(() => !!props.collection.competitionConfig?.timeLimitSeconds)

// Submitted puzzles get the flow's check mark ("submitted", not "correct" —
// under blind the server never says which).
const submittedIds = computed(() => new Set(Object.keys(competition.run?.submissions ?? {})))

async function start() {
  const error = await competition.start(props.collection.id, props.shareToken)
  if (!error) emit('reload')
}

async function finishEarly() {
  await competition.finish()
  emit('reload')
}
</script>

<template>
  <div>
    <h1
      data-tour="collection-header"
      class="font-display text-2xl font-bold"
    >
      {{ collection.title }}
    </h1>
    <p class="text-sm text-soft mt-1">
      a competition by <AuthorAttribution :author="collection.author" />
    </p>
    <p
      v-if="collection.description"
      class="text-sm text-ink-text mt-3 whitespace-pre-line"
    >
      {{ collection.description }}
    </p>

    <CompetitionScoreCard
      v-if="postRun && myRun"
      :run="myRun"
    />

    <template v-if="!myRun">
      <CompetitionMetaCard :collection="collection" />
      <CompetitionEnforcedNotice :enforced-settings="collection.competitionConfig?.enforcedSettings" />
      <p
        v-if="isAuthor"
        class="mt-4 text-sm text-soft"
      >
        This is your competition — authors can't compete. The puzzle list below is your author view.
      </p>
      <CompetitionStartCard
        v-else
        :ready="ready"
        @start="start"
      />
    </template>

    <template v-if="inRun || postRun || isAuthor">
      <CollectionEntryFlow
        data-tour="collection-puzzles"
        :entries="collection.entries"
        :puzzles="collection.puzzles"
        :is-sequence="false"
        :solved="submittedIds"
        :collection-id="collection.id"
        :share-token="shareToken"
        show-points
      />
      <button
        v-if="inRun"
        class="mt-4 text-sm px-4 py-2 rounded-xl border border-line text-ink-text hover:border-action hover:text-action"
        @click="finishEarly"
      >
        Finish early and get my score
      </button>
    </template>

    <CompetitionLeaderboard
      v-if="!inRun"
      :collection-id="collection.id"
      :share-token="shareToken"
    />
  </div>
</template>
