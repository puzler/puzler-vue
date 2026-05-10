<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import NumpadPanel from './NumpadPanel.vue'
import SolverNumpad from './SolverNumpad.vue'
import type { ShapeType } from '@/types/constraints'

const editor = useEditorStore()

// ── Line handlers ─────────────────────────────────────────────────────────

function onLineColorInput(event: Event) {
  editor.updateActiveLinePreset({ color: (event.target as HTMLInputElement).value })
}

function onLineWidthChange(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  editor.updateActiveLinePreset({ strokeWidth: Math.max(1, Math.min(30, raw)) })
}

function onLineOpacityChange(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  editor.updateActiveLinePreset({ opacity: Math.max(0.1, Math.min(1, raw / 100)) })
}

// ── Cell color handlers ───────────────────────────────────────────────────

function onCellColorInput(event: Event) {
  editor.updateActiveCellColorPreset({ color: (event.target as HTMLInputElement).value })
}

// ── Shape handlers ────────────────────────────────────────────────────────

function setShapeType(type: ShapeType) {
  editor.updateActiveShapePreset({ shapeType: type })
}

function onShapeFillInput(event: Event) {
  editor.updateActiveShapePreset({ fillColor: (event.target as HTMLInputElement).value })
}

function onShapeStrokeInput(event: Event) {
  editor.updateActiveShapePreset({ strokeColor: (event.target as HTMLInputElement).value })
}

function onShapeStrokeWidthChange(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  editor.updateActiveShapePreset({ strokeWidth: Math.max(0, Math.min(20, raw)) })
}

function onShapeSizeChange(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  editor.updateActiveShapePreset({ size: Math.max(0.1, Math.min(0.9, raw / 100)) })
}

// ── Text handlers ─────────────────────────────────────────────────────────

function onTextContentInput(event: Event) {
  editor.updateActiveTextPresetContent((event.target as HTMLInputElement).value)
}

function onTextColorInput(event: Event) {
  editor.updateActiveTextPresetStyle({ color: (event.target as HTMLInputElement).value })
}

function onTextFontSizeChange(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  editor.updateActiveTextPresetStyle({ fontSize: Math.max(8, Math.min(48, raw)) })
}
</script>

