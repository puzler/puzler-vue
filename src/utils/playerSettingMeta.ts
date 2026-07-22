import type { PlayerSettings } from '@/utils/playerSettings'

// Display metadata for every player setting, shared by the solver's settings
// modal and the competition author's enforced-settings list. Keys must stay in
// step with PlayerSettings (a test guards the drift).

export interface SettingMeta {
  key: keyof PlayerSettings
  label: string
  hint?: string
}

export interface SettingGroup {
  title: string
  items: SettingMeta[]
}

export const PLAYER_SETTING_GROUPS: SettingGroup[] = [
  {
    title: 'Visual',
    items: [
      { key: 'showRowColLabels', label: 'Row & column labels', hint: 'Number the grid edges' },
      { key: 'hideTimer', label: 'Hide timer' },
      { key: 'hideColors', label: 'Hide cell colours', hint: 'Hide the puzzle’s built-in cell colours' },
    ],
  },
  {
    title: 'Gameplay',
    items: [
      { key: 'showRulesOnStart', label: 'Show rules on start' },
      { key: 'highlightSeen', label: 'Highlight seen cells', hint: 'Shade cells the selection can see' },
    ],
  },
  {
    title: 'Checking',
    items: [
      { key: 'checkOnFinish', label: 'Check on finish', hint: 'Detect a solve automatically' },
      { key: 'revealPartialProgress', label: 'Reveal partial progress', hint: 'Let “Check” say if you’re correct so far' },
      { key: 'highlightConflicts', label: 'Highlight conflicts', hint: 'Flag repeated digits' },
      { key: 'highlightConflictingPencilmarks', label: 'Highlight conflicting pencil marks' },
    ],
  },
  {
    title: 'Available Tools',
    items: [
      { key: 'enableLineTool', label: 'Line tool', hint: 'Draw lines and X/O marks on the grid while solving' },
      { key: 'enableLetterTool', label: 'Letter tool', hint: 'Numpad toggle to enter letters instead of digits' },
      { key: 'enablePanTool', label: 'Pan tool', hint: 'Drag to move around a zoomed board (appears automatically on oversized puzzles)' },
    ],
  },
  {
    title: 'Helpers',
    items: [
      { key: 'enableSelectionCalculator', label: 'Selection calculator', hint: 'Show the possible sum of the selected cells' },
      { key: 'enableKillerHelper', label: 'Killer cage helper', hint: 'List possible combinations for the selected cage' },
      { key: 'enableSumHelper', label: 'Sum combinations', hint: 'Look up distinct-digit combinations for a size and total' },
    ],
  },
  {
    title: 'Collaboration',
    items: [
      { key: 'enableCollaborationMode', label: 'Enable collaboration mode', hint: 'Share an in-progress puzzle and solve together in real time' },
      { key: 'hideShareToken', label: 'Hide share token', hint: 'Keep the raw token hidden (handy when screen-sharing)' },
    ],
  },
]

// Collaboration is hard-blocked during competitions (forced off server of
// fairness), so authors don't get a tri-state for it.
export const ENFORCEABLE_SETTING_GROUPS: SettingGroup[] =
  PLAYER_SETTING_GROUPS.filter((group) => group.title !== 'Collaboration')

const LABELS = new Map(PLAYER_SETTING_GROUPS.flatMap((g) => g.items.map((i) => [ i.key as string, i.label ])))

/** Human label for a player-setting key; falls back to the key itself. */
export function settingLabel(key: string): string {
  return LABELS.get(key) ?? key
}
