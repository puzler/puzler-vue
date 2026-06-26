import { ApolloClient, InMemoryCache, split } from '@apollo/client/core'
import { getMainDefinition } from '@apollo/client/utilities'
import { createUploadLink } from 'apollo-upload-client'
import ActionCableLink from 'graphql-ruby-client/subscriptions/ActionCableLink'
import { getToken } from '@/utils/tokenStorage'
import { getGuestToken } from '@/utils/guestIdentity'
import { cable } from '@/utils/cableConsumer'
import { API_URL } from '@/utils/env'
import fragmentTypes from '@/graphql/generated/fragment-types.json'

// Logged-in requests carry the JWT; guests carry their opaque guest token (the
// server gates real access via accessible_by?, so this header just identifies them).
function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  if (token) return { Authorization: `Bearer ${token}` }
  return { 'X-Guest-Token': getGuestToken() }
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

// GraphQL subscriptions ride Rails ActionCable (the shared authenticated consumer
// is in utils/cableConsumer.ts). graphql-ruby-client's ActionCableLink speaks the
// protocol Rails actually serves.
const cableLink = new ActionCableLink({ cable })

// Subscription operations go to the cable link; queries and mutations (including
// avatar uploads) go to the upload/http link.
const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query)
    return def.kind === 'OperationDefinition' && def.operation === 'subscription'
  },
  cableLink,
  httpLink,
)

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({ possibleTypes: fragmentTypes.possibleTypes }),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
})
