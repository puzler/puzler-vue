<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { useEditorStore } from '@/stores/editor'
import { CELL_SIZE, PADDING, pointerToCell, pointerToSvgPoint, cellKey, keyToRowCol } from '@/composables/useGrid'
import { nearestPenNode, penClickTarget, nodesAdjacent, straightPath } from '@/utils/pen'
import type { PenTarget } from '@/types/grid'
import { computeSelectAllSame } from '@/composables/useSelectAllSame'
import { CONSTRAINT_LINE_TYPES, UNBRANCHABLE_LINE_TYPES, THERMO_TYPES, BORDER_CONNECTOR_TYPES, OUTER_CLUE_TYPES, SINGLE_CELL_TYPES, OUTER_RUN_STEP, borderKey, cornerKey, outerKey, cosmeticPos, validLittleKillerDirections, littleKillerStep, outerClueDirections } from '@/types/constraints'
import { useOuterMargins } from '@/composables/useOuterMargins'
import type { CosmeticLineData, ConstraintLineData, ThermometerData, CosmeticPos, ShapeData, TextData, BorderConnectorType, ArrowData, KillerCageData, ExtraRegionData, CloneData, OuterClueType, LittleKillerDirection, OuterClueRunDirection } from '@/types/constraints'

const props = defineProps<{
  svgRef: SVGSVGElement | null
  selection: Set<string>
}>()

const emit = defineEmits<{
  'update:selection': [sel: Set<string>]
}>()

const grid = useGridStore()
const editor = useEditorStore()

const isDragging = ref(false)
const dragAdditive = ref(false)

const DRAWING_TOOLS = new Set(['cosmetic_line', ...THERMO_TYPES, 'arrow', ...CONSTRAINT_LINE_TYPES])
const BRUSH_TOOLS = new Set(['cell_color'])

const isDrawing = computed(() => DRAWING_TOOLS.has(editor.activeTool))
const isBrushing = computed(() => BRUSH_TOOLS.has(editor.activeTool))
const isSingleCellTool = computed(() => SINGLE_CELL_TYPES.has(editor.activeTool))
const isDotTool = computed(() => BORDER_CONNECTOR_TYPES.has(editor.activeTool))
const isOuterTool = computed(() => OUTER_CLUE_TYPES.has(editor.activeTool))
const margins = useOuterMargins()

const DRAW_BUFFER = CELL_SIZE * 0.15

// Brush drag state (local — committed as a single undo step on pointerup)
const brushMode = ref<'paint' | 'erase' | null>(null)
const brushCells = ref<Set<string>>(new Set())

// Pen (line tool) gesture, latched at pointerdown so a mid-drag Shift or mode
// change can't reroute the stroke into rubber-band selection. The pending
// stroke itself lives in the store (PenLayer previews it); the layer keeps only
// the latch and the down-point (for click resolution on release).
const penGesture = ref(false)
let penDownPt: { x: number; y: number } | null = null

// Border-tool drag: draw-vs-erase latches from whether the first edge hit
// already carries a border. Drawn edges preview via the store's pending list;
// erased edges accumulate locally and apply on release.
const borderErase = ref(false)
const borderEraseEdges = ref<Set<string>>(new Set())

// House-tool gesture: a tap (no drag) on an existing house removes it; any
// drag paints a new house, freely overlapping others.
const houseDownCell = ref<string | null>(null)
const houseDragged = ref(false)

const cursor = computed(() => {
  // Solving mode ignores the setting tool entirely — interaction is plain
  // cell selection so the solver can place digits and pencil marks; the pen
  // tool is the one exception.
  if (editor.mode === 'solving') return editor.inputMode === 'line' ? 'crosshair' : 'default'
  if (isDrawing.value || isBrushing.value || isSingleCellTool.value || isDotTool.value) return 'crosshair'
  if (isCageTool.value || editor.activeTool === 'extra_regions' || editor.activeTool === 'clone') return 'crosshair'
  if (editor.activeTool === 'cosmetic_border' || editor.activeTool === 'house') return 'crosshair'
  if (isOuterTool.value) return 'crosshair'
  if (editor.activeTool === 'shape') return 'crosshair'
  if (editor.activeTool === 'text') return 'text'
  return 'default'
})

// Void cells (no region on a regioned grid) are dead space for every gesture
// EXCEPT the grid tool, where selecting them is how a setter un-voids them by
// painting a label.
function voidBlocked(key: string): boolean {
  return editor.activeTool !== 'grid' && grid.isVoid(key)
}

function hitCell(event: MouseEvent): string | null {
  if (!props.svgRef) return null
  const pos = pointerToCell(event, props.svgRef, grid.rows, grid.cols)
  if (!pos) return null
  const key = cellKey(pos.row, pos.col)
  return voidBlocked(key) ? null : key
}

