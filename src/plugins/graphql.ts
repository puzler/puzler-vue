import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  HttpLink,
  from
} from '@apollo/client/core'
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context'
import { createUploadLink } from 'apollo-upload-client'
import { LOCAL_STORAGE_JWT_KEY } from '@/stores/auth'
import Bugsnag, { type OnErrorCallback } from '@bugsnag/js';

const apiUrl = `${import.meta.env.VITE_PUZLER_API_ROOT}/graphql`

const uploadLink = createUploadLink({ uri: apiUrl }) as ApolloLink
const httpLink = ApolloLink.split(
  (operation) => operation.getContext().hasUpload,
  uploadLink,
  new HttpLink({ uri: apiUrl }),
)

const errorLink = onError((errorHandler) => {
  const onError: OnErrorCallback = (event) => {
    event.context = 'GraphQL Error'
    event.addMetadata('operation', errorHandler.operation)
    if (errorHandler.response) event.addMetadata('response', errorHandler.response)
  }

  errorHandler.graphQLErrors?.forEach((error) => {
    Bugsnag.notify(
      new Error(error.message),
      onError,
    )
  })

  if (errorHandler.networkError) {
    Bugsnag.notify(
      errorHandler.networkError,
      onError,
    )
  }
})

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem(LOCAL_STORAGE_JWT_KEY)
  if (!token) return { headers }

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  }
})

const requestLink = authLink.concat(httpLink)
const linkChain = from([errorLink, requestLink])

export default new ApolloClient({
  link: linkChain,
  cache: new InMemoryCache(),
})
