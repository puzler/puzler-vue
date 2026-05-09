import { ref, onMounted, onUnmounted } from 'vue'

export function useIsMobile(breakpoint = 768) {
  const isMobile = ref(false)
  let mql: MediaQueryList | null = null

  function onChange(e: MediaQueryListEvent) {
    isMobile.value = e.matches
  }

  onMounted(() => {
    mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    isMobile.value = mql.matches
    mql.addEventListener('change', onChange)
  })

  onUnmounted(() => {
    mql?.removeEventListener('change', onChange)
  })

  return isMobile
}