function hitCellBuffered(event: PointerEvent): string | null {
  if (!props.svgRef) return null
  const pt = pointerToSvgPoint(event, props.svgRef)
  if (!pt) return null

  const rawCol = Math.floor((pt.x - PADDING) / CELL_SIZE)
  const rawRow = Math.floor((pt.y - PADDING) / CELL_SIZE)
  if (rawRow < 0 || rawRow >= grid.rows || rawCol < 0 || rawCol >= grid.cols) return null

  const cellX = PADDING + rawCol * CELL_SIZE
  const cellY = PADDING + rawRow * CELL_SIZE

  if (
    pt.x < cellX + DRAW_BUFFER ||
    pt.x > cellX + CELL_SIZE - DRAW_BUFFER ||
    pt.y < cellY + DRAW_BUFFER ||
    pt.y > cellY + CELL_SIZE - DRAW_BUFFER
  ) {
    return null
  }

  const key = cellKey(rawRow, rawCol)
  return voidBlocked(key) ? null : key
}

function findLineAtCell(key: string): string | null {
  for (let i = editor.cosmeticInstances.length - 1; i >= 0; i--) {
    const inst = editor.cosmeticInstances[i]
    if (inst.type !== 'cosmetic_line') continue
    const data = inst.data as CosmeticLineData
    if (data.presetId !== editor.activeLinePresetId) continue
    if (data.cells.includes(key)) return inst.id
  }
  return null
}

function findThermoAtCell(key: string): string | null {
  for (let i = editor.cosmeticInstances.length - 1; i >= 0; i--) {
    const inst = editor.cosmeticInstances[i]
    if (!THERMO_TYPES.has(inst.type)) continue
    const data = inst.data as ThermometerData
    if (data.root === key || data.edges.some(e => e.from === key || e.to === key)) return inst.id
  }
  return null
}

function findCloneAt(key: string): { id: string; copyIndex: number | null } | null {
  const { row, col } = keyToRowCol(key)
  for (let i = editor.cosmeticInstances.length - 1; i >= 0; i--) {
    const inst = editor.cosmeticInstances[i]
    if (inst.type !== 'clone') continue
    const data = inst.data as CloneData
    if (data.cells.includes(key)) return { id: inst.id, copyIndex: null }
    for (let c = data.copies.length - 1; c >= 0; c--) {
      const offset = data.copies[c]
      const sourceKey = cellKey(row - offset.dRow, col - offset.dCol)
      if (data.cells.includes(sourceKey)) return { id: inst.id, copyIndex: c }
    }
  }
  return null
}

// Active clone-copy drag: anchor cell plus the offset the grabbed group started at
const cloneDrag = ref<{
  id: string
  copyIndex: number | null
  anchorRow: number
  anchorCol: number
  baseDRow: number
  baseDCol: number
  moved: boolean
} | null>(null)

function findExtraRegionAtCell(key: string): string | null {
  for (let i = editor.cosmeticInstances.length - 1; i >= 0; i--) {
    const inst = editor.cosmeticInstances[i]
    if (inst.type !== 'extra_regions') continue
    if ((inst.data as ExtraRegionData).cells.includes(key)) return inst.id
  }
  return null
}

// Constraint cages and cosmetic cages share the brush/select flow; each tool
// only sees cages of its own type
const CAGE_TOOLS = new Set(['killer_cage', 'cosmetic_cage'])
const isCageTool = computed(() => CAGE_TOOLS.has(editor.activeTool))

function findCageAtCell(key: string, type: string): string | null {
  for (let i = editor.cosmeticInstances.length - 1; i >= 0; i--) {
    const inst = editor.cosmeticInstances[i]
    if (inst.type !== type) continue
    if ((inst.data as KillerCageData).cells.includes(key)) return inst.id
  }
  return null
}

function findArrowAt(key: string): { id: string; kind: 'bulb' | 'arrow' } | null {
  for (let i = editor.cosmeticInstances.length - 1; i >= 0; i--) {
    const inst = editor.cosmeticInstances[i]
    if (inst.type !== 'arrow') continue
    const data = inst.data as ArrowData
    if (data.bulbCells.includes(key)) return { id: inst.id, kind: 'bulb' }
    if (data.arrows.some(p => p.cells.slice(1).includes(key))) return { id: inst.id, kind: 'arrow' }
  }
  return null
}

function findConstraintLineAtCell(key: string): string | null {
  const type = editor.activeTool
  for (let i = editor.cosmeticInstances.length - 1; i >= 0; i--) {
    const inst = editor.cosmeticInstances[i]
    if (inst.type !== type) continue
    if ((inst.data as ConstraintLineData).cells.includes(key)) return inst.id
  }
  return null
}

// Snap a pointer to the nearest half-cell point (cell centres, edges and
// corners) for placing a text/shape. Off-grid points are allowed anywhere the
// outer margins have revealed space: at least one ring when "show external
// space" is on, further wherever existing cosmetics have grown the margins.
function snapPos(event: PointerEvent): CosmeticPos | null {
  if (!props.svgRef) return null
  const pt = pointerToSvgPoint(event, props.svgRef)
  if (!pt) return null
  const x = Math.round(((pt.x - PADDING) / CELL_SIZE) * 2) / 2
  const y = Math.round(((pt.y - PADDING) / CELL_SIZE) * 2) / 2
  const m = margins.value
  const minX = -Math.ceil(m.left / CELL_SIZE)
  const maxX = grid.cols + Math.ceil(m.right / CELL_SIZE)
  const minY = -Math.ceil(m.top / CELL_SIZE)
  const maxY = grid.rows + Math.ceil(m.bottom / CELL_SIZE)
  if (x < minX || x > maxX || y < minY || y > maxY) return null
  return { x, y }
}

