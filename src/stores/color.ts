import { ref } from 'vue'
import { defineStore } from 'pinia'
import { ColorPalette } from '@/types'

const useColorStore = defineStore('color', () => {
  const LOCAL_STORAGE_COLORS_KEY = 'puzler-color-palette'

  const strFromStorage = localStorage.getItem(
    LOCAL_STORAGE_COLORS_KEY
  )

  const palette = ref(
    ((): ColorPalette => {
      if (!strFromStorage) return new ColorPalette()

      return ColorPalette.fromString(strFromStorage)
    })(),
  )

  function importFromString(stringPalette: string) {
    palette.value = ColorPalette.fromString(stringPalette)
    savePalette()
  }

  function savePalette() {
    localStorage.setItem(
      LOCAL_STORAGE_COLORS_KEY,
      palette.value.toJson(),
    )
  }

  return {
    palette,
    importFromString,
    savePalette,
  }
})

export default useColorStore
