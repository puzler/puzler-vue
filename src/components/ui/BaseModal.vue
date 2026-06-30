<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { pushModal } from './modalStack'

// Shared chrome for every modal: Teleport to body, dimmed backdrop with
// click-outside-to-close, a `data-modal-open` sentinel marking that a modal is on
// screen, Escape-to-close, and responsive sizing. The
// modal supplies its own header/body/footer markup in the default slot, so each
// migration just swaps the outer Teleport+backdrop+card boilerplate for this.
//
// Two archetypes:
//   variant="center"  small card, centered both axes, full-width-minus-gutter on
//                      mobile, capped at `size` from sm: up. The card itself
//                      scrolls when content is tall.
//   variant="sheet"   full-screen on mobile (edge to edge), centered card on
//                      desktop. The card is overflow-hidden so the modal's own
//                      flex children (header shrink-0 / body flex-1 min-h-0
//                      overflow-y-auto / footer shrink-0) manage scrolling.
type Variant = 'center' | 'sheet'
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

const props = withDefaults(defineProps<{
  variant?: Variant
  size?: Size
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  // 'center' only: when true (default) the card caps at 85vh and scrolls its own
  // content. Set false for modals whose content must overflow the card without
  // clipping (e.g. hover tooltips/popovers positioned outside it).
  scroll?: boolean
  // Extra classes merged onto the card (e.g. inner padding, items-center, gap).
  cardClass?: string
}>(), {
  variant: 'center',
  size: 'sm',
  closeOnBackdrop: true,
  closeOnEscape: true,
  scroll: true,
  cardClass: '',
})

const emit = defineEmits<{ close: [] }>()

const SIZE: Record<Size, string> = {
  xs: 'sm:max-w-xs',
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
}

const backdropClass = computed(() =>
  props.variant === 'sheet'
    ? 'fixed inset-0 z-50 bg-black/40 flex items-stretch justify-center sm:items-center sm:p-4'
    : 'fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4',
)

const cardClasses = computed(() => {
  const size = SIZE[props.size]
  if (props.variant === 'sheet') {
    return `bg-surface shadow-xl flex flex-col w-full h-full rounded-none overflow-hidden sm:h-auto sm:w-full ${size} sm:max-h-[85vh] sm:rounded-2xl`
  }
  const overflow = props.scroll ? 'max-h-[85vh] overflow-y-auto' : ''
  return `bg-surface shadow-xl flex flex-col w-full ${size} rounded-2xl ${overflow}`
})

function onBackdrop() {
  if (props.closeOnBackdrop) emit('close')
}

let unregister: (() => void) | null = null
onMounted(() => {
  if (props.closeOnEscape) unregister = pushModal(() => emit('close'))
})
onUnmounted(() => unregister?.())
</script>

<template>
  <Teleport to="body">
    <div
      data-modal-open
      :class="backdropClass"
      @click.self="onBackdrop"
    >
      <div :class="[cardClasses, cardClass]">
        <slot />
      </div>
    </div>
  </Teleport>
</template>
