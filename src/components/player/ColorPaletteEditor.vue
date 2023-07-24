<script setup lang="ts">
import { ref } from 'vue'
import useColorStore from '@/stores/color';
import type { ColorPalette } from '@/types'
import { computed } from 'vue';

const props = defineProps<{
  activator: Element
  selectedPageIndex: number
}>()

const colorStore = useColorStore()
function paletteFromStore() {
  return {
    colors: { ...colorStore.palette.colors },
    pages: [
      ...colorStore.palette.pages.map(
        (page) => [...page],
      ),
    ],
  } as ColorPalette
}

const modalOpen = ref(false)
const originalPalette = ref(paletteFromStore())
const palette = colorStore.palette
const pageIndex = ref(props.selectedPageIndex)
const selectedKey = ref(palette.pages[pageIndex.value][1])

const usableKeys = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
  'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
  'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D',
  'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
]

const icons = {
  delete: 'mdi-delete',
  duplicate: 'mdi-content-duplicate',
}

const tooltips = {
  newPage: 'New Page',
  duplicate: 'Duplicate Page',
  delete: 'Delete Page',
}

const availableKeys = computed(() => {
  const usedKeys = Object.keys(palette.colors)
  return usableKeys.filter((k) => !usedKeys.includes(k))
})

function resetValues() {
  pageIndex.value = props.selectedPageIndex
  selectedKey.value = originalPalette.value.pages[pageIndex.value][1]

  const originalKeys = Object.keys(originalPalette.value.colors)
  originalKeys.forEach((key) => colorStore.palette.colors[key] = originalPalette.value.colors[key])
  Object.keys(colorStore.palette.colors).filter(
    (key) => !originalKeys.includes(key),
  ).forEach(
    (key) => delete colorStore.palette.colors[key],
  )

  const originalPageCount = originalPalette.value.pages.length
  if (originalPageCount < colorStore.palette.pages.length) {
    colorStore.palette.pages.splice(originalPageCount, colorStore.palette.pages.length - originalPageCount) 
  }
  while (originalPageCount > colorStore.palette.pages.length) {
    colorStore.palette.pages.push([])
  }

  originalPalette.value.pages.forEach((page, i) => {
    page.forEach((key, j) => {
      colorStore.palette.pages[i][j] = key
    })
  })

  modalOpen.value = false
}

function savePalette() {
  colorStore.savePalette()
  originalPalette.value = paletteFromStore()
  modalOpen.value = false
}

function movePageLeft(index: number) {
  const pageToMove = palette.pages[index]
  const pageToReplace = palette.pages[index - 1]
  if (pageToMove === undefined || pageToReplace === undefined) return

  const temp = [...pageToMove]
  palette.pages[index] = [...pageToReplace]
  palette.pages[index - 1] = temp

  if (pageIndex.value === index) {
    pageIndex.value -= 1
  }
}

function movePageRight(index: number) {
  const pageToMove = palette.pages[index]
  const pageToReplace = palette.pages[index + 1]
  if (pageToMove === undefined || pageToReplace === undefined) return

  const temp = [...pageToMove]
  palette.pages[index] = [...pageToReplace]
  palette.pages[index + 1] = temp

  if (pageIndex.value === index) {
    pageIndex.value += 1
  }
}

function deletePage(index: number) {
  if (palette.pages.length === 1) return
  if (palette.pages[index] === undefined) return

  palette.pages[index].forEach(
    (k) => delete palette.colors[k]
  )

  palette.pages.splice(index, 1)

  if (pageIndex.value === index && index > 0) {
    pageIndex.value -= 1
  }
}

function newPage() {
  if (palette.pages.length >= 5) return

  const newKeys = availableKeys.value.slice(0, 9)
  newKeys.forEach((k) => palette.colors[k] = 'rgba(255, 255, 255, 255)')
  palette.pages.push(newKeys)
  pageIndex.value = palette.pages.length - 1
  selectedKey.value = newKeys[1]
}

function duplicatePage(index: number) {
  if (palette.pages.length >= 5) return

  const pageToDuplicate = palette.pages[index]
  if (pageToDuplicate === undefined) return

  const newKeys = availableKeys.value.slice(0, 9)
  newKeys.forEach((k, i) => palette.colors[k] = palette.colors[pageToDuplicate[i]])
  palette.pages.splice(index, 0, newKeys)
  pageIndex.value += 1
}

function selectPage(index: number) {
  pageIndex.value = index
  selectedKey.value = palette.pages[index][1]
}

