import {
  CollectionAccentColorEnum,
  CollectionBgTreatmentEnum,
  CollectionTitleFontEnum,
} from '@/graphql/generated/types'

// Curated collection-page accents (see style.css "Collection accents" and
// STYLE_GUIDE.md). Each enum value maps to a CSS class that overrides the
// Ink & Paper tokens inside the collection page root; Default maps to no
// class so untouched collections render exactly as before.

export const ACCENT_OPTIONS: { value: CollectionAccentColorEnum; label: string; swatch: string }[] = [
  { value: CollectionAccentColorEnum.Default, label: 'Indigo', swatch: '#4F46E5' },
  { value: CollectionAccentColorEnum.Forest, label: 'Forest', swatch: '#2F7D46' },
  { value: CollectionAccentColorEnum.Wine, label: 'Wine', swatch: '#A03352' },
  { value: CollectionAccentColorEnum.Ocean, label: 'Ocean', swatch: '#0F7490' },
  { value: CollectionAccentColorEnum.Ember, label: 'Ember', swatch: '#C2571B' },
  { value: CollectionAccentColorEnum.Violet, label: 'Violet', swatch: '#7C3AED' },
]

export const BG_OPTIONS: { value: CollectionBgTreatmentEnum; label: string }[] = [
  { value: CollectionBgTreatmentEnum.Default, label: 'Paper' },
  { value: CollectionBgTreatmentEnum.Parchment, label: 'Parchment' },
  { value: CollectionBgTreatmentEnum.Linen, label: 'Linen' },
  { value: CollectionBgTreatmentEnum.Dusk, label: 'Dusk' },
]

export const FONT_OPTIONS: { value: CollectionTitleFontEnum; label: string }[] = [
  { value: CollectionTitleFontEnum.Default, label: 'Grotesk' },
  { value: CollectionTitleFontEnum.Serif, label: 'Serif' },
  { value: CollectionTitleFontEnum.Mono, label: 'Mono' },
]

const ACCENT_CLASSES: Record<CollectionAccentColorEnum, string> = {
  [CollectionAccentColorEnum.Default]: '',
  [CollectionAccentColorEnum.Forest]: 'collection-accent-forest',
  [CollectionAccentColorEnum.Wine]: 'collection-accent-wine',
  [CollectionAccentColorEnum.Ocean]: 'collection-accent-ocean',
  [CollectionAccentColorEnum.Ember]: 'collection-accent-ember',
  [CollectionAccentColorEnum.Violet]: 'collection-accent-violet',
}

const BG_CLASSES: Record<CollectionBgTreatmentEnum, string> = {
  [CollectionBgTreatmentEnum.Default]: '',
  [CollectionBgTreatmentEnum.Parchment]: 'collection-bg-parchment',
  [CollectionBgTreatmentEnum.Linen]: 'collection-bg-linen',
  [CollectionBgTreatmentEnum.Dusk]: 'collection-bg-dusk',
}

const FONT_CLASSES: Record<CollectionTitleFontEnum, string> = {
  [CollectionTitleFontEnum.Default]: '',
  [CollectionTitleFontEnum.Serif]: 'collection-font-serif',
  [CollectionTitleFontEnum.Mono]: 'collection-font-mono',
}

/** CSS classes for a collection page root; null/undefined enums mean default. */
export function collectionThemeClasses(theme: {
  accentColor?: CollectionAccentColorEnum | null
  bgTreatment?: CollectionBgTreatmentEnum | null
  titleFont?: CollectionTitleFontEnum | null
}): string[] {
  return [
    ACCENT_CLASSES[theme.accentColor ?? CollectionAccentColorEnum.Default],
    BG_CLASSES[theme.bgTreatment ?? CollectionBgTreatmentEnum.Default],
    FONT_CLASSES[theme.titleFont ?? CollectionTitleFontEnum.Default],
  ].filter(Boolean)
}
