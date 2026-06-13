import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { serializePuzzle, deserializePuzzle, type SerializedPuzzle } from '@/utils/puzzleExport'
import CreatePuzzleDocument from '@/graphql/gql/puzzles/mutations/CreatePuzzle.graphql'
import SavePuzzleVersionDocument from '@/graphql/gql/puzzles/mutations/SavePuzzleVersion.graphql'
import DeletePuzzleVersionDocument from '@/graphql/gql/puzzles/mutations/DeletePuzzleVersion.graphql'
import UpdatePuzzleVersionLabelDocument from '@/graphql/gql/puzzles/mutations/UpdatePuzzleVersionLabel.graphql'
import PublishPuzzleVersionDocument from '@/graphql/gql/puzzles/mutations/PublishPuzzleVersion.graphql'
import UnpublishPuzzleDocument from '@/graphql/gql/puzzles/mutations/UnpublishPuzzle.graphql'
import SetPuzzleVisibilityDocument from '@/graphql/gql/puzzles/mutations/SetPuzzleVisibility.graphql'
import GrantPuzzleAccessDocument from '@/graphql/gql/puzzles/mutations/GrantPuzzleAccess.graphql'
import RevokePuzzleAccessDocument from '@/graphql/gql/puzzles/mutations/RevokePuzzleAccess.graphql'
import PuzzleForEditDocument from '@/graphql/gql/puzzles/queries/PuzzleForEdit.graphql'
import PuzzleVersionDocument from '@/graphql/gql/puzzles/queries/PuzzleVersion.graphql'
import type {
  VersionSummaryFragment,
  PuzzleAdminFieldsFragment,
  CreatePuzzleMutation,
  CreatePuzzleMutationVariables,
  SavePuzzleVersionMutation,
  SavePuzzleVersionMutationVariables,
  DeletePuzzleVersionMutation,
  DeletePuzzleVersionMutationVariables,
  UpdatePuzzleVersionLabelMutation,
  UpdatePuzzleVersionLabelMutationVariables,
  PublishPuzzleVersionMutation,
  PublishPuzzleVersionMutationVariables,
  UnpublishPuzzleMutation,
  UnpublishPuzzleMutationVariables,
  SetPuzzleVisibilityMutation,
  SetPuzzleVisibilityMutationVariables,
  GrantPuzzleAccessMutation,
  GrantPuzzleAccessMutationVariables,
  RevokePuzzleAccessMutation,
  RevokePuzzleAccessMutationVariables,
  PuzzleForEditQuery,
  PuzzleForEditQueryVariables,
  PuzzleVersionQuery,
  PuzzleVersionQueryVariables,
} from '@/graphql/generated/types'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export type GrantedUser = PuzzleAdminFieldsFragment['grantedUsers'][number]

