import { ApolloClient, InMemoryCache, split } from '@apollo/client/core'
import { getMainDefinition } from '@apollo/client/utilities'
import { createUploadLink } from 'apollo-upload-client'
import { createConsumer } from '@rails/actioncable'
import ActionCableLink from 'graphql-ruby-client/subscriptions/ActionCableLink'
import { getToken } from '@/utils/tokenStorage'
import { API_URL, WS_URL } from '@/utils/env'
import fragmentTypes from '@/graphql/generated/fragment-types.json'

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

// GraphQL subscriptions ride Rails ActionCable. The connection is authenticated:
// the JWT can't go in a header on the WS handshake, so it rides the cable URL as
// a `token` param (decoded by ApplicationCable::Connection). The function form is
// re-evaluated on each (re)connect, so a refreshed token is picked up. Guests have
// no token and never subscribe, so they never open the connection.
// graphql-ruby-client's ActionCableLink speaks the protocol Rails actually serves.
const cable = createConsumer(() => {
  const token = getToken()
  return token ? `${WS_URL}/cable?token=${encodeURIComponent(token)}` : `${WS_URL}/cable`
})
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
