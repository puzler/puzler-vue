<script setup lang="ts">
import { computed } from 'vue'
import { Cell } from '@/types'
import useColorStore from '@/stores/color'
import useSettingStore from '@/stores/setting'

const props = defineProps<{
  cell: Cell
  error: boolean
}>()

const emit = defineEmits(['mousedown', 'mouseenter', 'double-click'])

let lastMouseDown = null as null|number
function onMouseDown(event: PointerEvent) {
  const clickTime = Date.now()
  if (!!lastMouseDown && clickTime - lastMouseDown <= 500) {
    emit('double-click', event, props.cell)
    lastMouseDown = null
  } else {
    emit('mousedown', event, props.cell)
    lastMouseDown = Date.now()
  }
}
const onMouseEnter = (event: PointerEvent) => emit('mouseenter', event, props.cell)

const settingStore = useSettingStore()
const colorStore = useColorStore()
const colors = computed(() => colorStore.palette.colors)

const corners = computed(() => {
  const { left, right, up, down } = props.cell.neighbors
  return {
    'top-left': [left, up, up?.neighbors?.left],
    'top-right': [right, up, up?.neighbors?.right],
    'bottom-left': [left, down, down?.neighbors?.left],
    'bottom-right': [right, down, down?.neighbors?.right],
  } as Record<string, Array<Cell|null>>
})

const cornerSelectedDots = computed(() => {
  if (!props.cell.selected) return []

  return Object.keys(corners.value).reduce(
    (list, cornerKey) => {
      const [cellA, cellB, corner] = corners.value[cornerKey]
      if (!cellA?.selected) return list
      if (!cellB?.selected) return list
      if (corner!.selected) return list

      return [
        ...list,
        {
          classes: cornerKey.split('-'),
          key: cornerKey,
        },
      ]
    },
    [] as Array<{ classes: Array<string>, key: string }>,
  )
})

const cellClasses = computed(() => {
  const classes = {
    error: props.error && settingStore.userSettings.highlightConflicts,
  } as Record<string, boolean>
  if (!props.cell.selected) return classes

  const {
    left,
    right,
    up,
    down,
  } = props.cell.neighbors

  return {
    ...classes,
    'left-selected': !left?.selected,
    'right-selected': !right?.selected,
    'top-selected': !up?.selected,
    'bottom-selected': !down?.selected
  }
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

const cellColorPaths = computed(() => {
  if (props.cell.cellColors.length === 0) return []
  if (props.cell.cellColors.length === 1) {
    const colorKey = props.cell.cellColors[0]
    return [{
      colorKey,
      data: [
        'M0 0',
        'L100 0',
        'L100 100',
        'L0 100',
        'L0 0',
      ],
      style: {
        fill: colors.value[colorKey],
      }
    }]
  }

  const portionPerColor = 400 / props.cell.cellColors.length
  const lineToValue = (raw: number) => {
    let val = (raw + 75) % 400
    if (val <= 100) return `L${val} 0`
    if (val <= 200) return `L100 ${val - 100}`
    if (val <= 300) return `L${100 - (val - 200)} 100`
    return `L0 ${100 - (val - 300)}`
  }

  return props.cell.cellColors.map((colorKey, i) => {
    const data = ['M50 50']
    const start = i * portionPerColor
    const end = start + portionPerColor

    let currentPoint = start
    while (currentPoint < end) {
      data.push(lineToValue(currentPoint))
      currentPoint += 100 - ((currentPoint + 75) % 100)
    }

    return {
      colorKey,
      data: [...data, lineToValue(end), 'Z'],
      style: {
        fill: colors.value[colorKey],
      },
    }
  })
})
</script>

<template lang="pug">
.cell-container
  svg.cell-colors(
    height="100%"
    width="100%"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
  )
    path(
      v-for="path in cellColorPaths"
      :key="path.colorKey"
      :d="path.data"
      :style="path.style"
      vector-effect="non-scaling-stroke"
    )
  .cell(
    :class="cellClasses"
    v-on:pointerdown.stop="onMouseDown"
  )
    .corner-selected-dot(
      v-for="{ classes, key } in cornerSelectedDots"
      :key="key"
      :class="classes"
    )

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
  --selectedBorderColor rgba(0 107 255 0.5)
  --digitColor #1D69E5
  --selectedCornerRadius 5px
  overflow hidden

  svg.cell-colors
    position absolute
    width 100%
    height 100%
    z-index var(--cell-color-z)
    circle
      fill none
      stroke-width 32
      transition stroke-dasharray 0.3s ease-in-out, stroke-dashoffset 0.3s ease-in-out

  .cell
    position absolute
    top 0
    bottom 0
    right 0
    left 0
    display flex
    z-index var(--grid-z)

    &.error .selected-border
      background-color rgba(255, 0, 0, 0.25)
      .digit
        color #5829ac
        &.given
          color #480000

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
    .corner-selected-dot
      position absolute
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
      z-index --grid-z
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
    &.right-selected
      .selected-border
        border-right-width var(--selectedBorderWidth)
        padding-right 0px
    &.top-selected
      .selected-border
        border-top-width var(--selectedBorderWidth)
        padding-top 0px
    &.bottom-selected
      .selected-border
        border-bottom-width var(--selectedBorderWidth)
        padding-bottom 0px
</style>