// Topmost text/shape under the pointer (back-to-front), for Select mode.
function findCosmeticAt(event: PointerEvent, type: 'text' | 'shape'): string | null {
  if (!props.svgRef) return null
  const pt = pointerToSvgPoint(event, props.svgRef)
  if (!pt) return null
  const insts = editor.cosmeticInstances.filter(i => i.type === type)
  for (let i = insts.length - 1; i >= 0; i--) {
    const inst = insts[i]
    const data = inst.data as ShapeData & TextData
    const p = cosmeticPos(data)
    const cx = PADDING + p.x * CELL_SIZE
    const cy = PADDING + p.y * CELL_SIZE
    let hx: number, hy: number
    if (type === 'shape') {
      const style = editor.shapePresets.find(s => s.id === data.presetId)?.style
      hx = Math.max((CELL_SIZE / 2) * (style?.width ?? 0.5), CELL_SIZE * 0.18)
      hy = Math.max((CELL_SIZE / 2) * (style?.height ?? 0.5), CELL_SIZE * 0.18)
    } else {
      const fs = editor.textPresets.find(t => t.id === data.presetId)?.style.fontSize ?? 20
      hx = Math.max(fs, (data.content?.length || 1) * fs * 0.35)
      hy = fs * 0.7
    }
    if (Math.abs(pt.x - cx) <= hx && Math.abs(pt.y - cy) <= hy) return inst.id
  }
  return null
}

function hasCellColor(key: string): boolean {
  return editor.cosmeticCellColors[key] !== undefined
}

// Max distance from an interior border (fraction of cell size) for a click to hit it
const BORDER_THRESHOLD = 0.25

function hitBorder(event: PointerEvent): string | null {
  if (!props.svgRef) return null
  const pt = pointerToSvgPoint(event, props.svgRef)
  if (!pt) return null

  const col = Math.floor((pt.x - PADDING) / CELL_SIZE)
  const row = Math.floor((pt.y - PADDING) / CELL_SIZE)
  if (row < 0 || row >= grid.rows || col < 0 || col >= grid.cols) return null

  const fx = (pt.x - PADDING) / CELL_SIZE - col
  const fy = (pt.y - PADDING) / CELL_SIZE - row

  // Distance to each interior border; outer grid edges have no neighbor
  const candidates: Array<{ dist: number; row: number; col: number }> = []
  if (col > 0) candidates.push({ dist: fx, row, col: col - 1 })
  if (col < grid.cols - 1) candidates.push({ dist: 1 - fx, row, col: col + 1 })
  if (row > 0) candidates.push({ dist: fy, row: row - 1, col })
  if (row < grid.rows - 1) candidates.push({ dist: 1 - fy, row: row + 1, col })

  candidates.sort((a, b) => a.dist - b.dist)
  const best = candidates[0]
  if (!best || best.dist > BORDER_THRESHOLD) return null
  return borderKey(cellKey(row, col), cellKey(best.row, best.col))
}

// Hit test for outer clue positions: the ring just outside the grid (edge
// cells for every type, corners for little killers) plus in-grid VOID cells —
// dead space doubles as "outside" for the live runs it borders. Placement
// needs at least one readable run, so dead voids and pierced ring cells
// (adjacent cell void) reject.
function outerCellIsLive(r: number, c: number): boolean {
  return !grid.isVoid(cellKey(r, c))
}

function hitOuterCell(event: PointerEvent): { row: number; col: number } | null {
  if (!props.svgRef) return null
  const pt = pointerToSvgPoint(event, props.svgRef)
  if (!pt) return null

  const row = Math.floor((pt.y - PADDING) / CELL_SIZE)
  const col = Math.floor((pt.x - PADDING) / CELL_SIZE)
  if (row < -1 || row > grid.rows || col < -1 || col > grid.cols) return null
  const rowOuter = row === -1 || row === grid.rows
  const colOuter = col === -1 || col === grid.cols
  if (!rowOuter && !colOuter) {
    // In-grid: only void cells host clues.
    if (!grid.isVoid(cellKey(row, col))) return null
  } else if (rowOuter && colOuter && editor.activeTool !== 'little_killers') {
    // Corner positions are reserved for little killers.
    return null
  }
  const readable = editor.activeTool === 'little_killers'
    ? validLittleKillerDirections(row, col, grid.rows, grid.cols, outerCellIsLive).length > 0
    : outerClueDirections(row, col, grid.rows, grid.cols, outerCellIsLive).length > 0
  return readable ? { row, col } : null
}

// Max distance (per axis, fraction of cell size) from an interior corner
// intersection for a click to snap to it
const CORNER_THRESHOLD = 0.3

function hitCorner(event: PointerEvent): string | null {
  if (!props.svgRef) return null
  const pt = pointerToSvgPoint(event, props.svgRef)
  if (!pt) return null

  const gx = (pt.x - PADDING) / CELL_SIZE
  const gy = (pt.y - PADDING) / CELL_SIZE
  const col = Math.round(gx)
  const row = Math.round(gy)
  // Interior intersections only — a quadruple touches four cells
  if (row < 1 || row > grid.rows - 1 || col < 1 || col > grid.cols - 1) return null
  if (Math.abs(gx - col) > CORNER_THRESHOLD || Math.abs(gy - row) > CORNER_THRESHOLD) return null
  return cornerKey(row, col)
}

