// apollo-upload-client v17 ships no types (and @types only targets v19/Apollo 4).
// Minimal declaration of the one export we use.
declare module 'apollo-upload-client' {
  import type { ApolloLink } from '@apollo/client/core'

  export function createUploadLink(options?: {
    uri?: string
    fetch?: typeof fetch
    fetchOptions?: RequestInit
    headers?: Record<string, string>
    credentials?: string
  }): ApolloLink
}
