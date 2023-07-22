import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ColorPallete } from '../types'

const LOCAL_STORAGE_COLORS_KEY = 'puzler-color-pallete'

const DEFAULT_COLOR_PALLETE = {
  colors: {
    '0': 'rgb(255, 255, 255)',
    '1': 'rgb(123, 56, 204)',
    '2': 'rgb(0, 255, 191)',
    '3': 'rgb(217, 217, 217)',
    '4': 'rgb(30, 179, 0)',
    '5': 'rgb(255, 102, 242)',
    '6': 'rgb(255, 123, 0)',
    '7': 'rgb(255, 34, 31)',
    '8': 'rgb(255, 221, 0)',
    '9': 'rgb(20, 185, 255)',
    'a': 'transparent',
    'b': 'rgb(204, 51, 17)',
    'c': 'rgb(17, 119, 51)',
    'd': 'rgb(0, 68, 196)',
    'e': 'rgb(238, 153, 170)',
    'f': 'rgb(255, 255, 25)',
    'g': 'rgb(240, 70, 240)',
    'h': 'rgb(160, 90, 30)',
    'i': 'rgb(51, 187, 238)',
    'j': 'rgb(145, 30, 180)',
    'k': 'transparent',
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
} as ColorPallete

const useColorStore = defineStore('color', () => {
  const strFromStorage = localStorage.getItem(
    LOCAL_STORAGE_COLORS_KEY
  )

  let storageJson: ColorPallete|undefined
  if (strFromStorage !== null) {
    storageJson = JSON.parse(strFromStorage)
  }

  const _pallete = (storageJson || DEFAULT_COLOR_PALLETE) as ColorPallete
  const pallete = ref(_pallete)

  function importFromString(stringPallete: string) {
    localStorage.setItem(
      LOCAL_STORAGE_COLORS_KEY,
      stringPallete,
    )
    const json = JSON.parse(stringPallete) as ColorPallete
    pallete.value = json
  }

  return {
    pallete,
    importFromString,
  }
})

export default useColorStore
