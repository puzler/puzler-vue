import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ColorPalette } from '../types'

const useColorStore = defineStore('color', () => {
  const LOCAL_STORAGE_COLORS_KEY = 'puzler-color-palette'

  const DEFAULT_COLOR_PALLETE = {
    colors: {
      '0': 'rgb(255, 255, 255)',
      '1': 'rgb(180, 128, 241)',
      '2': 'rgb(116, 245, 201)',
      '3': 'rgb(218, 218, 218)',
      '4': 'rgb(102, 195, 101)',
      '5': 'rgb(255, 154, 248)',
      '6': 'rgb(253, 126, 33)',
      '7': 'rgb(247, 89, 99)',
      '8': 'rgb(247, 224, 108)',
      '9': 'rgb(119, 191, 255)',
      'a': 'rgb(255, 255, 255)',
      'b': 'rgb(204, 51, 17)',
      'c': 'rgb(17, 119, 51)',
      'd': 'rgb(0, 68, 196)',
      'e': 'rgb(238, 153, 170)',
      'f': 'rgb(255, 255, 25)',
      'g': 'rgb(240, 70, 240)',
      'h': 'rgb(160, 90, 30)',
      'i': 'rgb(51, 187, 238)',
      'j': 'rgb(145, 30, 180)',
      'k': 'rgb(255, 255, 255)',
      'l': 'rgb(245, 58, 55)',
      'm': 'rgb(76, 175, 80)',
      'n': 'rgb(61, 153, 245)',
      'o': 'rgb(249, 136, 134)',
      'p': 'rgb(149, 208, 151)',
      'q': 'rgb(158, 204, 250)',
      'r': 'rgb(170, 12, 9)',
      's': 'rgb(47, 106, 49)',
      't': 'rgb(9, 89, 170)',
    },
    pages: [
      ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
      ['k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't'],
    ],
  } as ColorPalette

  const strFromStorage = localStorage.getItem(
    LOCAL_STORAGE_COLORS_KEY
  )

  let storageJson: ColorPalette|undefined
  if (strFromStorage !== null) {
    storageJson = JSON.parse(strFromStorage)
  }

  const _palette = (storageJson || DEFAULT_COLOR_PALLETE) as ColorPalette
  const palette = ref(_palette)

  function importFromString(stringPalette: string) {
    const json = JSON.parse(stringPalette) as ColorPalette
    palette.value = json
    savePalette()
  }

  function savePalette() {
    localStorage.setItem(
      LOCAL_STORAGE_COLORS_KEY,
      JSON.stringify(palette.value),
    )
  }

  return {
    palette,
    importFromString,
    savePalette,
  }
})

export default useColorStore