// Initial direction points at whichever valid diagonal corner is nearest
// the click point within the outer cell
function nearestLittleKillerDirection(pos: { row: number; col: number }, event: PointerEvent): LittleKillerDirection {
  const dirs = validLittleKillerDirections(pos.row, pos.col, grid.rows, grid.cols, outerCellIsLive)
  if (dirs.length <= 1 || !props.svgRef) return dirs[0]
  const pt = pointerToSvgPoint(event, props.svgRef)
  if (!pt) return dirs[0]
  const x0 = PADDING + pos.col * CELL_SIZE
  const y0 = PADDING + pos.row * CELL_SIZE
  let best = dirs[0]
  let bestDist = Infinity
  for (const dir of dirs) {
    const step = littleKillerStep(dir)
    const cx = x0 + (step.dCol > 0 ? CELL_SIZE : 0)
    const cy = y0 + (step.dRow > 0 ? CELL_SIZE : 0)
    const d = (pt.x - cx) ** 2 + (pt.y - cy) ** 2
    if (d < bestDist) { bestDist = d; best = dir }
  }
  return best
}

// A click near one of a multi-run clue's arrows (rendered at the cell's edge
// midpoints) toggles that run; anywhere else falls through to the clue-level
// action (remove / rossini cycle).
function hitOuterClueArrow(pos: { row: number; col: number }, key: string, event: PointerEvent): OuterClueRunDirection | null {
  if (!props.svgRef) return null
  const pt = pointerToSvgPoint(event, props.svgRef)
  if (!pt) return null
  const candidates = editor.outerClueCandidateDirections(key)
  if (candidates.length < 2) return null
  const cx = PADDING + pos.col * CELL_SIZE + CELL_SIZE / 2
  const cy = PADDING + pos.row * CELL_SIZE + CELL_SIZE / 2
  let best: OuterClueRunDirection | null = null
  let bestDist = Infinity
  for (const dir of candidates) {
    const step = OUTER_RUN_STEP[dir]
    const d = Math.hypot(pt.x - (cx + step.dCol * CELL_SIZE * 0.36), pt.y - (cy + step.dRow * CELL_SIZE * 0.36))
    if (d < bestDist) { bestDist = d; best = dir }
  }
  return bestDist <= CELL_SIZE * 0.28 ? best : null
}

function placeOuterClue(pos: { row: number; col: number }, key: string, event: PointerEvent) {
  if (editor.activeTool === 'little_killers') {
    if (editor.outerClueAt(key)?.type === 'little_killers') {
      editor.cycleLittleKillerDirection(key)
    } else {
      editor.toggleOuterClue('little_killers', key, nearestLittleKillerDirection(pos, event))
    }
    return
  }
  if (editor.outerClueAt(key)?.type === editor.activeTool) {
    const arrow = hitOuterClueArrow(pos, key, event)
    if (arrow) {
      editor.toggleOuterClueDirection(key, arrow)
      return
    }
  }
  if (editor.activeTool === 'rossini') {
    if (editor.outerClueAt(key)?.type === 'rossini') {
      editor.cycleRossiniDirection(key)
    } else {
      editor.toggleOuterClue('rossini', key)
    }
    return
  }
  editor.toggleOuterClue(editor.activeTool as OuterClueType, key)
}

// Plain cell selection (shared by the setting-mode default tool and all of
// solving mode). Ctrl/Cmd/Shift extends the selection; a bare click replaces it.

// Selection accumulated across the active drag (the brushes keep brushCells the
// same way). Extends must read this rather than props.selection: moves processed
// in one frame batch run before the emitted selection round-trips through the
// parent, so the prop can be a stale snapshot mid-gesture.
let dragSelection: Set<string> | null = null

function beginSelectionDrag(event: PointerEvent) {
  const key = hitCell(event)
  if (!key) return
  ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
  isDragging.value = true
  // The multi-select toggle makes a plain click behave like ctrl-click.
  const additive = event.ctrlKey || event.metaKey || event.shiftKey || editor.multiSelectMode
  dragAdditive.value = additive
  const next = additive ? new Set(props.selection) : new Set<string>()
  if (additive && next.has(key)) next.delete(key)
  else next.add(key)
  dragSelection = next
  emit('update:selection', new Set(next))
}

function extendSelectionDrag(event: PointerEvent) {
  const key = hitCell(event)
  if (!key) return
  const sel = dragSelection ?? new Set(props.selection)
  if (sel.has(key)) return
  sel.add(key)
  dragSelection = sel
  emit('update:selection', new Set(sel))
}

