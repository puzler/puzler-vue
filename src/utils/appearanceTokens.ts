// Editor metadata for the appearance tokens: a human label and the built-in default value for
// each chrome/grid token, grouped for the settings UI. The defaults MUST mirror the @theme
// block in style.css — they are what the editor shows when a token is unset and what the
// SampleGrid preview uses (so the preview is faithful even when Enable Custom Styles is off and
// the live grid tokens aren't applied).

import type { ChromeTokenKey, GridTokenKey } from '@/utils/theme'

export interface AppearanceTokenMeta<K extends string> {
  key: K
  label: string
  default: string
}

export const CHROME_TOKENS: AppearanceTokenMeta<ChromeTokenKey>[] = [
  { key: 'ink', label: 'Nav / dark chrome', default: '#212B42' },
  { key: 'ink-2', label: 'Dark chrome hover', default: '#2F3C5C' },
  { key: 'paper', label: 'Panels', default: '#F4F2ED' },
  { key: 'canvas', label: 'Page background', default: '#EAE7E0' },
  { key: 'surface', label: 'Cards & inputs', default: '#FFFFFF' },
  { key: 'line', label: 'Borders', default: '#E3E0D8' },
  { key: 'ink-text', label: 'Primary text', default: '#232B3D' },
  { key: 'soft', label: 'Secondary text', default: '#5C6475' },
  { key: 'faint', label: 'Muted text', default: '#9097A6' },
  { key: 'action', label: 'Action accent', default: '#4F46E5' },
  { key: 'action-deep', label: 'Action hover', default: '#4338CA' },
  { key: 'action-tint', label: 'Action tint', default: '#EEF0FE' },
  { key: 'spark', label: 'Highlight accent', default: '#F0A93B' },
  { key: 'spark-tint', label: 'Highlight tint', default: '#FBEED3' },
]

export const GRID_TOKENS: AppearanceTokenMeta<GridTokenKey>[] = [
  { key: 'grid-canvas', label: 'Grid surround', default: '#EAE7E0' },
  { key: 'grid-cell', label: 'Cell fill', default: '#FFFFFF' },
  { key: 'grid-line-thin', label: 'Cell lines', default: '#6E6A5E' },
  { key: 'grid-line-box', label: 'Region borders', default: '#232B3D' },
  { key: 'grid-digit-given', label: 'Given digits', default: '#232B3D' },
  { key: 'grid-digit-input', label: 'Entered digits', default: '#4F46E5' },
  { key: 'grid-pencil', label: 'Pencil marks', default: '#4F46E5' },
  { key: 'grid-pencil-seen', label: 'Conflict marks', default: '#dc2626' },
  { key: 'grid-selection', label: 'Selection', default: '#F0A93B' },
  { key: 'grid-error', label: 'Error highlight', default: '#ef4444' },
  { key: 'grid-seen', label: 'Seen highlight', default: '#334155' },
]

export const CHROME_DEFAULTS: Record<ChromeTokenKey, string> =
  Object.fromEntries(CHROME_TOKENS.map(t => [t.key, t.default])) as Record<ChromeTokenKey, string>

export const GRID_DEFAULTS: Record<GridTokenKey, string> =
  Object.fromEntries(GRID_TOKENS.map(t => [t.key, t.default])) as Record<GridTokenKey, string>
