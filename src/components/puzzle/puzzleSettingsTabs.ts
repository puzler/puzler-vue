import { mdiEyeOutline, mdiTextBoxOutline, mdiCommentOutline, mdiShareVariantOutline } from '@mdi/js'

// The section tabs shared by the puzzle-page Manage modal and the editor's
// Publish & Share modal. Keys are matched against `activeTab` in
// PuzzleSettingsPanels, so keep them in sync.
export const PUZZLE_SETTINGS_TABS = [
  { key: 'visibility', label: 'Visibility', icon: mdiEyeOutline },
  { key: 'description', label: 'Description', icon: mdiTextBoxOutline },
  { key: 'comments', label: 'Comments', icon: mdiCommentOutline },
  { key: 'share', label: 'Share', icon: mdiShareVariantOutline },
]
