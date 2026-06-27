<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { apolloClient } from '@/utils/apolloClient'
import ListPagination from '@/components/listing/ListPagination.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import ProfileReviewsReceivedDocument from '@/graphql/gql/users/queries/ProfileReviewsReceived.graphql'
import type {
  ProfileReviewsReceivedQuery,
  ProfileReviewsReceivedQueryVariables,
} from '@/graphql/generated/types'

const props = defineProps<{ username: string }>()

type ReviewConnection = NonNullable<ProfileReviewsReceivedQuery['user']>['reviewsReceived']

const connection = ref<ReviewConnection | null>(null)
const loading = ref(true)
const page = ref(1)

async function load() {
  loading.value = true
  try {
    const { data } = await apolloClient.query<ProfileReviewsReceivedQuery, ProfileReviewsReceivedQueryVariables>({
      query: ProfileReviewsReceivedDocument,
      variables: { username: props.username, page: page.value, perPage: 20 },
      fetchPolicy: 'network-only',
    })
    connection.value = data?.user?.reviewsReceived ?? null
  } finally {
    loading.value = false
  }
}

watch(page, load, { immediate: true })

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
      v-else-if="!connection || !connection.nodes.length"
      class="text-soft"
    >
      No reviews yet.
    </p>
    <ul
      v-else
      class="flex flex-col gap-3"
    >
      <li
        v-for="review in connection.nodes"
        :key="review.id"
        class="p-4 rounded-xl border border-line"
      >
        <div class="flex items-center gap-2">
          <UserAvatar
            :avatar-url="review.user.avatarUrl"
            :display-name="review.user.displayName"
            :size="28"
          />
          <RouterLink
            :to="`/profile/${review.user.username}`"
            class="text-sm font-medium text-ink-text hover:text-action transition-colors"
          >
            {{ review.user.displayName }}
          </RouterLink>
          <span class="text-xs text-faint">{{ formatDate(review.createdAt) }}</span>
        </div>
        <p class="mt-2 text-sm text-ink-text whitespace-pre-line">
          {{ review.body }}
        </p>
        <RouterLink
          :to="{ name: 'puzzle', params: { id: review.puzzle.id } }"
          class="mt-2 inline-block text-xs text-soft hover:text-action transition-colors"
        >
          on {{ review.puzzle.title }}
        </RouterLink>
      </li>
    </ul>

    <ListPagination
      :page="connection?.pageInfo.page ?? 1"
      :total-pages="connection?.pageInfo.totalPages ?? 0"
      :total-count="connection?.pageInfo.totalCount ?? 0"
      @change="(next) => (page = next)"
    />
  </div>
</template>
