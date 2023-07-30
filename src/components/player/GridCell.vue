<script setup lang="ts">
import { computed } from 'vue'
import { Cell } from '@/types'
import useColorStore from '@/stores/color'
import useSettingStore from '@/stores/setting'

const props = defineProps<{
  cell: Cell
  error: boolean
}>()

const emit = defineEmits(['mousedown', 'mouseenter'])
const onMouseDown = (event: PointerEvent) => emit('mousedown', event, props.cell)
const onMouseEnter = (event: PointerEvent) => emit('mouseenter', event, props.cell)

const settingStore = useSettingStore()
const colorStore = useColorStore()
const colors = computed(() => colorStore.palette.colors)

function sideClasses(neighbor: Cell|undefined, key: string): Array<string> {
  const classes = [] as Array<string>

  if (neighbor === undefined) {
    classes.push(`${key}-outer`)
  } else if (props.cell.region !== neighbor.region) {
    classes.push(`${key}-region`)
  }

  if (props.cell.selected && !neighbor?.selected) classes.push(`${key}-selected`)

  return classes
}

function cornerClasses(
  neighbors: Array<Cell|undefined>,
  cornerNeighbor: Cell|undefined,
  key: string
): Array<string> {
  const classes = [] as Array<string>

  if (neighbors.every((n) => n?.region === props.cell.region)) {
    if (props.cell.region !== cornerNeighbor?.region) {
      classes.push(`${key}-region-dot`)
    }
  }

  if (props.cell.selected) {
    if (neighbors.every((n) => n?.selected) && !cornerNeighbor?.selected) {
      classes.push(`${key}-selected-dot`)
    }
  }

  return classes
}

const cellClasses = computed(() => {
  const {
    left,
    right,
    up,
    down,
  } = props.cell.neighbors

  const classes = [
    ...sideClasses(left, 'left'),
    ...sideClasses(right, 'right'),
    ...sideClasses(up, 'top'),
    ...sideClasses(down, 'bottom'),
    ...cornerClasses([up, left], up?.neighbors.left, 'top-left'),
    ...cornerClasses([up, right], up?.neighbors.right, 'top-right'),
    ...cornerClasses([down, left], down?.neighbors.left, 'bottom-left'),
    ...cornerClasses([down, right], down?.neighbors.right, 'bottom-right'),
  ]

  if (props.error && settingStore.userSettings.highlightConflicts) {
    classes.push('error')
  }

  return classes
})

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

const cellColorStyle = computed(() => {
  if (props.cell.cellColors.length === 0) return {}
  if (props.cell.cellColors.length === 1) return { backgroundColor: colors.value[props.cell.cellColors[0]] }

  const portionPerColor = 100 / props.cell.cellColors.length
  const orderedColors = [...props.cell.cellColors].reverse()
  const colorPortion = orderedColors.map((color, i) => {
    const start = (portionPerColor * i) - 5
    let end = start + portionPerColor
    if (i === 0) return `${colors.value[color]} ${end}%`
    return `${colors.value[color]} ${start}% ${end}%`
  })
  colorPortion.push(`${colors.value[orderedColors[0]]} ${((portionPerColor * (orderedColors.length)) - 5)}% 100%`)

  return {
    background: `conic-gradient(${colorPortion.join(',')})`,
  }
})

</script>

<template lang="pug">
.cell-container(:style="cellColorStyle")
  .cell(
    :class="cellClasses"
    v-on:pointerdown.stop="onMouseDown"
  )
    .corner-selected-dot.top.left
    .corner-selected-dot.top.right
    .corner-selected-dot.bottom.left
    .corner-selected-dot.bottom.right
    .corner-region-dot.top.left
    .corner-region-dot.top.right
    .corner-region-dot.bottom.left
    .corner-region-dot.bottom.right

    .selected-border(
      v-on:pointerenter="onMouseEnter"
    )
      .digit(
        :class="{ given: cell.given }"
      ) {{ cell.digit === null ? '' : cell.digit }}
      .center(
        v-if="cell.digit === null"
        :style="{ fontSize: centerMarkFontSize }"
      ) {{ cell.centerMarks.join('') }}
      .corner-marks(v-if="cell.digit === null")
        .corner(
          v-for="{ digit, align, justify, row, col } in cornerDigits"
          :key="'cell-corner-digit-' + digit"
          :style="{ alignSelf: align, justifySelf: justify, gridRow: row, gridColumn: col }"
        ) {{ digit }}
</template>

<style scoped lang="stylus">