// Double-click a cell to "select all same": every cell matching the clicked
// one by content (current input mode, falling through Placed→Center→Corner→
// Color) or, for empty cells, by constraint membership (odd/even, clone,
// palindrome, thermo). Ctrl/Cmd/Shift (or multi-select) unions into the
// current selection instead of replacing it.
function onDoubleClick(event: MouseEvent) {
  if (event.button === 2) return
  // Two rapid pen clicks are mark cycling, never select-all-same.
  if (editor.mode === 'solving' && editor.inputMode === 'line') return
  const key = hitCell(event)
  if (!key) return
  const match = computeSelectAllSame(key, {
    rows: grid.rows,
    cols: grid.cols,
    mode: editor.mode,
    inputMode: editor.effectiveInputMode,
    givenDigits: editor.givenDigits,
    solverCellStates: editor.solverCellStates,
    singleCellMarks: editor.singleCellMarks,
    cosmeticInstances: editor.cosmeticInstances,
    // Fog puzzles: match only visible content so double-click can't reveal
    // hidden givens or constraint layouts. In setting mode the author sees
    // everything, so the full matching applies.
    fog: editor.fogEnabled && editor.mode === 'solving' ? editor.foggedCells : null,
  })
  if (match.size === 0) return
  const additive = event.ctrlKey || event.metaKey || event.shiftKey || editor.multiSelectMode
  emit('update:selection', additive ? new Set([...props.selection, ...match]) : match)
}

// The stroke's first node latches its lattice; later samples only look for
// nodes on that lattice (no hopping between centers and edges mid-stroke).
function penLatticeTarget(): PenTarget {
  const stroke = editor.pendingPenStroke
  if (!stroke) return editor.penTarget
  return stroke.lattice === 'center' ? 'centers' : 'edges'
}

function beginPenGesture(event: PointerEvent) {
  ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
  isDragging.value = true
  penGesture.value = true
  const pt = props.svgRef ? pointerToSvgPoint(event, props.svgRef) : null
  penDownPt = pt
  const hit = pt && nearestPenNode(pt, grid.rows, grid.cols, editor.penTarget)
  if (hit) editor.beginPenStroke(hit.key, hit.lattice)
}

function extendPenGesture(event: PointerEvent) {
  if (!props.svgRef) return
  const pt = pointerToSvgPoint(event, props.svgRef)
  if (!pt) return
  const stroke = editor.pendingPenStroke
  if (!stroke) {
    // The press missed every node; the stroke starts at the first node reached.
    const hit = nearestPenNode(pt, grid.rows, grid.cols, editor.penTarget)
    if (hit) editor.beginPenStroke(hit.key, hit.lattice)
    return
  }
  const hit = nearestPenNode(pt, grid.rows, grid.cols, penLatticeTarget())
  if (!hit) return
  const last = stroke.nodes[stroke.nodes.length - 1]
  if (hit.key === last) return
  if (nodesAdjacent(last, hit.key)) {
    editor.extendPenStroke(hit.key)
    return
  }
  // A fast flick can skip nodes; walk any straight run so the line keeps up.
  // Non-straight jumps are ignored — the next samples will land closer.
  const path = straightPath(last, hit.key)
  if (path) for (const n of path) editor.extendPenStroke(n)
}

function endPenGesture() {
  penGesture.value = false
  const stroke = editor.pendingPenStroke
  const downPt = penDownPt
  penDownPt = null
  if (stroke && stroke.nodes.length >= 2) {
    editor.commitPenStroke()
    return
  }
  // A click (no stroke drawn): cycle a cell X/O or toggle an edge X.
  editor.cancelPenStroke()
  const target = downPt && penClickTarget(downPt, grid.rows, grid.cols, editor.penTarget)
  if (target?.kind === 'cell') editor.penCycleCellMark(target.key)
  else if (target?.kind === 'edge') editor.penToggleEdgeMark(target.key)
}

