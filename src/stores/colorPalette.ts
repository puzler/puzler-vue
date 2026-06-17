import { defineStore } from 'pinia'
import { reactive, ref, watch, computed } from 'vue'
import { useAuthStore } from './auth'
import {
  ColorPalette,
  loadColorPalette,
  saveColorPalette,
  paletteDataFromRaw,
  transparentFill,
  swatchBackground as swatchBackgroundFor,
} from '@/utils/colorPalette'

// The user's cell-coloring palette + which page is active. Local-first with
// server sync for logged-in users, mirroring stores/playerSettings.ts.
export const useColorPaletteStore = defineStore('colorPalette', () => {
  const palette = reactive(loadColorPalette()) as ColorPalette
  const pageIndex = ref(0)

  let serverJson: string | null = null

  const pageCount = computed(() => palette.pages.length)
  const currentPageKeys = computed(() => palette.pages[pageIndex.value] ?? [])

  // Resolve a color key to the pastel rgba actually painted (null = render none).
  function fillForKey(key: string): string | null {
    return transparentFill(palette.colors[key])
  }
  // Whether the key names a real palette color (even a fully-transparent one).
  // Lets a cell reserve a wedge for a transparent color while still dropping
  // stale/unknown keys.
  function hasColor(key: string): boolean {
    return palette.colors[key] !== undefined
  }
  // The raw swatch color for palette UI / buttons (may carry alpha).
  function swatchForKey(key: string): string {
    return palette.colors[key] ?? palette.defaultColor
  }
  // CSS `background` for a swatch button: the colour over a checkerboard so
  // transparency is visible.
  function swatchBackground(key: string): string {
    return swatchBackgroundFor(palette.colors[key])
  }

  function setPageIndex(i: number) {
    pageIndex.value = Math.max(0, Math.min(i, palette.pages.length - 1))
  }
  function cyclePage() {
    pageIndex.value = (pageIndex.value + 1) % palette.pages.length
  }

  // --- Palette editing (delegates to the ported ColorPalette ops) ----------
  function setColor(key: string, rgb: string) { palette.colors[key] = rgb }
  function newPage() { palette.newPage() }
  function duplicatePage(i: number) { palette.duplicatePage(i) }
  function deletePage(i: number) {
    if (palette.deletePage(i)) setPageIndex(Math.min(pageIndex.value, palette.pages.length - 1))
  }
  function movePageLeft(i: number): boolean { return palette.movePageLeft(i) }
  function movePageRight(i: number): boolean { return palette.movePageRight(i) }

  function applyData(data: ReturnType<ColorPalette['toData']>) {
    serverJson = JSON.stringify(data)
    palette.colors = { ...data.colors }
    palette.pages = data.pages.map((p) => [...p])
    setPageIndex(pageIndex.value)
  }

  // Server is the source of truth for logged-in users; push immediately so a
  // reload elsewhere reflects palette edits. NOTE: the palette editor must
  // commit color changes on release (the picker's `change`, not live `input`)
  // so dragging the color picker doesn't fire a mutation per pixel.
  function pushToServer() {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) return
    const json = palette.toJson()
    if (json === serverJson) return
    serverJson = json
    auth.updatePlayerPrefs({ colorPalette: JSON.parse(json) }).catch(() => {
      serverJson = null
    })
  }

  // Persist locally on any palette change, plus debounced server sync.
  watch(palette, () => {
    saveColorPalette(palette)
    pushToServer()
  }, { deep: true })

  const auth = useAuthStore()
  watch(() => auth.user, (u) => {
    if (!u) return
    const data = paletteDataFromRaw(u.colorPalette)
    if (data) applyData(data)
    else pushToServer() // server has no palette yet — seed from local
  }, { immediate: true })

  return {
    palette,
    pageIndex,
    pageCount,
    currentPageKeys,
    fillForKey,
    hasColor,
    swatchForKey,
    swatchBackground,
    setPageIndex,
    cyclePage,
    setColor,
    newPage,
    duplicatePage,
    deletePage,
    movePageLeft,
    movePageRight,
  }
})