<template>
  <SolverNumpad v-if="editor.mode === 'solving'" class="w-full h-full" />

  <div v-else class="flex flex-col bg-white overflow-y-auto h-full">

    <!-- ── Given Digits ─────────────────────────────────────────────────── -->
    <div v-if="editor.activeTool === 'digit'" class="flex flex-col items-center justify-center flex-1 p-4">
      <div class="w-full max-w-[11rem] flex flex-col gap-3">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Digits
        </p>
        <NumpadPanel
          @digit="editor.placeDigitForSelection($event || null)"
          @delete="editor.placeDigitForSelection(null)"
        />
      </div>
    </div>

    <!-- ── Cosmetic Line ────────────────────────────────────────────────── -->
    <div v-else-if="editor.activeTool === 'cosmetic_line'" class="flex flex-col h-full">
      <div class="px-3 pt-3 pb-2 border-b border-gray-100">
        <div class="flex items-center justify-between mb-2">
          <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Lines
          </p>
          <button
            class="text-[11px] text-blue-500 hover:text-blue-700 font-medium transition-colors"
            @click="editor.addLinePreset()"
          >
            + Add
          </button>
        </div>
        <div class="flex flex-col gap-1">
          <button
            v-for="preset in editor.linePresets"
            :key="preset.id"
            class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors text-left"
            :class="preset.id === editor.activeLinePresetId
              ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200'
              : 'text-gray-700 hover:bg-gray-100'"
            @click="editor.setActiveLinePreset(preset.id)"
          >
            <svg width="32" height="14" viewBox="0 0 32 14" class="shrink-0">
              <path
                d="M 3 7 L 29 7"
                :stroke="preset.style.color"
                :stroke-width="Math.min(preset.style.strokeWidth, 8)"
                :opacity="preset.style.opacity"
                stroke-linecap="round"
                fill="none"
              />
            </svg>
            <span class="text-sm truncate">{{ preset.label }}</span>
          </button>
        </div>
      </div>

      <div v-if="editor.activeLinePreset" class="flex flex-col gap-3 px-3 py-3">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Color</label>
          <div class="flex items-center gap-2">
            <input
              type="color"
              :value="editor.activeLinePreset.style.color"
              class="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"
              @input="onLineColorInput"
            >
            <span class="text-xs text-gray-400 font-mono">{{ editor.activeLinePreset.style.color }}</span>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Width</label>
          <div class="flex items-center gap-2">
            <input
              type="number"
              :value="editor.activeLinePreset.style.strokeWidth"
              min="1"
              max="30"
              class="w-16 text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-blue-400 text-center"
              @change="onLineWidthChange"
            >
            <span class="text-xs text-gray-400">px</span>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Opacity</label>
          <div class="flex items-center gap-2">
            <input
              type="number"
              :value="Math.round(editor.activeLinePreset.style.opacity * 100)"
              min="10"
              max="100"
              class="w-16 text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-blue-400 text-center"
              @change="onLineOpacityChange"
            >
            <span class="text-xs text-gray-400">%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Cell Color ───────────────────────────────────────────────────── -->
    <div v-else-if="editor.activeTool === 'cell_color'" class="flex flex-col h-full">
      <div class="px-3 pt-3 pb-2 border-b border-gray-100">
        <div class="flex items-center justify-between mb-2">
          <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Colors
          </p>
          <button
            class="text-[11px] text-blue-500 hover:text-blue-700 font-medium transition-colors"
            @click="editor.addCellColorPreset()"
          >
            + Add
          </button>
        </div>
        <div class="flex flex-col gap-1">
          <button
            v-for="preset in editor.cellColorPresets"
            :key="preset.id"
            class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors text-left"
            :class="preset.id === editor.activeCellColorPresetId
              ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200'
              : 'text-gray-700 hover:bg-gray-100'"
            @click="editor.setActiveCellColorPreset(preset.id)"
          >
            <span
              class="w-5 h-5 rounded-sm border border-gray-300 shrink-0"
              :style="{ background: preset.color }"
            />
            <span class="text-sm truncate">{{ preset.label }}</span>
          </button>
        </div>
      </div>

      <div v-if="editor.activeCellColorPreset" class="flex flex-col gap-3 px-3 py-3">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Color</label>
          <div class="flex items-center gap-2">
            <input
              type="color"
              :value="editor.activeCellColorPreset.color"
              class="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"
              @input="onCellColorInput"
            >
            <span class="text-xs text-gray-400 font-mono">{{ editor.activeCellColorPreset.color }}</span>
          </div>
        </div>
        <p class="text-[11px] text-gray-400">
          Drag to paint · Click painted cell to erase
        </p>
      </div>
    </div>

    <!-- ── Shape ────────────────────────────────────────────────────────── -->
    <div v-else-if="editor.activeTool === 'shape'" class="flex flex-col h-full">
      <!-- Preset list -->
      <div class="px-3 pt-3 pb-2 border-b border-gray-100">
        <div class="flex items-center justify-between mb-2">
          <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Shapes
          </p>
          <button
            class="text-[11px] text-blue-500 hover:text-blue-700 font-medium transition-colors"
            @click="editor.addShapePreset()"
          >
            + Add
          </button>
        </div>
        <div class="flex flex-col gap-1">
          <button
            v-for="preset in editor.shapePresets"
            :key="preset.id"
            class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors text-left"
            :class="preset.id === editor.activeShapePresetId
              ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200'
              : 'text-gray-700 hover:bg-gray-100'"
            @click="editor.setActiveShapePreset(preset.id)"
          >
            <!-- Mini shape preview -->
            <svg width="20" height="20" viewBox="0 0 20 20" class="shrink-0">
              <circle
                v-if="preset.style.shapeType === 'circle'"
                cx="10" cy="10" r="7"
                :fill="preset.style.fillColor"
                :stroke="preset.style.strokeColor"
                stroke-width="1.5"
              />
              <rect
                v-else-if="preset.style.shapeType === 'square'"
                x="3" y="3" width="14" height="14"
                :fill="preset.style.fillColor"
                :stroke="preset.style.strokeColor"
                stroke-width="1.5"
              />
              <polygon
                v-else-if="preset.style.shapeType === 'diamond'"
                points="10,2 18,10 10,18 2,10"
                :fill="preset.style.fillColor"
                :stroke="preset.style.strokeColor"
                stroke-width="1.5"
              />
            </svg>
            <span class="text-sm truncate">{{ preset.label }}</span>
          </button>
        </div>
      </div>

      <!-- Style controls for active preset -->
      <div v-if="editor.activeShapePreset" class="flex flex-col gap-3 px-3 py-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-gray-500">Shape</label>
          <div class="flex gap-1.5">
            <button
              v-for="type in (['circle', 'square', 'diamond'] as ShapeType[])"
              :key="type"
              class="flex-1 py-1.5 rounded border text-xs transition-colors capitalize"
              :class="editor.activeShapePreset.style.shapeType === type
                ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
              @click="setShapeType(type)"
            >
              {{ type }}
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Fill</label>
          <div class="flex items-center gap-2">
            <input
              type="color"
              :value="editor.activeShapePreset.style.fillColor === 'none' ? '#ffffff' : editor.activeShapePreset.style.fillColor"
              class="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"
              @input="onShapeFillInput"
            >
            <button
              class="text-xs px-2 py-1 rounded border transition-colors"
              :class="editor.activeShapePreset.style.fillColor === 'none'
                ? 'border-blue-400 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'"
              @click="editor.updateActiveShapePreset({ fillColor: 'none' })"
            >
              None
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Stroke</label>
          <div class="flex items-center gap-2">
            <input
              type="color"
              :value="editor.activeShapePreset.style.strokeColor"
              class="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"
              @input="onShapeStrokeInput"
            >
            <span class="text-xs text-gray-400 font-mono">{{ editor.activeShapePreset.style.strokeColor }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Stroke width</label>
          <div class="flex items-center gap-2">
            <input
              type="number"
              :value="editor.activeShapePreset.style.strokeWidth"
              min="0"
              max="20"
              class="w-16 text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-blue-400 text-center"
              @change="onShapeStrokeWidthChange"
            >
            <span class="text-xs text-gray-400">px</span>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Size</label>
          <div class="flex items-center gap-2">
            <input
              type="number"
              :value="Math.round(editor.activeShapePreset.style.size * 100)"
              min="10"
              max="90"
              class="w-16 text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-blue-400 text-center"
              @change="onShapeSizeChange"
            >
            <span class="text-xs text-gray-400">%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Text ─────────────────────────────────────────────────────────── -->
    <div v-else-if="editor.activeTool === 'text'" class="flex flex-col h-full">
      <!-- Preset list -->
      <div class="px-3 pt-3 pb-2 border-b border-gray-100">
        <div class="flex items-center justify-between mb-2">
          <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Text styles
          </p>
          <button
            class="text-[11px] text-blue-500 hover:text-blue-700 font-medium transition-colors"
            @click="editor.addTextPreset()"
          >
            + Add
          </button>
        </div>
        <div class="flex flex-col gap-1">
          <button
            v-for="preset in editor.textPresets"
            :key="preset.id"
            class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors text-left"
            :class="preset.id === editor.activeTextPresetId
              ? 'bg-blue-50 ring-1 ring-inset ring-blue-200'
              : 'text-gray-700 hover:bg-gray-100'"
            @click="editor.setActiveTextPreset(preset.id)"
          >
            <!-- Text content preview -->
            <span
              class="w-8 text-center shrink-0 text-sm leading-none"
              :style="{
                color: preset.style.color,
                fontWeight: preset.style.bold ? 'bold' : 'normal',
                fontSize: `${Math.min(preset.style.fontSize, 16)}px`,
              }"
            >{{ preset.content || '?' }}</span>
            <span
              class="text-sm truncate"
              :class="preset.id === editor.activeTextPresetId ? 'text-blue-700 font-medium' : ''"
            >{{ preset.label }}</span>
          </button>
        </div>
      </div>

      <!-- Style controls for active preset -->
      <div v-if="editor.activeTextPreset" class="flex flex-col gap-3 px-3 py-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-gray-500">Content</label>
          <input
            :value="editor.activeTextPreset.content"
            maxlength="3"
            placeholder="?"
            class="w-full text-sm px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-blue-400 text-center font-mono"
            @input="onTextContentInput"
          >
          <p class="text-[11px] text-gray-400">
            Click a cell to place · click again to remove
          </p>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Color</label>
          <div class="flex items-center gap-2">
            <input
              type="color"
              :value="editor.activeTextPreset.style.color"
              class="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"
              @input="onTextColorInput"
            >
            <span class="text-xs text-gray-400 font-mono">{{ editor.activeTextPreset.style.color }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">Font size</label>
          <div class="flex items-center gap-2">
            <input
              type="number"
              :value="editor.activeTextPreset.style.fontSize"
              min="8"
              max="48"
              class="w-16 text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-blue-400 text-center"
              @change="onTextFontSizeChange"
            >
            <span class="text-xs text-gray-400">px</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="px-3 py-1 rounded border text-sm transition-colors font-bold"
            :class="editor.activeTextPreset.style.bold
              ? 'border-blue-400 bg-blue-50 text-blue-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
            @click="editor.updateActiveTextPresetStyle({ bold: !editor.activeTextPreset.style.bold })"
          >
            B
          </button>
          <span class="text-xs text-gray-500">Bold</span>
        </div>
      </div>
    </div>

  </div>
</template>
