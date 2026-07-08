<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { mdiDragHorizontal } from '@mdi/js'
import MdiIcon from '@/components/MdiIcon.vue'
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
  // When true (default) the backdrop is dimmed with a translucent black scrim.
  // Set false to keep the backdrop fully transparent, e.g. so a native eyedropper
  // reads the true colours of the page underneath instead of the tinted scrim.
  dimBackdrop?: boolean
  // 'center' only, desktop only: adds a grab-bar strip along the card's top edge
  // that the user can drag to reposition the modal (e.g. to reach page content
  // that its default position covers).
  draggable?: boolean
  // Extra classes merged onto the card (e.g. inner padding, items-center, gap).
  cardClass?: string
}>(), {
  variant: 'center',
  size: 'sm',
  closeOnBackdrop: true,
  closeOnEscape: true,
  scroll: true,
  dimBackdrop: true,
  draggable: false,
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

const backdropClass = computed(() => {
  const dim = props.dimBackdrop ? 'bg-black/40 ' : ''
  return props.variant === 'sheet'
    ? `fixed inset-0 z-50 ${dim}flex items-stretch justify-center sm:items-center sm:p-4`
    : `fixed inset-0 z-50 ${dim}flex items-center justify-center p-4`
})

const cardClasses = computed(() => {
  const size = SIZE[props.size]
  // Against an undimmed backdrop the card must stand out on every edge, so swap
  // the offset shadow for a centred halo (shadow-xl leaves the top edge bare).
  const shadow = props.dimBackdrop ? 'shadow-xl' : 'shadow-[0_0_30px_rgba(0,0,0,0.25)]'
  if (props.variant === 'sheet') {
    return `bg-surface ${shadow} flex flex-col w-full h-full rounded-none overflow-hidden sm:h-auto sm:w-full ${size} sm:max-h-[85vh] sm:rounded-2xl`
  }
  const overflow = props.scroll ? 'max-h-[85vh] overflow-y-auto' : ''
  const drag = props.draggable ? 'relative' : ''
  return `bg-surface ${shadow} flex flex-col w-full ${size} rounded-2xl ${overflow} ${drag}`
})

function onBackdrop() {
  if (props.closeOnBackdrop) emit('close')
}

// Drag offset from the flex-centred base position, applied as a transform so
// centring and resize behaviour stay intact. Modals mount via v-if, so the
// offset naturally resets on reopen.
const dragX = ref(0)
const dragY = ref(0)
const cardEl = ref<HTMLElement | null>(null)
let dragStart: { pointerX: number, pointerY: number, x: number, y: number, rect: DOMRect } | null = null

const cardStyle = computed(() =>
  props.draggable ? { transform: `translate(${dragX.value}px, ${dragY.value}px)` } : undefined,
)

function onDragStart(event: PointerEvent) {
  if (!cardEl.value) return
  event.preventDefault()
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  dragStart = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    x: dragX.value,
    y: dragY.value,
    rect: cardEl.value.getBoundingClientRect(),
  }
}

// Keep the card reachable: its top edge never leaves the viewport top, and at
// least this much of it stays inside every other edge.
const MIN_VISIBLE = 48

function onDragMove(event: PointerEvent) {
  if (!dragStart) return
  const { pointerX, pointerY, x, y, rect } = dragStart
  // rect was measured at offset (x, y); base position is rect minus that offset.
  const baseLeft = rect.left - x
  const baseTop = rect.top - y
  const nextX = x + event.clientX - pointerX
  const nextY = y + event.clientY - pointerY
  dragX.value = Math.max(
    MIN_VISIBLE - rect.width - baseLeft,
    Math.min(nextX, window.innerWidth - MIN_VISIBLE - baseLeft),
  )
  dragY.value = Math.max(
    -baseTop,
    Math.min(nextY, window.innerHeight - MIN_VISIBLE - baseTop),
  )
}

function onDragEnd(event: PointerEvent) {
  dragStart = null
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
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
      <div
        ref="cardEl"
        :class="[cardClasses, cardClass]"
        :style="cardStyle"
      >
        <div
          v-if="draggable"
          class="absolute inset-x-0 top-0 h-6 hidden md:flex items-center justify-center rounded-t-2xl cursor-grab active:cursor-grabbing touch-none select-none text-faint hover:text-soft hover:bg-paper transition-colors"
          aria-hidden="true"
          @pointerdown="onDragStart"
          @pointermove="onDragMove"
          @pointerup="onDragEnd"
          @pointercancel="onDragEnd"
        >
          <MdiIcon
            :path="mdiDragHorizontal"
            :size="18"
          />
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
