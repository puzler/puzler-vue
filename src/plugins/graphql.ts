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

const apiUrl = `${import.meta.env.VITE_PUZLER_API_ROOT}/graphql`

const uploadLink = createUploadLink({ uri: apiUrl }) as ApolloLink
const httpLink = ApolloLink.split(
  (operation) => operation.getContext().hasUpload,
  uploadLink,
  new HttpLink({ uri: apiUrl }),
)

const errorLink = onError((errorHandler) => {
  console.error('Received Error from GraphQL Request')
  console.debug(errorHandler)
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
