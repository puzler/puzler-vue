<script setup lang="ts">
// Renders a slow thermometer as an outline only (transparent interior): a mask
// subtracts an inset silhouette from the full bulb+line silhouette, so only the
// border remains and the grid shows through the body.
withDefaults(
  defineProps<{
    maskId: string
    color: string
    bulbRadius: number
    strokeWidth: number
    edgePaths: string[]
    box: { x: number; y: number; width: number; height: number }
    bulb?: { x: number; y: number } | null
    fillOpacity?: number
    outlineWidth?: number
  }>(),
  { bulb: null, fillOpacity: 1, outlineWidth: 3 },
)
</script>

<template>
  <g>
    <mask
      :id="maskId"
      maskUnits="userSpaceOnUse"
    >
      <circle
        v-if="bulb"
        :cx="bulb.x"
        :cy="bulb.y"
        :r="bulbRadius"
        fill="white"
      />
      <path
        v-for="(d, idx) in edgePaths"
        :key="`o${idx}`"
        :d="d"
        fill="none"
        stroke="white"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle
        v-if="bulb"
        :cx="bulb.x"
        :cy="bulb.y"
        :r="bulbRadius - outlineWidth"
        fill="black"
      />
      <path
        v-for="(d, idx) in edgePaths"
        :key="`i${idx}`"
        :d="d"
        fill="none"
        stroke="black"
        :stroke-width="strokeWidth - outlineWidth * 2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </mask>
    <rect
      :x="box.x"
      :y="box.y"
      :width="box.width"
      :height="box.height"
      :fill="color"
      :fill-opacity="fillOpacity"
      :mask="`url(#${maskId})`"
      pointer-events="none"
    />
  </g>
</template>
