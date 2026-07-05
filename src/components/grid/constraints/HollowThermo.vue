<script setup lang="ts">
import { computed } from 'vue'

// Renders a slow thermometer as an outline only (transparent interior): masks
// subtract an inset silhouette from the full bulb+line silhouette, so only the
// border remains and the grid shows through the body. The tube and bulb render
// as separate masked rects so a per-instance bulbColor can differ from the
// tube color; with one color the result is pixel-identical to a single mask.
const props = withDefaults(
  defineProps<{
    maskId: string
    color: string
    // Bulb ring color; defaults to the tube color.
    bulbColor?: string | null
    bulbRadius: number
    strokeWidth: number
    edgePaths: string[]
    box: { x: number; y: number; width: number; height: number }
    bulb?: { x: number; y: number } | null
    fillOpacity?: number
    outlineWidth?: number
  }>(),
  { bulb: null, bulbColor: null, fillOpacity: 1, outlineWidth: 3 },
)

const effectiveBulbColor = computed(() => props.bulbColor ?? props.color)
</script>

<template>
  <g>
    <!-- Tube outline: line silhouette minus the inset line and the bulb
         interior (so the tube opens into the hollow bulb). -->
    <mask
      :id="`${maskId}-line`"
      maskUnits="userSpaceOnUse"
    >
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
      :mask="`url(#${maskId}-line)`"
      pointer-events="none"
    />

    <!-- Bulb ring, drawn on top: bulb silhouette minus its inset circle, with
         the inset tube kept subtracted so the ring stays open at the join. -->
    <template v-if="bulb">
      <mask
        :id="`${maskId}-bulb`"
        maskUnits="userSpaceOnUse"
      >
        <circle
          :cx="bulb.x"
          :cy="bulb.y"
          :r="bulbRadius"
          fill="white"
        />
        <circle
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
        :fill="effectiveBulbColor"
        :fill-opacity="fillOpacity"
        :mask="`url(#${maskId}-bulb)`"
        pointer-events="none"
      />
    </template>
  </g>
</template>