function onPointerDown(event: PointerEvent) {
  if (event.button === 2) return

  // Solving mode ignores the active setting tool — always plain selection,
  // except the pen tool, which draws instead of selecting.
  if (editor.mode === 'solving') {
    if (editor.inputMode === 'line') beginPenGesture(event)
    else beginSelectionDrag(event)
    return
  }

  if (isOuterTool.value) {
    const pos = hitOuterCell(event)
    const mode = event.shiftKey ? 'select' : editor.effectiveConnectorMode
    if (!pos) {
      editor.selectOuterClue(null)
      return
    }
    const key = outerKey(pos.row, pos.col)
    if (mode === 'select') {
      editor.selectOuterClue(editor.outerClueAt(key) ? key : null)
    } else {
      placeOuterClue(pos, key, event)
    }
    return
  }

  // Text / shape: placed at a snapped point (centres/edges/corners, optionally
  // outside the grid), or selected for content editing + nudging.
  if (editor.activeTool === 'text' || editor.activeTool === 'shape') {
    const type = editor.activeTool as 'text' | 'shape'
    const mode = event.shiftKey ? 'select' : editor.effectiveConnectorMode
    if (mode === 'select') {
      editor.selectCosmetic(findCosmeticAt(event, type))
      return
    }
    const pos = snapPos(event)
    if (pos) {
      if (type === 'text') editor.toggleTextAt(pos)
      else editor.toggleShapeAt(pos)
    }
    return
  }

  if (editor.activeTool === 'clone') {
    const cloneKey = hitCell(event)
    if (!cloneKey) return
    const mode = event.shiftKey ? 'clone' : editor.effectiveCloneMode
    const hit = findCloneAt(cloneKey)
    if (mode === 'clone') {
      // Press on a group arms a drag (copy from original, move a copy);
      // releasing without moving removes instead (handled on pointerup)
      if (!hit) return
      const inst = editor.cosmeticInstances.find(i => i.id === hit.id)
      const base = hit.copyIndex !== null
        ? (inst?.data as CloneData).copies[hit.copyIndex]
        : { dRow: 0, dCol: 0 }
      const { row, col } = keyToRowCol(cloneKey)
      ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
      isDragging.value = true
      cloneDrag.value = {
        id: hit.id, copyIndex: hit.copyIndex,
        anchorRow: row, anchorCol: col,
        baseDRow: base.dRow, baseDCol: base.dCol,
        moved: false,
      }
      return
    }
    // Paint mode: same removal semantics so a click never deletes a whole family
    if (hit) {
      if (hit.copyIndex === null) editor.removeCloneOriginal(hit.id)
      else editor.removeCloneCopy(hit.id, hit.copyIndex)
      return
    }
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    isDragging.value = true
    brushCells.value = new Set([cloneKey])
    editor.setPendingRegionBrushCells([cloneKey])
    return
  }

  if (editor.activeTool === 'extra_regions') {
    const regionKey = hitCell(event)
    if (!regionKey) return
    const existing = findExtraRegionAtCell(regionKey)
    if (existing !== null) {
      editor.removeCosmeticInstance(existing)
      return
    }
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    isDragging.value = true
    brushCells.value = new Set([regionKey])
    editor.setPendingRegionBrushCells([regionKey])
    return
  }

  if (editor.activeTool === 'house') {
    const houseKey = hitCell(event)
    if (!houseKey) return
    // Always arm a brush: overlap is legal, so membership never blocks a new
    // house. A no-drag release on an existing house removes it (pointerup).
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    isDragging.value = true
    houseDownCell.value = houseKey
    houseDragged.value = false
    brushCells.value = new Set([houseKey])
    editor.setPendingRegionBrushCells([houseKey])
    return
  }

  if (isCageTool.value) {
    const cageKey = hitCell(event)
    if (!cageKey) return
    const mode = event.shiftKey ? 'select' : editor.effectiveConnectorMode
    const cageId = findCageAtCell(cageKey, editor.activeTool)
    if (mode === 'select') {
      editor.selectCage(cageId)
      return
    }
    if (cageId !== null) {
      editor.removeCage(cageId)
      return
    }
    // Drag to define the cage's cells (a plain click makes a 1-cell cage)
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    isDragging.value = true
    brushCells.value = new Set([cageKey])
    editor.setPendingCageCells([cageKey])
    return
  }

  if (editor.activeTool === 'cosmetic_border') {
    const edge = hitBorder(event)
    if (!edge) return
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    isDragging.value = true
    borderErase.value = editor.borderEdgeExists(edge)
    if (borderErase.value) {
      borderEraseEdges.value = new Set([edge])
    } else {
      editor.pendingBorderEdges = [edge]
    }
    return
  }

  if (isDotTool.value) {
    const border = editor.activeTool === 'quadruples' ? hitCorner(event) : hitBorder(event)
    const mode = event.shiftKey ? 'select' : editor.effectiveConnectorMode
    if (!border) {
      editor.selectConnectorDot(null)
    } else if (mode === 'select') {
      editor.selectConnectorDot(border)
    } else {
      editor.toggleConnectorDot(editor.activeTool as BorderConnectorType, border)
    }
    return
  }

  const key = hitCell(event)
  if (!key) return

  if (editor.activeTool === 'arrow') {
    const hit = findArrowAt(key)
    const mode = event.shiftKey ? 'arrow' : editor.effectiveArrowDrawMode
    if (mode === 'arrow') {
      // From a bulb or arrow cell, drag out a new arrow (or branch)
      if (hit) {
        ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
        isDragging.value = true
        editor.startArrowFrom(hit.id, key)
      }
      return
    }
    if (hit?.kind === 'bulb') {
      // Removing a bulb takes its arrows with it
      editor.removeCosmeticInstance(hit.id)
      return
    }
    if (hit?.kind === 'arrow') {
      editor.removeArrowPath(hit.id, key)
      return
    }
    // Empty cell → draw a new bulb (drag for a multi-cell bulb)
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    isDragging.value = true
    editor.startPendingLine(key)
    return
  }

  if (isDrawing.value) {
    if (THERMO_TYPES.has(editor.activeTool)) {
      const mode = event.shiftKey ? 'branch' : editor.effectiveThermoDrawMode
      const thermoId = findThermoAtCell(key)
      if (mode === 'branch') {
        // Drag from a thermo cell branches; tap removes that branch/subtree
        // (handled on pointerup); empty cells do nothing
        if (thermoId !== null) {
          ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
          isDragging.value = true
          editor.startBranchFromThermo(thermoId, key)
        }
        return
      }
      if (thermoId !== null) {
        editor.removeCosmeticInstance(thermoId)
        return
      }
    } else {
      // Draw: tapping an existing line deletes it. Branch (or Shift): start a
      // new line even from an existing line's cell, so lines can branch —
      // except for two-endpoint shapes (lockout), which never branch.
      const mode = UNBRANCHABLE_LINE_TYPES.has(editor.activeTool)
        ? 'draw'
        : event.shiftKey ? 'branch' : editor.effectiveLineDrawMode
      if (mode === 'draw') {
        const existingId = editor.activeTool === 'cosmetic_line'
          ? findLineAtCell(key)
          : findConstraintLineAtCell(key)
        if (existingId !== null) {
          editor.removeCosmeticInstance(existingId)
          return
        }
      }
    }
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    isDragging.value = true
    editor.startPendingLine(key)
  } else if (isBrushing.value) {
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    isDragging.value = true
    brushCells.value = new Set([key])
    brushMode.value = hasCellColor(key) ? 'erase' : 'paint'
    if (brushMode.value === 'paint') editor.setPendingBrushCells([key])
  } else if (isSingleCellTool.value) {
    editor.toggleSingleCellMark(editor.activeTool, key)
  } else {
    beginSelectionDrag(event)
  }
}