.cell-container
  position relative
  --selectedBorderColor #62A4FF
  --digitColor #1D69E5
  --cellBorderWidth 0.5px
  --regionBorderWidth 2px
  --outerBorderWidth 4px
  --selectedCornerRadius 3px

  .cell
    position absolute
    top 0
    bottom 0
    right 0
    left 0
    border var(--cellBorderWidth) solid black
    display flex

    &.error .selected-border
      background-color rgba(255, 0, 0, 0.25)
      .digit
        color #5829ac
        &.given
          color #480000

    &.left-region
      border-left-width var(--regionBorderWidth)
      .selected-border
        padding-left calc(var(--selectedBorderWidth) - (var(--regionBorderWidth) - var(--cellBorderWidth)))
      .corner-selected-dot.left
        border-left-width calc(var(--selectedBorderWidth) - (var(--regionBorderWidth) - var(--cellBorderWidth)))
    &.left-outer
      border-left-width var(--outerBorderWidth)
    &.right-region
      border-right-width var(--regionBorderWidth)
      .selected-border
        padding-right calc(var(--selectedBorderWidth) - (var(--regionBorderWidth) - var(--cellBorderWidth)))
      .corner-selected-dot.right
        border-right-width calc(var(--selectedBorderWidth) - (var(--regionBorderWidth) - var(--cellBorderWidth)))
    &.right-outer
      border-right-width var(--outerBorderWidth)

    &.top-region
      border-top-width var(--regionBorderWidth)
      .selected-border
        padding-top calc(var(--selectedBorderWidth) - (var(--regionBorderWidth) - var(--cellBorderWidth)))
      .corner-selected-dot.top
        border-top-width calc(var(--selectedBorderWidth) - (var(--regionBorderWidth) - var(--cellBorderWidth)))
    &.top-outer
      border-top-width var(--outerBorderWidth)
    &.bottom-region
      border-bottom-width var(--regionBorderWidth)
      .selected-border
        padding-bottom calc(var(--selectedBorderWidth) - (var(--regionBorderWidth) - var(--cellBorderWidth)))
      .corner-selected-dot.bottom
        border-bottom-width calc(var(--selectedBorderWidth) - (var(--regionBorderWidth) - var(--cellBorderWidth)))
    &.bottom-outer
      border-bottom-width var(--outerBorderWidth)

    &.top-left-region-dot .corner-region-dot.top.left
    &.top-right-region-dot .corner-region-dot.top.right
    &.bottom-left-region-dot .corner-region-dot.bottom.left
    &.bottom-right-region-dot .corner-region-dot.bottom.right
    &.top-left-selected-dot .corner-selected-dot.top.left 
    &.top-right-selected-dot .corner-selected-dot.top.right
    &.bottom-left-selected-dot .corner-selected-dot.bottom.left
    &.bottom-right-selected-dot .corner-selected-dot.bottom.right
      display block
    .corner-region-dot
      width calc(var(--regionBorderWidth) - var(--cellBorderWidth))
      height calc(var(--regionBorderWidth) - var(--cellBorderWidth))
      background-color black
    .corner-selected-dot
      border 0 solid var(--selectedBorderColor)
      &.top
        border-top-width var(--selectedBorderWidth)
      &.left
        border-left-width var(--selectedBorderWidth)
      &.right
        border-right-width var(--selectedBorderWidth)
      &.bottom
        border-bottom-width var(--selectedBorderWidth)
      &.top.left
        border-bottom-right-radius var(--selectedCornerRadius)
      &.top.right
        border-bottom-left-radius var(--selectedCornerRadius)
      &.bottom.left
        border-top-right-radius var(--selectedCornerRadius)
      &.bottom.right
        border-top-left-radius var(--selectedCornerRadius)
    .corner-region-dot, .corner-selected-dot
      position absolute
      display none
      &.top
        top 0
      &.bottom
        bottom 0
      &.left
        left 0
      &.right
        right 0

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
    .selected-border
      flex 1
      display flex
      align-items center
      justify-content center
      border 0px solid var(--selectedBorderColor)
      padding var(--selectedBorderWidth)
      .digit
        font-size 0.8em
        color var(--digitColor)
        line-height 0

        &.given
          color black
      .center
        color var(--digitColor)
    &.top-selected.left-selected .selected-border
      border-top-left-radius var(--selectedCornerRadius)
    &.top-selected.right-selected .selected-border
      border-top-right-radius var(--selectedCornerRadius)
    &.bottom-selected.left-selected .selected-border
      border-bottom-left-radius var(--selectedCornerRadius)
    &.bottom-selected.right-selected .selected-border
      border-bottom-right-radius var(--selectedCornerRadius)
    &.left-selected
      .selected-border
        border-left-width var(--selectedBorderWidth)
        padding-left 0px
      &.left-region .selected-border
        border-left-width calc(var(--selectedBorderWidth) - (var(--regionBorderWidth) - var(--cellBorderWidth)))
    &.right-selected
      .selected-border
        border-right-width var(--selectedBorderWidth)
        padding-right 0px
      &.right-region .selected-border
        border-right-width calc(var(--selectedBorderWidth) - (var(--regionBorderWidth) - var(--cellBorderWidth)))
    &.top-selected
      .selected-border
        border-top-width var(--selectedBorderWidth)
        padding-top 0px
      &.top-region .selected-border
        border-top-width calc(var(--selectedBorderWidth) - (var(--regionBorderWidth) - var(--cellBorderWidth)))
    &.bottom-selected
      .selected-border
        border-bottom-width var(--selectedBorderWidth)
        padding-bottom 0px
      &.bottom-region .selected-border
        border-bottom-width calc(var(--selectedBorderWidth) - (var(--regionBorderWidth) - var(--cellBorderWidth)))

@media screen and (max-width: 900px)
  .cell-container .cell
    --regionBorderWidth 1px
    --outerBorderWidth 2px
</style>
