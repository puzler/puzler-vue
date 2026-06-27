import { ref, computed, watch, type Ref } from 'vue'
import { refDebounced } from '@vueuse/core'
import type { DocumentNode } from 'graphql'
import { apolloClient } from '@/utils/apolloClient'
import type {
  ListingFilterInput, MatchModeEnum, ListingSortEnum, PageInfoFieldsFragment,
  TimeRangeEnum, SetterTierEnum, MyStatusEnum,
} from '@/graphql/generated/types'
import { ListingSortEnum as Sort, MatchModeEnum as Match } from '@/graphql/generated/types'

// The shape every listing query returns: a page of nodes plus pagination info.
export interface Connection<TNode> {
  nodes: TNode[]
  pageInfo: PageInfoFieldsFragment
}

export interface FilterableListOptions<TData, TNode> {
  query: DocumentNode
  // Pull the connection out of the query result (e.g. (d) => d.myPuzzles).
  select: (data: TData) => Connection<TNode> | null | undefined
  // Toolbar capabilities; also gate which filter args are sent.
  supportsConstraints?: boolean
  supportsFolders?: boolean
  // Pin the listing to a single setter (e.g. a profile page's content tabs).
  // Always sent in the filter; harmless to omit for the global archive.
  authorUsername?: string
  // Extra non-filter variables merged into every request (e.g. { status }).
  baseVariables?: Record<string, unknown>
}

// Owns the search/filter/sort/pagination state for a listing and refetches
// server-side whenever it changes. Shared by My Puzzles, Collections, Series,
// and (later) the public archive so they behave identically.
export function useFilterableList<TData, TNode>(opts: FilterableListOptions<TData, TNode>) {
  const search = ref('')
  const debouncedSearch = refDebounced(search, 300)
  const constraintTypes = ref<string[]>([])
  const matchMode = ref<MatchModeEnum>(Match.Any)
  const visibilities = ref<string[]>([])
  const folderId = ref<string>('all')
  const sort = ref<ListingSortEnum>(Sort.Recent)
  const page = ref(1)
  const perPage = ref(20)
  // Archive-only facets. Stay at their defaults (and out of the built filter)
  // for the My-* lists, which never bind them.
  const timeRange = ref<TimeRangeEnum | null>(null)
  const setterTier = ref<SetterTierEnum | null>(null)
  const difficulties = ref<number[]>([])
  const tags = ref<string[]>([])
  const minRating = ref<number | null>(null)
  const myStatus = ref<MyStatusEnum | null>(null)
  const featured = ref(false)
  const gridSizes = ref<string[]>([])

  const nodes = ref<TNode[]>([]) as Ref<TNode[]>
  const pageInfo = ref<PageInfoFieldsFragment | null>(null)
  const loading = ref(true)

  const totalCount = computed(() => pageInfo.value?.totalCount ?? 0)
  const totalPages = computed(() => pageInfo.value?.totalPages ?? 0)

  function buildFilter(): ListingFilterInput {
    const filter: ListingFilterInput = {
      sort: sort.value,
      page: page.value,
      perPage: perPage.value,
      matchMode: matchMode.value,
    }
    if (opts.authorUsername) filter.authorUsername = opts.authorUsername
    if (debouncedSearch.value.trim()) filter.search = debouncedSearch.value.trim()
    if (visibilities.value.length) filter.visibilities = visibilities.value
    if (opts.supportsFolders) filter.folderId = folderId.value
    if (opts.supportsConstraints && constraintTypes.value.length) filter.constraintTypes = constraintTypes.value
    if (timeRange.value && timeRange.value !== 'ALL_TIME') filter.timeRange = timeRange.value
    if (setterTier.value) filter.setterTier = setterTier.value
    if (difficulties.value.length) filter.difficulties = difficulties.value
    if (tags.value.length) filter.tags = tags.value
    if (minRating.value != null) filter.minRating = minRating.value
    if (myStatus.value) filter.myStatus = myStatus.value
    if (featured.value) filter.featured = true
    if (gridSizes.value.length) filter.gridSizes = gridSizes.value
    return filter
  }

  const variables = computed(() => ({ ...opts.baseVariables, filter: buildFilter() }))

  async function load() {
    loading.value = true
    try {
      const { data } = await apolloClient.query<TData>({
        query: opts.query,
        variables: variables.value,
        fetchPolicy: 'network-only',
      })
      const conn = data ? opts.select(data) : null
      nodes.value = conn?.nodes ?? []
      pageInfo.value = conn?.pageInfo ?? null
    } finally {
      loading.value = false
    }
  }

  // Any change to the request variables (filters or page) refetches once.
  watch(variables, load, { immediate: true })

  // Changing a filter resets to the first page; paging is handled by setPage.
  watch(
    [
      debouncedSearch, constraintTypes, matchMode, visibilities, folderId, sort, perPage,
      timeRange, setterTier, difficulties, tags, minRating, myStatus, featured, gridSizes,
    ],
    () => { page.value = 1 },
    { deep: true },
  )

  function setPage(next: number) {
    if (next >= 1 && (totalPages.value === 0 || next <= totalPages.value)) page.value = next
  }

  return {
    // filter state (bind in the toolbar / sidebar)
    search, constraintTypes, matchMode, visibilities, folderId, sort, page, perPage,
    timeRange, setterTier, difficulties, tags, minRating, myStatus, featured, gridSizes,
    // results
    nodes, pageInfo, loading, totalCount, totalPages,
    // actions
    reload: load, setPage,
  }
}
