import type { InjectionKey, Ref } from 'vue'

// A folder in the sidebar tree. Defined recursively here (the generated query
// type caps nesting at a fixed depth); structurally compatible with it.
export interface FolderNode {
  id: string
  name: string
  parentId?: string | null
  position: number
  puzzleCount: number
  collectionCount: number
  children?: FolderNode[] | null
}

// Actions + shared state provided by FolderSidebar to every FolderTreeNode, so
// the recursive nodes don't have to bubble events up level by level.
export interface FolderTreeApi {
  selectedId: Ref<string>
  countKey: Ref<'puzzleCount' | 'collectionCount'>
  dragId: Ref<string | null>
  select: (id: string) => void
  rename: (node: FolderNode) => void
  remove: (node: FolderNode) => void
  createChild: (node: FolderNode) => void
  setDrag: (id: string | null) => void
  // Reparent the currently-dragged folder under targetId (null = top level).
  move: (targetId: string | null) => void
}

export const FOLDER_TREE_KEY: InjectionKey<FolderTreeApi> = Symbol('folderTree')
