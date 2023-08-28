<script setup lang="ts">
import { computed } from 'vue'
import { PuzzleSolveCell } from '@/types'

const props = defineProps<{
  cell: PuzzleSolveCell
  error: boolean
}>()

const emit = defineEmits(['cell-click', 'cell-enter', 'cell-double-click'])

let lastMouseDown = null as null|number
function onMouseDown(event: PointerEvent) {
  const clickTime = Date.now()
  if (!!lastMouseDown && clickTime - lastMouseDown <= 500) {
    emit('cell-double-click', event, props.cell)
    lastMouseDown = null
  } else {
    emit('cell-click', event, props.cell)
    lastMouseDown = Date.now()
  }
}
const onMouseEnter = (event: PointerEvent) => {
  emit('cell-enter', event, props.cell)
}

const centerMarkFontSize = computed(() => {
  const { length } = props.cell.centerMarks
  switch (length) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 4:
      return '0.3em'
    case 5:
      return '0.25em'
    case 6:
      return '0.225em'
    case 7:
      return '0.2em'
    case 8:
      return '0.165em'
    case 9:
      return '0.15em'
    default:
      return '0.12em'
  }
})

const CORNER_FILL_ORDER = {
  1: { sort: 1, pos: { align: 'start', justify: 'start', row: 1, col: 1 } },
  2: { sort: 3, pos: { align: 'start', justify: 'end', row: 1, col: 3 } },
  3: { sort: 7, pos: { align: 'end', justify: 'start', row: 3, col: 1 } },
  4: { sort: 9, pos: { align: 'end', justify: 'end', row: 3, col: 3 } },
  5: { sort: 2, pos: { align: 'start', justify: 'center', row: 1, col: 2 } },
  6: { sort: 8, pos: { align: 'end', justify: 'center', row: 3, col: 2 } },
  7: { sort: 4, pos: { align: 'center', justify: 'start', row: 2, col: 1 } },
  8: { sort: 6, pos: { align: 'center', justify: 'end', row: 2, col: 3 } },
  9: { sort: 5, pos: { align: 'center', justify: 'center', row: 2, col: 2 } },
} as Record<number, {
  sort: number
  pos: {
    align: 'start'|'end'|'center'
    justify: 'start'|'end'|'center'
    row: 1|2|3
    col: 1|2|3
  }
}>

const cornerDigits = computed(() => {
  const positions = [] as Array<{
    sort: number
    pos: {
      align: 'start'|'end'|'center'
      justify: 'start'|'end'|'center',
      row: 1|2|3,
      col: 1|2|3,
    }
  }>
  for (let i = 1; i <= props.cell.cornerMarks.length; i += 1) {
    positions.push(CORNER_FILL_ORDER[i])
  }

  return positions.sort((a, b) => a.sort - b.sort).map(
    ({ pos }, i) => ({
      digit: props.cell.cornerMarks[i],
      align: pos.align,
      justify: pos.justify,
      row: pos.row,
      col: pos.col,
    })
  )
})
</script>

<template lang="pug">
.cell-container
  .cell(
    v-on:pointerdown.stop="onMouseDown"
    :class="{ error }"
  )
    .corner-marks(v-if="cell.digit === null")
      .corner(
        v-for="{ digit, align, justify, row, col } in cornerDigits"
        :key="'cell-corner-digit-' + digit"
        :style="{ alignSelf: align, justifySelf: justify, gridRow: row, gridColumn: col }"
      ) {{ digit }}
    .center(
      v-if="cell.digit === null"
      :style="{ fontSize: centerMarkFontSize }"
    ) {{ cell.centerMarks.join('') }}
    .digit(
      v-on:pointerenter="onMouseEnter"
      :class="{ given: cell.given }"
    ) {{ cell.digit === null ? ' ' : cell.digit }}
</template>

<style scoped lang="stylus">

.cell-container
  position relative
  --digitColor #1D69E5
  overflow hidden

  .cell
    position absolute
    top 0
    bottom 0
    right 0
    left 0
    display flex
    text-shadow 0.1875px 0.1875px #fff, -0.1875px 0.1875px #fff, 0.1875px -0.1875px #fff, -0.1875px -0.1875px #fff

    &.error
      background-color rgba(255, 0, 0, 0.25)
      .digit
        color #5829ac
        &.given
          color #480000

    .corner-marks
      position absolute
      top 0
      bottom 0
      right 0
      left 0
      padding 0.1em 0.05em
      display grid
      .corner
        font-size 0.25em
        line-height 0.25em
        color var(--digitColor)
    .digit
      position absolute
      top 0
      left 0
      right 0
      bottom 0
      margin 1cqw
      display flex
      align-items center
      justify-content center
      font-size 0.8em
      color var(--digitColor)
      line-height 0

      &.given
        color black
    .center
      position absolute
      top 0
      bottom 0
      left 0
      right 0
      display flex
      align-items center
      justify-content center
      line-height 0
      color var(--digitColor)
</style>
