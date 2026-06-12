# GraphQL conventions

- **No inline `gql` tags.** Every query/mutation/fragment lives in a `.graphql` file under `src/graphql/gql/` and is imported where used.
- **Directory layout**: `gql/fragments/` holds all fragments app-wide; each store/category gets its own directory with `queries/` and `mutations/` subdirectories (e.g. `gql/auth/queries/Me.graphql`). Future stores (editor, player, social…) follow the same pattern.
- **Fragments**: spread shared selections (e.g. `...UserFields`) instead of repeating field lists.
- **Codegen**: `npm run codegen` regenerates `src/graphql/generated/` from the live schema — the Rails API must be running on :3000. Re-run after any backend schema change. Generated files are committed.
- **Typed call sites**: import operation types from `@/graphql/generated/types` (e.g. `apolloClient.query<MeQuery>({ query: MeDocument })`).