// Server-persistence layer for the editor: owns the current puzzle id, its
// version history, and the save/restore actions. The editor and grid stores
// hold the in-memory working copy; this store moves it to and from the API.
export const usePuzzleStore = defineStore('puzzle', () => {
  const serverPuzzleId = ref<string | null>(null)
  const shareToken = ref<string | null>(null)
  const currentVersionId = ref<string | null>(null)
  const publishedVersionId = ref<string | null>(null)
  const status = ref<string>('draft')
  const visibility = ref<string>('private')
  const grantedUsers = ref<GrantedUser[]>([])
  const versions = ref<VersionSummaryFragment[]>([])
  const saveStatus = ref<SaveStatus>('idle')
  const errorMessage = ref<string | null>(null)

  function resetPuzzle() {
    serverPuzzleId.value = null
    shareToken.value = null
    currentVersionId.value = null
    publishedVersionId.value = null
    status.value = 'draft'
    visibility.value = 'private'
    grantedUsers.value = []
    versions.value = []
    saveStatus.value = 'idle'
    errorMessage.value = null
  }

  // Sync the status/visibility/access fields from any mutation or query that
  // returns the shared PuzzleAdminFields shape, and refresh which version is
  // flagged as published.
  function applyAdminFields(puzzle: PuzzleAdminFieldsFragment) {
    serverPuzzleId.value = puzzle.id
    status.value = puzzle.status
    visibility.value = puzzle.visibility
    shareToken.value = puzzle.shareToken ?? null
    publishedVersionId.value = puzzle.publishedVersion?.id ?? null
    grantedUsers.value = [...puzzle.grantedUsers]
    versions.value = versions.value.map((v) => ({ ...v, isPublished: v.id === publishedVersionId.value }))
  }

  // Lazily creates the draft puzzle shell on first save and remembers its id.
  async function ensurePuzzle(): Promise<string> {
    if (serverPuzzleId.value) return serverPuzzleId.value
    const editor = useEditorStore()
    const grid = useGridStore()
    const { data } = await apolloClient.mutate<CreatePuzzleMutation, CreatePuzzleMutationVariables>({
      mutation: CreatePuzzleDocument,
      variables: {
        title: editor.puzzleName.trim() || 'Untitled puzzle',
        gridRows: grid.rows,
        gridCols: grid.cols,
      },
    })
    const result = data?.createPuzzle
    if (!result?.puzzle) throw new Error(result?.errors?.[0] ?? 'Could not create puzzle')
    serverPuzzleId.value = result.puzzle.id
    shareToken.value = result.puzzle.shareToken ?? null
    return result.puzzle.id
  }

  // Snapshots the current editor state as a new immutable version.
  async function saveVersion(label?: string) {
    const editor = useEditorStore()
    const grid = useGridStore()
    saveStatus.value = 'saving'
    errorMessage.value = null
    try {
      const puzzleId = await ensurePuzzle()
      // The stored definition is play-safe: the solution and solve message are
      // stripped from it and sent separately so they never reach a solver.
      const full = serializePuzzle(editor, grid)
      const definition = { ...full, solution: null, meta: { ...full.meta, solveMessage: '' } }
      const { data } = await apolloClient.mutate<SavePuzzleVersionMutation, SavePuzzleVersionMutationVariables>({
        mutation: SavePuzzleVersionDocument,
        variables: {
          puzzleId,
          definition,
          solution: editor.solution,
          solveMessage: editor.solveMessage,
          label: label ?? null,
        },
      })
      const result = data?.savePuzzleVersion
      if (!result?.version) throw new Error(result?.errors?.[0] ?? 'Could not save version')
      versions.value = [...versions.value, result.version]
      currentVersionId.value = result.version.id
      saveStatus.value = 'saved'
      return result.version
    } catch (error) {
      saveStatus.value = 'error'
      errorMessage.value = error instanceof Error ? error.message : 'Could not save'
      throw error
    }
  }

  // Loads a puzzle for editing and restores its most recent version.
  async function loadForEdit(id: string) {
    const { data } = await apolloClient.query<PuzzleForEditQuery, PuzzleForEditQueryVariables>({
      query: PuzzleForEditDocument,
      variables: { id },
      fetchPolicy: 'network-only',
    })
    const puzzle = data?.puzzle
    if (!puzzle) throw new Error('Puzzle not found')
    versions.value = [...puzzle.versions]
    applyAdminFields(puzzle)
    const latest = puzzle.versions.at(-1)
    if (latest) {
      await restoreVersion(latest.id)
    } else {
      useEditorStore().reset()
      currentVersionId.value = null
    }
  }

  // Copies a stored version into the working editor copy (non-destructive to
  // history — the next save becomes a brand-new version).
  async function restoreVersion(versionId: string) {
    const editor = useEditorStore()
    const grid = useGridStore()
    const { data } = await apolloClient.query<PuzzleVersionQuery, PuzzleVersionQueryVariables>({
      query: PuzzleVersionDocument,
      variables: { id: versionId },
      fetchPolicy: 'network-only',
    })
    const version = data?.puzzleVersion
    if (!version) throw new Error('Version not found')
    deserializePuzzle(editor, grid, version.definition as SerializedPuzzle)
    // The solution and solve message live in their own columns (stripped from
    // the definition), so restore them from the version, not the definition.
    editor.solution = (version.solution as Record<string, number> | null) ?? null
    editor.solveMessage = version.solveMessage ?? ''
    currentVersionId.value = versionId
  }

  async function renameVersion(id: string, label: string | null) {
    const { data } = await apolloClient.mutate<UpdatePuzzleVersionLabelMutation, UpdatePuzzleVersionLabelMutationVariables>({
      mutation: UpdatePuzzleVersionLabelDocument,
      variables: { id, label },
    })
    const version = data?.updatePuzzleVersionLabel?.version
    if (version) versions.value = versions.value.map((v) => (v.id === id ? version : v))
  }

  async function deleteVersion(id: string) {
    const { data } = await apolloClient.mutate<DeletePuzzleVersionMutation, DeletePuzzleVersionMutationVariables>({
      mutation: DeletePuzzleVersionDocument,
      variables: { id },
    })
    const result = data?.deletePuzzleVersion
    if (!result?.success) throw new Error(result?.errors?.[0] ?? 'Could not delete version')
    versions.value = versions.value.filter((v) => v.id !== id)
    if (currentVersionId.value === id) currentVersionId.value = null
  }

  // Publish a specific version (defaults to the loaded one) at a given access mode.
  async function publishVersion(versionId: string, mode?: string) {
    if (!serverPuzzleId.value) throw new Error('Save the puzzle before publishing')
    const { data } = await apolloClient.mutate<PublishPuzzleVersionMutation, PublishPuzzleVersionMutationVariables>({
      mutation: PublishPuzzleVersionDocument,
      variables: { puzzleId: serverPuzzleId.value, versionId, visibility: mode ?? null },
    })
    const result = data?.publishPuzzleVersion
    if (!result?.puzzle) throw new Error(result?.errors?.[0] ?? 'Could not publish')
    applyAdminFields(result.puzzle)
  }

  async function unpublish() {
    if (!serverPuzzleId.value) return
    const { data } = await apolloClient.mutate<UnpublishPuzzleMutation, UnpublishPuzzleMutationVariables>({
      mutation: UnpublishPuzzleDocument,
      variables: { id: serverPuzzleId.value },
    })
    const result = data?.unpublishPuzzle
    if (!result?.puzzle) throw new Error(result?.errors?.[0] ?? 'Could not unpublish')
    applyAdminFields(result.puzzle)
  }

  async function setVisibility(mode: string) {
    if (!serverPuzzleId.value) throw new Error('Save the puzzle first')
    const { data } = await apolloClient.mutate<SetPuzzleVisibilityMutation, SetPuzzleVisibilityMutationVariables>({
      mutation: SetPuzzleVisibilityDocument,
      variables: { id: serverPuzzleId.value, visibility: mode },
    })
    const result = data?.setPuzzleVisibility
    if (!result?.puzzle) throw new Error(result?.errors?.[0] ?? 'Could not change visibility')
    applyAdminFields(result.puzzle)
  }

  async function grantAccess(username: string) {
    if (!serverPuzzleId.value) throw new Error('Save the puzzle first')
    const { data } = await apolloClient.mutate<GrantPuzzleAccessMutation, GrantPuzzleAccessMutationVariables>({
      mutation: GrantPuzzleAccessDocument,
      variables: { puzzleId: serverPuzzleId.value, username },
    })
    const result = data?.grantPuzzleAccess
    if (!result?.puzzle) throw new Error(result?.errors?.[0] ?? 'Could not grant access')
    applyAdminFields(result.puzzle)
  }

  async function revokeAccess(userId: string) {
    if (!serverPuzzleId.value) return
    const { data } = await apolloClient.mutate<RevokePuzzleAccessMutation, RevokePuzzleAccessMutationVariables>({
      mutation: RevokePuzzleAccessDocument,
      variables: { puzzleId: serverPuzzleId.value, userId },
    })
    const result = data?.revokePuzzleAccess
    if (!result?.puzzle) throw new Error(result?.errors?.[0] ?? 'Could not revoke access')
    applyAdminFields(result.puzzle)
  }

  return {
    serverPuzzleId,
    shareToken,
    currentVersionId,
    publishedVersionId,
    status,
    visibility,
    grantedUsers,
    versions,
    saveStatus,
    errorMessage,
    resetPuzzle,
    saveVersion,
    loadForEdit,
    restoreVersion,
    renameVersion,
    deleteVersion,
    publishVersion,
    unpublish,
    setVisibility,
    grantAccess,
    revokeAccess,
  }
})