// Live placement ghost: a translucent preview of the object that would be
// placed at the snapped pointer, shown for the text/shape tools in place mode.
// Hidden over an existing object (a click there removes it) and in select mode.
function updateGhost(event: PointerEvent) {
  if (editor.mode !== 'setting' || (editor.activeTool !== 'text' && editor.activeTool !== 'shape')) {
    if (editor.ghostPos) editor.setGhostPos(null)
    return
  }
  const mode = event.shiftKey ? 'select' : editor.effectiveConnectorMode
  let next: CosmeticPos | null = null
  if (mode === 'place') {
    const pos = snapPos(event)
    if (pos && findCosmeticAt(event, editor.activeTool as 'text' | 'shape') === null) next = pos
  }
  const cur = editor.ghostPos
  if (cur?.x === next?.x && cur?.y === next?.y) return
  editor.setGhostPos(next)
}

// Pointer moves can arrive well above frame rate (high-Hz mice, coalesced
// touch bursts); the hit-testing and pending-shape updates below are too heavy
// to run on the event hot path on mobile. Queue moves and process the batch
// once per animation frame — in order, so a fast flick never skips cells,
// while Vue's scheduler still renders the batch as one flush.
let queuedMoves: PointerEvent[] = []
let moveFrame = 0

function onPointerMove(event: PointerEvent) {
  queuedMoves.push(event)
  if (moveFrame) return
  moveFrame = requestAnimationFrame(() => {
    moveFrame = 0
    const batch = queuedMoves
    queuedMoves = []
    for (const e of batch) processPointerMove(e)
  })
}

// Drop any queued moves so a stale frame can't fire after the gesture ended
// (e.g. resurrecting the ghost cursor after pointerleave cleared it).
function cancelQueuedMove() {
  queuedMoves = []
  if (moveFrame) {
    cancelAnimationFrame(moveFrame)
    moveFrame = 0
  }
}

function processPointerMove(event: PointerEvent) {
  updateGhost(event)
  if (!isDragging.value) return

  if (penGesture.value) {
    extendPenGesture(event)
    return
  }

  if (editor.mode === 'solving') {
    extendSelectionDrag(event)
    return
  }

  if (editor.activeTool === 'cosmetic_border') {
    const edge = hitBorder(event)
    if (!edge) return
    if (borderErase.value) {
      if (!borderEraseEdges.value.has(edge)) {
        borderEraseEdges.value = new Set([...borderEraseEdges.value, edge])
      }
    } else if (!editor.pendingBorderEdges.includes(edge)) {
      editor.pendingBorderEdges = [...editor.pendingBorderEdges, edge]
    }
    return
  }

  if (isCageTool.value) {
    const key = hitCell(event)
    if (!key || brushCells.value.has(key) || findCageAtCell(key, editor.activeTool) !== null) return
    brushCells.value = new Set([...brushCells.value, key])
    editor.setPendingCageCells(Array.from(brushCells.value))
    return
  }

  if (editor.activeTool === 'extra_regions') {
    const key = hitCell(event)
    if (!key || brushCells.value.has(key) || findExtraRegionAtCell(key) !== null) return
    brushCells.value = new Set([...brushCells.value, key])
    editor.setPendingRegionBrushCells(Array.from(brushCells.value))
    return
  }

  if (editor.activeTool === 'house') {
    const key = hitCell(event)
    if (!key || brushCells.value.has(key)) return
    // No membership skip: houses overlap freely.
    houseDragged.value = true
    brushCells.value = new Set([...brushCells.value, key])
    editor.setPendingRegionBrushCells(Array.from(brushCells.value))
    return
  }

  if (editor.activeTool === 'clone') {
    const key = hitCell(event)
    if (!key) return
    if (cloneDrag.value) {
      // Cell-granular drag preview — only write when the offset changes
      const { row, col } = keyToRowCol(key)
      const drag = cloneDrag.value
      const dRow = drag.baseDRow + (row - drag.anchorRow)
      const dCol = drag.baseDCol + (col - drag.anchorCol)
      const prev = editor.pendingCloneDrag
      if (prev && prev.dRow === dRow && prev.dCol === dCol) return
      if (dRow !== drag.baseDRow || dCol !== drag.baseDCol) drag.moved = true
      editor.setPendingCloneDrag({ instanceId: drag.id, copyIndex: drag.copyIndex, dRow, dCol })
      return
    }
    if (brushCells.value.has(key) || findCloneAt(key) !== null) return
    brushCells.value = new Set([...brushCells.value, key])
    editor.setPendingRegionBrushCells(Array.from(brushCells.value))
    return
  }

  if (isDrawing.value) {
    const key = hitCellBuffered(event)
    if (key) editor.extendPendingLine(key)
  } else if (isBrushing.value) {
    const key = hitCell(event)
    if (!key || brushCells.value.has(key)) return
    brushCells.value = new Set([...brushCells.value, key])
    if (brushMode.value === 'paint') editor.setPendingBrushCells(Array.from(brushCells.value))
  } else {
    extendSelectionDrag(event)
  }
}

