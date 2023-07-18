import { ref } from 'vue'
import { defineStore } from 'pinia'

const useStylingStore = defineStore('styling', () => {
  const darkMode = ref(false)

  function toggleDarkMode() {
    darkMode.value = !darkMode.value
  }

  return {
    darkMode,
    toggleDarkMode,
  }
})

export default useStylingStore
