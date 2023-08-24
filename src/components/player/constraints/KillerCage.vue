<script setup lang="ts">
import { computed } from 'vue'
import type { Address, Cage, Color } from '@/graphql/generated/types'

const props = defineProps<{
  cage: Cage
}>()

function colorToRGBA({ red, green, blue, opacity }: Color) {
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`
}

const topLeftCoords = computed(
  () => props.cage.cells.reduce(
    (coords, check) => {
      if (check.row > coords.row) return coords
      if (check.row < coords.row) return check
      if (check.column > coords.column) return coords
      return check
    }
  ),
)

const startXY = computed(() => {
  return xyForLocation({
    coords: topLeftCoords.value,
    right: false,
    bottom: false,
  })
})

function coordsInCage(coords: Address) {
  return props.cage.cells.some(
    ({ row, column }) => coords.row === row && coords.column === column
  )
}

type GridLocation = {
  coords: Address,
  bottom: boolean,
  right: boolean
}

function xyForLocation(location: GridLocation) {
  let x = location.coords.column * 100 - 45
  let y = location.coords.row * 100 - 45

  if (location.right) x += 90
  if (location.bottom) y += 90

  return { x, y, forSvg: `${x} ${y}` }
}

const pathData = computed(() => {
  let currentLocation = {
    coords: { ...topLeftCoords.value },
    bottom: false,
    right: false,
  } as GridLocation

  let direction = 'right'

  const data = [`M${startXY.value.forSvg}`]
  if (props.cage.text) {
    data[0] = `M${startXY.value.x + (12 * props.cage.text.length)} ${startXY.value.y}`
  }

  currentLocation.right = true
  data.push(`L${xyForLocation(currentLocation).forSvg}`)

  while (startXY.value.forSvg !== xyForLocation(currentLocation).forSvg) {
    switch (direction) {
      case 'right': {
        if (currentLocation.right) {
          const rightNeighborCoords = {
            ...currentLocation.coords,
            column: currentLocation.coords.column + 1
          }

          if (coordsInCage(rightNeighborCoords)) {
            currentLocation.coords.column += 1
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
            column: currentLocation.coords.column + 1,
          }

          if (coordsInCage(rightNeighborCoords)) {
            currentLocation.coords.column += 1
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
            column: currentLocation.coords.column - 1
          }

          if (coordsInCage(leftNeighborCoords)) {
            currentLocation.coords.column -= 1
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
            column: currentLocation.coords.column - 1,
          }

          if (coordsInCage(leftNeighborCoords)) {
            currentLocation.coords.column -= 1
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

  if (props.cage.text) {
    data[data.length - 1] = `L${startXY.value.x} ${startXY.value.y + 16}`
  }
  
  return data
})
</script>

<template lang="pug">
path.cage-path(
  :d="pathData"
  :stroke="colorToRGBA(cage.cageColor)"
)
text.cage-value(
  v-if="cage.text"
  :fill="colorToRGBA(cage.textColor)"
  :x="startXY.x - 2"
  :y="startXY.y - 2"
) {{ cage.text }}
</template>

<style scoped lang="stylus">
.cage-path
  fill none
  stroke-width 1.5px
  stroke-dasharray 10px 5px
  shape-rendering geometric-precision
.cage-value
  font-size 0.2em
  text-anchor start
  dominant-baseline hanging
</style>