// A pointercancel (system gesture, second finger, etc.) aborts the gesture
// without a pointerup — reset transient state so we don't get stuck mid-drag.
function onPointerCancel() {
  cancelQueuedMove()
  dragSelection = null
  editor.setGhostPos(null)
  if (penGesture.value) {
    penGesture.value = false
    penDownPt = null
    editor.cancelPenStroke()
  }
  if (!isDragging.value) return
  isDragging.value = false
  brushCells.value = new Set()
  brushMode.value = null
  cloneDrag.value = null
  houseDownCell.value = null
  houseDragged.value = false
  editor.setPendingCloneDrag(null)
  editor.setPendingBrushCells([])
  editor.setPendingRegionBrushCells([])
  editor.cancelPendingLine()
}

// Clear the placement ghost when the pointer leaves the grid.
function onPointerLeave() {
  cancelQueuedMove()
  if (editor.ghostPos) editor.setGhostPos(null)
}

function onPointerUp(event: PointerEvent) {
  // Flush queued moves first so a fast flick's final positions land (line
  // ends / brush cells) before the gesture commits.
  if (queuedMoves.length) {
    const batch = queuedMoves
    cancelQueuedMove()
    for (const e of batch) processPointerMove(e)
  }
  dragSelection = null
  if (!isDragging.value) return
  ;(event.currentTarget as Element).releasePointerCapture(event.pointerId)
  isDragging.value = false

  if (penGesture.value) {
    endPenGesture()
    return
  }

  // Plain selection in solving mode has nothing to commit on release.
  if (editor.mode === 'solving') return

  if (editor.activeTool === 'cosmetic_border') {
    if (borderErase.value) {
      editor.eraseBorderEdges(Array.from(borderEraseEdges.value))
      borderEraseEdges.value = new Set()
      borderErase.value = false
    } else {
      editor.commitBorderInstance([...editor.pendingBorderEdges])
    }
    return
  }

  if (isCageTool.value) {
    if (editor.activeTool === 'cosmetic_cage') editor.commitCosmeticCage(Array.from(brushCells.value))
    else editor.commitCage(Array.from(brushCells.value))
    brushCells.value = new Set()
    return
  }

  if (editor.activeTool === 'extra_regions') {
    editor.commitExtraRegion(Array.from(brushCells.value))
    brushCells.value = new Set()
    return
  }

  if (editor.activeTool === 'house') {
    // Tap (no drag) on an existing house removes the topmost one there;
    // anything else commits the brush (the store drops < 2 cells).
    if (!houseDragged.value && houseDownCell.value && editor.findHouseAt(houseDownCell.value)) {
      editor.removeHouseAt(houseDownCell.value)
    } else {
      editor.commitHouse(Array.from(brushCells.value))
    }
    houseDownCell.value = null
    houseDragged.value = false
    brushCells.value = new Set()
    return
  }

  if (editor.activeTool === 'clone') {
    if (cloneDrag.value) {
      const drag = cloneDrag.value
      const pending = editor.pendingCloneDrag
      cloneDrag.value = null
      editor.setPendingCloneDrag(null)
      if (!drag.moved) {
        // Tap: removal (removing an original promotes a copy)
        if (drag.copyIndex === null) editor.removeCloneOriginal(drag.id)
        else editor.removeCloneCopy(drag.id, drag.copyIndex)
      } else if (pending) {
        if (drag.copyIndex === null) editor.commitCloneCopy(drag.id, pending.dRow, pending.dCol)
        else editor.moveCloneCopy(drag.id, drag.copyIndex, pending.dRow, pending.dCol)
      }
      return
    }
    editor.commitClonePaint(Array.from(brushCells.value))
    brushCells.value = new Set()
    return
  }

  if (isDrawing.value) {
    if (
      THERMO_TYPES.has(editor.activeTool) &&
      editor.pendingBranchThermoId !== null &&
      editor.pendingLineCells.length < 2
    ) {
      // Shift-click without drag → delete this branch/subtree
      const thermoId = editor.pendingBranchThermoId
      const cell = editor.pendingLineCells[0]
      editor.cancelPendingLine()
      if (cell) editor.removeThermoSubtree(thermoId, cell)
    } else {
      editor.commitPendingLine()
    }
  } else if (isBrushing.value) {
    const cells = Array.from(brushCells.value)
    if (editor.activeTool === 'cell_color') {
      editor.setPendingBrushCells([])
      if (brushMode.value === 'paint') editor.paintCells(cells)
      else if (brushMode.value === 'erase') editor.eraseCells(cells)
    }
    brushCells.value = new Set()
    brushMode.value = null
  }
}
</script>

<template>
  <rect
    :x="PADDING - margins.left"
    :y="PADDING - margins.top"
    :width="grid.cols * CELL_SIZE + margins.left + margins.right"
    :height="grid.rows * CELL_SIZE + margins.top + margins.bottom"
    fill="transparent"
    :style="{ cursor }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @pointerleave="onPointerLeave"
    @dblclick="onDoubleClick"
  />
</template>
