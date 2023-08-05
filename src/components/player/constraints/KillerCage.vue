<script setup lang="ts">
import { computed } from 'vue'
import { Puzzle, type KillerCage } from '../../../types'
import { addressToCoordinates } from '@/utils/grid-helpers';
const props = defineProps<{
  cage: KillerCage
  puzzle: Puzzle
}>()

type Coordinates = {
  row: number
  col: number
}

const coordsToAddress = ({ row, col }: Coordinates) => `R${row}C${col}`

const cellCoordinates = props.cage.cells.map((address) => addressToCoordinates(address))

const topLeftCoords = cellCoordinates.reduce(
  (coords, check) => {
    if (check.row > coords.row) return coords
    if (check.row < coords.row) return check
    if (check.col > coords.col) return coords
    return check
  },
  { row: 100, col: 100 },
)

const startXY = computed(() => {
  return xyForLocation({
    coords: topLeftCoords,
    right: false,
    bottom: false,
  })
})

function coordsInCage(coords: Coordinates) {
  return props.cage.cells.includes(
    coordsToAddress(coords)
  )
}

type GridLocation = {
  coords: Coordinates,
  bottom: boolean,
  right: boolean
}

function xyForLocation(location: GridLocation) {
  let x = location.coords.col * 100 + 5
  let y = location.coords.row * 100 + 5

  if (location.right) x += 90
  if (location.bottom) y += 90

  if (location.coords.col === 0 && !location.right) {
    x += 2
  } else if (location.coords.col === props.puzzle.size - 1 && location.right) {
    x -= 2
  }

  if (location.coords.row === 0 && !location.bottom) {
    y += 2
  } else if (location.coords.row === props.puzzle.size - 1 && location.bottom) {
    y -= 2
  }

  return { x, y, forSvg: `${x} ${y}` }
}

const pathData = computed(() => {
  let currentLocation = {
    coords: { ...topLeftCoords },
    bottom: false,
    right: false,
  } as GridLocation

  let direction = 'right'

  const data = [`M${startXY.value.forSvg}`]
  if (props.cage.value) {
    data[0] = `M${startXY.value.x + ((115 / props.puzzle.size) * props.cage.value.length)} ${startXY.value.y}`
  }

  currentLocation.right = true
  data.push(`L${xyForLocation(currentLocation).forSvg}`)

  while (xyForLocation(currentLocation).forSvg !== startXY.value.forSvg) {
    switch (direction) {
      case 'right': {
        if (currentLocation.right) {
          const rightNeighborCoords = {
            ...currentLocation.coords,
            col: currentLocation.coords.col + 1
          }

          if (coordsInCage(rightNeighborCoords)) {
            currentLocation.coords.col += 1
            currentLocation.right = false
          } else {
            direction = 'down'
            currentLocation.bottom = true
          }
        } else {
          const upNeighborCoords = {
            ...currentLocation.coords,
            row: currentLocation.coords.row - 1,
          }

          if (coordsInCage(upNeighborCoords)) {
            currentLocation.coords.row -= 1
            currentLocation.bottom = true
            direction = 'up'
          } else {
            currentLocation.right = true
          }
        }
        break
      }
      case 'down': {
        if (currentLocation.bottom) {
          const downNeighborCoords = {
            ...currentLocation.coords,
            row: currentLocation.coords.row + 1,
          }

          if (coordsInCage(downNeighborCoords)) {
            currentLocation.coords.row += 1
            currentLocation.bottom = false
          } else {
            currentLocation.right = false
            direction = 'left'
          }
        } else {
          const rightNeighborCoords = {
            ...currentLocation.coords,
            col: currentLocation.coords.col + 1,
          }

          if (coordsInCage(rightNeighborCoords)) {
            currentLocation.coords.col += 1
            currentLocation.right = false
            direction = 'right'
          } else {
            currentLocation.bottom = true
          }
        }
        break
      }
      case 'up': {
        if (currentLocation.bottom) {
          const leftNeighborCoords = {
            ...currentLocation.coords,
            col: currentLocation.coords.col - 1
          }

          if (coordsInCage(leftNeighborCoords)) {
            currentLocation.coords.col -= 1
            currentLocation.right = true
            direction = 'left'
          } else {
            currentLocation.bottom = false
          }
        } else {
          const upNeighborCoords = {
            ...currentLocation.coords,
            row: currentLocation.coords.row - 1
          }

          if (coordsInCage(upNeighborCoords)) {
            currentLocation.coords.row -= 1
            currentLocation.bottom = true
          } else {
            currentLocation.right = true
            direction = 'right'
          }
        }
        break
      }
      case 'left': {
        if (currentLocation.right) {
          const downNeighborCoords = {
            ...currentLocation.coords,
            row: currentLocation.coords.row + 1,
          }

          if (coordsInCage(downNeighborCoords)) {
            currentLocation.coords.row += 1
            currentLocation.bottom = false
            direction = 'down'
          } else {
            currentLocation.right = false
          }
        } else {
          const leftNeighborCoords = {
            ...currentLocation.coords,
            col: currentLocation.coords.col - 1,
          }

          if (coordsInCage(leftNeighborCoords)) {
            currentLocation.coords.col -= 1
            currentLocation.right = true
          } else {
            currentLocation.bottom = false
            direction = 'up'
          }
        }
        break
      }
    }

    data.push(`L${xyForLocation(currentLocation).forSvg}`)
  }

  if (props.cage.value) {
    data[data.length - 1] = `L${startXY.value.x} ${startXY.value.y + (145 / props.puzzle.size)}`
  }
  
  return data
})
</script>

<template lang="pug">
path.cage-path(
  :d="pathData"
)
text.cage-value(
  v-if="cage.value"
  :x="startXY.x - 2"
  :y="startXY.y - 2"
) {{ cage.value }}
</template>

<style scoped lang="stylus">
.cage-path
  fill none
  stroke #000000
  stroke-width 1.5px
  stroke-dasharray 10px 5px
  shape-rendering geometric-precision
.cage-value
  font-size 0.2em
  text-anchor start
  dominant-baseline hanging
  fill #000000
</style>
