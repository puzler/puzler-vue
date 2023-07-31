<script setup lang="ts">
import { computed } from 'vue'
import type { KillerCage } from '../../../types'
const props = defineProps<{
  cage: KillerCage
  puzzleSize: number
}>()

type Coordinates = {
  row: number
  col: number
}

const coordsToAddress = ({ row, col }: Coordinates) => `R${row + 1}C${col + 1}`

const cellCoordinates = props.cage.cells.map((address) => {
  const match = address.match(/^R(\d+)C(\d+)$/)
  if (!match) return []

  return { row: parseInt(match[1], 10) - 1, col: parseInt(match[2], 10) - 1 }
}) as Array<Coordinates>

const topLeftCoords = cellCoordinates.reduce(
  (coords, check) => {
    if (check.row > coords.row) return coords
    if (check.row < coords.row) return check
    if (check.col > coords.col) return coords
    return check
  },
  cellCoordinates[0],
)

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
  } else if (location.coords.col === props.puzzleSize - 1 && location.right) {
    x -= 2
  }

  if (location.coords.row === 0 && !location.bottom) {
    y += 2
  } else if (location.coords.row === props.puzzleSize - 1 && location.bottom) {
    y -= 2
  }

  return `${x} ${y}`
}

const pathData = computed(() => {
  console.log('calculating for cage', props.cage.cells)
  let currentLocation = {
    coords: { ...topLeftCoords },
    bottom: false,
    right: false,
  } as GridLocation
  console.log(currentLocation)

  const startXY = xyForLocation(currentLocation)
  let direction = 'right'

  const data = [`M${startXY}`]

  currentLocation.right = true
  data.push(`L${xyForLocation(currentLocation)}`)

  while (xyForLocation(currentLocation) !== startXY) {
    console.log(currentLocation)
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

    data.push(`L${xyForLocation(currentLocation)}`)
  }
  
  return data
})
</script>

<template lang="pug">
path.cage-path(
  :d="pathData"
)
rect.cage-value-back(
  v-if="cage.value"
  :x="topLeftCoords.col * 100 + 2"
  :y="topLeftCoords.row * 100 + 2"
  :width="cage.value.length * 10"
  height="15"
)
text.cage-value(
  v-if="cage.value"
  :x="topLeftCoords.col * 100 + 2"
  :y="topLeftCoords.row * 100 + 2"
) {{ cage.value }}
</template>

<style scoped lang="stylus">
.cage-path
  fill none
  stroke #000000
  stroke-width 1.5
  stroke-dasharray 10 5
  vector-effect non-scaling-stroke
.cage-value
  font-size 0.15em
  font-weight 500
  text-anchor start
  dominant-baseline hanging
  stroke #ffffff
  stroke-width 0.5
  fill #000000
.cage-value-back
  fill rgba(255, 255, 255, 0.9)
</style>
