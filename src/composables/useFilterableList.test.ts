import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useFilterableList } from './useFilterableList'
import { apolloClient } from '@/utils/apolloClient'

vi.mock('@/utils/apolloClient', () => ({ apolloClient: { query: vi.fn() } }))

const mockQuery = apolloClient.query as unknown as ReturnType<typeof vi.fn>
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

interface Row { id: string }
interface Data { list: { nodes: Row[]; pageInfo: { page: number; perPage: number; totalCount: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean } } }

function page(over: Partial<Data['list']['pageInfo']> = {}) {
  return {
    data: {
      list: {
        nodes: [{ id: '1' }],
        pageInfo: { page: 1, perPage: 20, totalCount: 30, totalPages: 2, hasNextPage: true, hasPreviousPage: false, ...over },
      },
    },
  }
}

function setup(opts: Partial<Parameters<typeof useFilterableList<Data, Row>>[0]> = {}) {
  return useFilterableList<Data, Row>({
    query: {} as never,
    select: (d) => d.list,
    supportsConstraints: true,
    supportsFolders: true,
    ...opts,
  })
}

function lastFilter() {
  return mockQuery.mock.calls.at(-1)![0].variables.filter
}

beforeEach(() => {
  mockQuery.mockReset()
  mockQuery.mockResolvedValue(page())
})

describe('useFilterableList', () => {
  it('loads on init with default filter and omits empty optional filters', async () => {
    setup()
    await flush()
    expect(mockQuery).toHaveBeenCalledOnce()
    const f = lastFilter()
    expect(f).toMatchObject({ sort: 'RECENT', page: 1, perPage: 20, matchMode: 'ANY', folderId: 'all' })
    expect(f.search).toBeUndefined()
    expect(f.constraintTypes).toBeUndefined()
    expect(f.visibilities).toBeUndefined()
  })

  it('sends selected visibilities (ANY) when present', async () => {
    const list = setup()
    await flush()
    list.visibilities.value = ['PUBLIC', 'DRAFT']
    await nextTick(); await flush()
    expect(lastFilter().visibilities).toEqual(['PUBLIC', 'DRAFT'])
  })

  it('exposes nodes and pagination from the response', async () => {
    const list = setup()
    await flush()
    expect(list.nodes.value).toEqual([{ id: '1' }])
    expect(list.totalCount.value).toBe(30)
    expect(list.totalPages.value).toBe(2)
  })

  it('refetches the requested page via setPage', async () => {
    const list = setup()
    await flush()
    list.setPage(2)
    await nextTick(); await flush()
    expect(lastFilter().page).toBe(2)
  })

  it('does not page past the last page', async () => {
    const list = setup()
    await flush()
    const calls = mockQuery.mock.calls.length
    list.setPage(99)
    await nextTick(); await flush()
    expect(list.page.value).toBe(1)
    expect(mockQuery.mock.calls.length).toBe(calls)
  })

  it('resets to page 1 when a filter changes', async () => {
    const list = setup()
    await flush()
    list.setPage(2)
    await nextTick(); await flush()
    list.sort.value = 'RATING' as never
    await nextTick(); await flush()
    expect(list.page.value).toBe(1)
    expect(lastFilter()).toMatchObject({ page: 1, sort: 'RATING' })
  })

  it('sends constraint filters with the match mode when constraints are selected', async () => {
    const list = setup()
    await flush()
    list.matchMode.value = 'ALL' as never
    list.constraintTypes.value = ['thermometer', 'arrow']
    await nextTick(); await flush()
    expect(lastFilter()).toMatchObject({ matchMode: 'ALL', constraintTypes: ['thermometer', 'arrow'] })
  })

  it('omits the folder filter when folders are unsupported', async () => {
    setup({ supportsFolders: false })
    await flush()
    expect(lastFilter().folderId).toBeUndefined()
  })

  it('omits archive facets until they are set', async () => {
    setup()
    await flush()
    const f = lastFilter()
    expect(f.timeRange).toBeUndefined()
    expect(f.setterTier).toBeUndefined()
    expect(f.difficulties).toBeUndefined()
    expect(f.tags).toBeUndefined()
    expect(f.minRating).toBeUndefined()
    expect(f.myStatus).toBeUndefined()
    expect(f.featured).toBeUndefined()
    expect(f.gridSizes).toBeUndefined()
  })

  it('sends archive facets once set and resets the page', async () => {
    const list = setup()
    await flush()
    list.setPage(2)
    await nextTick(); await flush()
    list.timeRange.value = 'THIS_WEEK' as never
    list.difficulties.value = [4, 5]
    list.minRating.value = 4
    list.gridSizes.value = ['9x9']
    list.featured.value = true
    await nextTick(); await flush()
    expect(list.page.value).toBe(1)
    expect(lastFilter()).toMatchObject({
      timeRange: 'THIS_WEEK', difficulties: [4, 5], minRating: 4, gridSizes: ['9x9'], featured: true,
    })
  })
})