const padBtns = computed(() => {
  const rows = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [0, null, null]
  ] as Array<Array<number|string|null>>

  if (palette.pages.length < 5) {
    rows[3][1] = 'duplicate'
  }

  if (palette.pages.length > 1) {
    rows[3][2] = 'delete'
  }

  return rows.reduce(
    (btns, row, rowNum) => {
      return row.reduce(
        (innerBtns, btn, colNum) => {
          return [
            ...innerBtns,
            {
              btn,
              row: rowNum + 1,
              col: colNum + 1,
            },
          ]
        },
        btns,
      )
    },
    [] as Array<{ btn: string|number|null, row: number, col: number }>,
  )
})

function handlePadClick(btn: string|number) {
  if (typeof btn === 'string') {
    switch (btn) {
      case 'delete':
        return deletePage(pageIndex.value)
      case 'duplicate':
        return duplicatePage(pageIndex.value)
    }
  } else {
    const newKey = palette.pages[pageIndex.value][btn]
    selectedKey.value = newKey
  }
}

const pageBtnStyling = computed(() => {
  const numOfBtns = Math.min(palette.pages.length + 1, 5)
  const gap = 5

  return {
    '--btn-size': `calc((20cqw / ${numOfBtns}) - ${(gap * (numOfBtns - 1)) / numOfBtns}px)`,
    gap: `${gap}px`,
  }
})
</script>

<template lang="pug">
v-dialog(
  :activator="activator"
  v-model="modalOpen"
  v-on:update:model-value="(opening) => { if (!opening) { resetValues() } }"
)
  .modal-container
    .palette-form
      .palette
        .colors
          .pad-cell(
            v-for="{ btn, row, col } in padBtns"
            :key="`editor-pad-${row}-${col}`"
            :style="{ gridRow: row, gridColumn: col }"
          )
            .empty-cell(v-if="btn === null")
            v-tooltip(
              v-else-if="typeof btn === 'string'"
              :model-value="false"
              location="top center"
              :offset="2"
              origin="auto"
              no-click-animation
            )
              template(v-slot:activator="{ props }")
                v-btn.pad-btn.action(
                  v-on:click="handlePadClick(btn)"
                  v-bind="props"
                )
                  v-icon(:icon="icons[btn]")
              .tooltip {{ tooltips[btn] }}
            v-btn.pad-btn(
              v-else
              :active="selectedKey === palette.pages[pageIndex][btn]"
              v-on:click="handlePadClick(btn)"
            )
              .color-swatch(
                :style="{ backgroundColor: palette.colors[palette.pages[pageIndex][btn]] }"
              )
        .pages(
          :style="pageBtnStyling"
        )
          v-btn(
            v-for="page, i in palette.pages"
            :active="pageIndex === i"
            v-on:click="selectPage(i)"
            :icon="`mdi-numeric-${i + 1}`"
          )
          v-tooltip(
            :model-value="false"
            offset=3
            location="top center"
            origin="auto"
            no-click-animation
          )
            template(v-slot:activator="{ props }")
              v-btn(
                v-if="palette.pages.length < 5"
                v-on:click="newPage"
                color="green"
                icon="mdi-plus"
                v-bind="props"
              )
            .tooltip {{ tooltips.newPage }}
      .color-picker
        v-color-picker(
          v-model="palette.colors[selectedKey]"
        )
    .actions
      v-btn(
        v-on:click="resetValues"
      ) Cancel
      v-btn(
        v-on:click="savePalette"
        color="blue-grey"
      ) Save
</template>

<style scoped lang="stylus">
.modal-container
  background-color var(--color-background-soft)
  border-radius 2%
  padding 20px
  display flex
  flex-direction column
  gap 20px
  width fit-content
  margin 0 auto
  .palette-form
    display flex
    gap 20px
    .palette
      display flex
      flex-direction column
      justify-content center
      gap 10px
      flex 1
      .colors
        display grid
        gap 3px
        .pad-cell
          .pad-btn
            padding 0
            height calc((33cqw / 5) - 2px)
            width calc((33cqw / 5) - 2px)
            max-height 75px
            max-width 75px
            min-height 45.25px
            min-width 45.25px
            .color-swatch
              --size calc((27cqw / 5) - 2px)
              border-radius 5px
              width var(--size)
              height var(--size)
              max-height 60px
              max-width 60px
              min-height 40px
              min-width 40px
              border 0.5px solid #c1c1c1
              z-index 1
            &.action
              font-size calc(10cqw / 5)
      .pages
        display flex
        gap 10px
        justify-content center
        button
          height unset
          width unset
          padding 5px
  .actions
    display flex
    justify-content space-between

@media screen and (max-width: 900px)
  .modal-container
    .palette-form
      flex-direction column-reverse
      .palette
        flex-direction row-reverse
        .colors
          width fit-content
          padding-right 45px
        .pages
          flex-direction column
    
</style>