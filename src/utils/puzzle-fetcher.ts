import graphql from '@/plugins/graphql'
import LoadFPuzzleQuery from '@/graphql/gql/puzzles/queries/LoadFPuzzle.graphql'
import FetchPuzzleQuery from '@/graphql/gql/puzzles/queries/FetchPuzzle.graphql'

const PuzzleFetcher = {
  async fetchById(id: string) {
    const response = await graphql.query({
      query: FetchPuzzleQuery,
      variables: { id },
    })

    return response.data.fetchPuzzle
  },
  async fetchFPuzzle(base64Data: string) {
    const response = await graphql.query({
      query: LoadFPuzzleQuery,
      variables: { base64Data },
    })

    return response.data.loadFPuzzle
  },
}

export default PuzzleFetcher
