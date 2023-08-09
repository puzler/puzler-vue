import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  HttpLink,
} from '@apollo/client/core'
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

export default new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
})
