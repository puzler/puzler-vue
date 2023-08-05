<script setup lang="ts">
import { computed } from 'vue'
import { Puzzle } from '@/types'
import { addressToCoordinates } from '@/utils/grid-helpers';

const props = defineProps<{
  address: string
  color: string
  puzzle: Puzzle
}>()

const backgroundColor = {
  alpha: 1,
  red: 255,
  green: 255,
  blue: 255,
}

const regex = {
  hexNoAlpha: /^#(?<red>[0-9a-fA-F]{2})(?<green>[0-9a-fA-F]{2})(?<blue>[0-9a-fA-F]{2})$/,
  hexWithAlpha: /^#(?<red>[0-9a-fA-F]{2})(?<green>[0-9a-fA-F]{2})(?<blue>[0-9a-fA-F]{2})(?<alpha>[0-9a-fA-F]{1,2})$/,
  shortHexNoAlpha: /^#(?<red>[0-9a-fA-F])(?<green>[0-9a-fA-F])(?<blue>[0-9a-fA-F])$/,
  shortHexWithAlpha: /^#(?<red>[0-9a-fA-F])(?<green>[0-9a-fA-F])(?<blue>[0-9a-fA-F])(?<alpha>[0-9a-fA-F])$/,
  rgb: /^rgb\((?<red>\d{1,3})[\s,]*(?<green>\d{1,3})[\s,]+(?<blue>\d{1,3})\)$/,
  rgba: /^rgba\((?<red>\d{1,3})[\s,]*(?<green>\d{1,3})[\s,]+(?<blue>\d{1,3})[\s,]+(?<alpha>1|0{0,1}\.\d+)\)$/,
}

type Color = {
  red: number
  green: number
  blue: number
}

type AlphaColor = {
  red: number
  green: number
  blue: number
  alpha: number
}

const rgbaValues = computed((): {
  red: number
  green: number
  blue: number
  alpha: number
} => {
  let match = props.color.match(regex.hexNoAlpha)
  if (match?.groups) {
    return {
      alpha: 1,
      ...Object.keys(match.groups).reduce(
        (colors, key) => ({
          ...colors,
          [key]: parseInt(match!.groups![key], 16)
        }),
        {} as Record<string, number>,
      ) as Color,
    }
  }

  match = props.color.match(regex.hexWithAlpha)
  if (match?.groups) {
    const groupValues = Object.keys(match.groups).reduce(
      (values, key) => {
        const value = match!.groups![key]

        return {
          ...values,
          [key]: parseInt(value.padStart(2, value || 'f'), 16),
        }
      },
      {} as Record<string, number>
    )

    return {
      ...groupValues as AlphaColor,
      alpha: groupValues.alpha / 255
    }
  }

  match = props.color.match(regex.shortHexNoAlpha)
  if (match?.groups) {
    return {
      alpha: 1,
      ...Object.keys(match!.groups!).reduce(
        (values, key) => ({
          ...values,
          [key]: parseInt(match!.groups![key].padStart(2, match!.groups![key]), 16),
        }),
        {} as Record<string, number>
      ) as Color
    }
  }

  match = props.color.match(regex.shortHexWithAlpha)
  if (match?.groups) {
    const groupValues = Object.keys(match!.groups!).reduce(
      (values, key) => ({
        ...values,
        [key]: parseInt(match!.groups![key].padEnd(2, match!.groups![key]), 16),
      }),
      {} as Record<string, number>
    )

    return {
      ...groupValues as AlphaColor,
      alpha: groupValues.alpha / 255,
    }
  }

  match = props.color.match(regex.rgb)
  if (match?.groups) {
    return {
      alpha: 1,
      ...Object.keys(match!.groups!).reduce(
        (values, key) => ({
          ...values,
          [key]: parseInt(match!.groups![key], 10),
        }),
        {} as Record<string, number>,
      ) as Color,
    }
  }

  match = props.color.match(regex.rgba)
  return {
    red: parseInt(match?.groups?.red || '255', 10),
    green: parseInt(match?.groups?.green || '255', 10),
    blue: parseInt(match?.groups?.blue || '255', 10),
    alpha: parseInt(match?.groups?.alpha || '1', 10),
  }
})

const convertToAlpha = (
  value: number,
  backgroundValue: number,
  originalAlpha: number,
  targetAlpha: number,
) =>  -1 * (((1 - targetAlpha) * backgroundValue * backgroundColor.alpha - value * originalAlpha) / targetAlpha)

const transparentColor = computed(() => {
  const { red, green, blue } = rgbaValues.value
  const minValue = Math.min(red, green, blue)
  const minAlpha = 1 - (minValue / 255)

  const color = {
    alpha: minAlpha,
    red: convertToAlpha(
      rgbaValues.value.red,
      backgroundColor.red,
      rgbaValues.value.alpha,
      minAlpha,
    ),
    green: convertToAlpha(
      rgbaValues.value.green,
      backgroundColor.green,
      rgbaValues.value.alpha,
      minAlpha,
    ),
    blue: convertToAlpha(
      rgbaValues.value.blue,
      backgroundColor.blue,
      rgbaValues.value.alpha,
      minAlpha,
    ),
  }

  return `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha})`
})

const coordinates = computed(() => {
  const { col, row } = addressToCoordinates(props.address)

  return {
    x: col * 100,
    y: row * 100,
  }
})
</script>

<template lang="pug">
rect.background-color(
  :x="coordinates.x"
  :y="coordinates.y"
  :fill="transparentColor"
)
</template>

<style scoped lang="stylus">
.background-color
  width 100px
  height 100px
  stroke none
</style>
