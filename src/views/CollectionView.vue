<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ContentPage from '@/components/ContentPage.vue'
import CollectionHuntPage from '@/components/collections/CollectionHuntPage.vue'
import CollectionBasicPage from '@/components/collections/CollectionBasicPage.vue'
import CollectionCompetitionPage from '@/components/collections/CollectionCompetitionPage.vue'
import { useCompetitionStore } from '@/stores/competition'
import { apolloClient } from '@/utils/apolloClient'
import { solvedIds } from '@/utils/solveProgress'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import { collectionThemeClasses } from '@/utils/collectionTheme'
import CollectionPublicDocument from '@/graphql/gql/collections/queries/CollectionPublic.graphql'
import CollectionByTokenPublicDocument from '@/graphql/gql/collections/queries/CollectionByTokenPublic.graphql'
import type {
  CollectionPublicQuery, CollectionPublicQueryVariables,
  CollectionByTokenPublicQuery, CollectionByTokenPublicQueryVariables,
} from '@/graphql/generated/types'
import { CollectionKindEnum } from '@/graphql/generated/types'

type Collection = NonNullable<CollectionPublicQuery['collection']>

// Thin dispatcher: loads the collection and renders the page for its kind.
// Hunt keeps the curated accents; basic and competition stay on plain paper.
const route = useRoute()
const collection = ref<Collection | null>(null)
const loading = ref(true)
const solved = ref(new Set<string>())

const shareToken = computed(() => (typeof route.query.t === 'string' ? route.query.t : null))
const kind = computed(() => collection.value?.kind)

const themeClasses = computed(() =>
  (collection.value && kind.value === CollectionKindEnum.Hunt
    ? collectionThemeClasses(collection.value)
    : []))
const bodyHtml = computed(() => sanitizeHtml(collection.value?.pageDescriptionHtml ?? null))

async function load() {
  const id = typeof route.params.id === 'string' ? route.params.id : null
  try {
    if (shareToken.value) {
      const { data } = await apolloClient.query<CollectionByTokenPublicQuery, CollectionByTokenPublicQueryVariables>({
        query: CollectionByTokenPublicDocument, variables: { token: shareToken.value }, fetchPolicy: 'network-only',
      })
      collection.value = data?.collectionByToken ?? null
    } else if (id) {
      const { data } = await apolloClient.query<CollectionPublicQuery, CollectionPublicQueryVariables>({
        query: CollectionPublicDocument, variables: { id }, fetchPolicy: 'network-only',
      })
      collection.value = data?.collection ?? null
    }
    solved.value = solvedIds()
    if (collection.value?.kind === CollectionKindEnum.Competition) {
      useCompetitionStore().hydrateFromCollection(collection.value, shareToken.value)
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <ContentPage>
    <div
      class="bg-paper"
      :class="themeClasses"
    >
      <div class="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <p
          v-if="loading"
          class="text-soft"
        >
          Loading…
        </p>
        <p
          v-else-if="!collection"
          class="text-soft"
        >
          This collection isn’t available.
        </p>
        <CollectionHuntPage
          v-else-if="kind === CollectionKindEnum.Hunt"
          :collection="collection"
          :body-html="bodyHtml"
          :solved="solved"
          :share-token="shareToken"
          @reload="load"
        />
        <CollectionCompetitionPage
          v-else-if="kind === CollectionKindEnum.Competition"
          :collection="collection"
          :solved="solved"
          :share-token="shareToken"
          @reload="load"
        />
        <CollectionBasicPage
          v-else
          :collection="collection"
          :solved="solved"
          :share-token="shareToken"
        />
      </div>
    </div>
  </ContentPage>
</template>
