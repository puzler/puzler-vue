import { ApolloClient, InMemoryCache, split } from '@apollo/client/core'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { createClient } from 'graphql-ws'
import { createUploadLink } from 'apollo-upload-client'
import { getToken } from '@/utils/tokenStorage'
import fragmentTypes from '@/graphql/generated/fragment-types.json'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const WS_URL = API_URL.replace(/^http/, 'ws')

function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// createUploadLink is a drop-in for createHttpLink that sends a GraphQL
// multipart request when variables contain a File/Blob (avatar upload),
// and a normal JSON request otherwise.
const httpLink = createUploadLink({
  uri: `${API_URL}/graphql`,
  fetch: (uri: RequestInfo | URL, options: RequestInit = {}) => {
    const existing = (options.headers as Record<string, string>) ?? {}
    return fetch(uri, { ...options, headers: { ...existing, ...getAuthHeaders() } })
  },
})

const wsLink = new GraphQLWsLink(
  createClient({
    url: `${WS_URL}/cable`,
    connectionParams: () => ({ token: getToken() }),
  }),
)

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query)
    return def.kind === 'OperationDefinition' && def.operation === 'subscription'
  },
  wsLink,
  httpLink,
)

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({ possibleTypes: fragmentTypes.possibleTypes }),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
})
