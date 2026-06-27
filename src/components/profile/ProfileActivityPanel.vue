<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { apolloClient } from '@/utils/apolloClient'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiPuzzleOutline, mdiCommentTextOutline, mdiCheckCircleOutline } from '@mdi/js'
import { ProfileActivityKindEnum } from '@/graphql/generated/types'
import ProfileActivityDocument from '@/graphql/gql/users/queries/ProfileActivity.graphql'
import type { ProfileActivityQuery, ProfileActivityQueryVariables } from '@/graphql/generated/types'

const props = defineProps<{ username: string }>()

type ActivityItem = NonNullable<ProfileActivityQuery['user']>['activity'][number]

const items = ref<ActivityItem[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const { data } = await apolloClient.query<ProfileActivityQuery, ProfileActivityQueryVariables>({
      query: ProfileActivityDocument,
      variables: { username: props.username, limit: 30 },
      fetchPolicy: 'network-only',
    })
    items.value = data?.user?.activity ?? []
  } finally {
    loading.value = false
  }
}

watch(() => props.username, load, { immediate: true })

const ICON: Record<string, string> = {
  [ProfileActivityKindEnum.PublishedPuzzle]: mdiPuzzleOutline,
  [ProfileActivityKindEnum.ReviewWritten]: mdiCommentTextOutline,
  [ProfileActivityKindEnum.Solve]: mdiCheckCircleOutline,
}
const VERB: Record<string, string> = {
  [ProfileActivityKindEnum.PublishedPuzzle]: 'Published',
  [ProfileActivityKindEnum.ReviewWritten]: 'Reviewed',
  [ProfileActivityKindEnum.Solve]: 'Solved',
}

const hasItems = computed(() => items.value.length > 0)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div>
    <p
      v-if="loading"
      class="text-soft"
    >
      Loading…
    </p>
    <p
      v-else-if="!hasItems"
      class="text-soft"
    >
      No recent activity.
    </p>
    <ol
      v-else
      class="flex flex-col gap-2"
    >
      <li
        v-for="(item, index) in items"
        :key="`${item.kind}-${item.puzzle?.id ?? index}-${item.occurredAt}`"
        class="flex items-start gap-3 p-3 rounded-lg border border-line"
      >
        <MdiIcon
          :path="ICON[item.kind]"
          :size="18"
          class="text-soft mt-0.5 shrink-0"
        />
        <div class="min-w-0">
          <p class="text-sm text-ink-text">
            {{ VERB[item.kind] }}
            <RouterLink
              v-if="item.puzzle"
              :to="{ name: 'player', params: { id: item.puzzle.id } }"
              class="font-medium hover:text-action transition-colors"
            >
              {{ item.puzzle.title }}
            </RouterLink>
          </p>
          <p
            v-if="item.comment"
            class="mt-0.5 text-xs text-soft whitespace-pre-line line-clamp-2"
          >
            {{ item.comment.body }}
          </p>
          <span class="text-xs text-faint">{{ formatDate(item.occurredAt) }}</span>
        </div>
      </li>
    </ol>
  </div>
</template>
