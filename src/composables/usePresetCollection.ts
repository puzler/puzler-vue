import { ref, computed, type Ref } from 'vue'

// One preset collection (cosmetic lines, shapes, text, cages, cell colors):
// an ordered list plus an active selection, where deactivated ids fall back to
// the first preset. The five editor collections share this shape exactly; only
// the preset body and how a patch merges differ per kind, so those come in as
// functions. The editor store re-exports each instance's pieces under its
// existing public names (linePresets, activeLinePresetId, ...), keeping the
// store's API unchanged.
export function usePresetCollection<P extends { id: string; label: string }, Patch>(
  labelPrefix: string,
  body: () => Omit<P, 'id' | 'label'>,
  applyPatch: (preset: P, patch: Patch) => P,
) {
  function make(label: string): P {
    return { id: crypto.randomUUID(), label, ...body() } as P
  }

  const presets = ref([make(`${labelPrefix} 1`)]) as Ref<P[]>
  const activeId = ref<string>(presets.value[0].id)
  const active = computed<P>(
    () => presets.value.find((p) => p.id === activeId.value) ?? presets.value[0],
  )

  function add(): P {
    const preset = make(`${labelPrefix} ${presets.value.length + 1}`)
    presets.value = [...presets.value, preset]
    activeId.value = preset.id
    return preset
  }

  function setActive(id: string): void {
    if (presets.value.some((p) => p.id === id)) activeId.value = id
  }

  function updateActive(patch: Patch): void {
    presets.value = presets.value.map((p) => (p.id === activeId.value ? applyPatch(p, patch) : p))
  }

  function duplicate(id: string): P | null {
    const index = presets.value.findIndex((p) => p.id === id)
    if (index === -1) return null
    const source = presets.value[index]
    // Presets are plain JSON data; a JSON round-trip deep-clones through any
    // nested reactive proxies (structuredClone chokes on them).
    const copy = { ...JSON.parse(JSON.stringify(source)) as P, id: crypto.randomUUID(), label: `${source.label} copy` }
    presets.value = [...presets.value.slice(0, index + 1), copy, ...presets.value.slice(index + 1)]
    activeId.value = copy.id
    return copy
  }

  // Collections assume at least one preset (`active` falls back to the first),
  // so the last one can't be removed. Returns what was removed so callers can
  // build an undo step around it.
  function remove(id: string): { preset: P; index: number } | null {
    const index = presets.value.findIndex((p) => p.id === id)
    if (index === -1 || presets.value.length === 1) return null
    const preset = presets.value[index]
    presets.value = presets.value.filter((p) => p.id !== id)
    if (activeId.value === id) activeId.value = presets.value[Math.max(0, index - 1)].id
    return { preset, index }
  }

  function restore(preset: P, index: number): void {
    presets.value = [...presets.value.slice(0, index), preset, ...presets.value.slice(index)]
    activeId.value = preset.id
  }

  function rename(id: string, label: string): void {
    const trimmed = label.trim()
    if (!trimmed) return
    presets.value = presets.value.map((p) => (p.id === id ? { ...p, label: trimmed } : p))
  }

  function reset(): void {
    const fresh = make(`${labelPrefix} 1`)
    presets.value = [fresh]
    activeId.value = fresh.id
  }

  return { presets, activeId, active, add, setActive, updateActive, duplicate, remove, restore, rename, reset }
}

// The common preset shape: patches merge into a nested `style` object.
export function styledPatch<P extends { style: object }, Patch extends object>(
  preset: P,
  patch: Patch,
): P {
  return { ...preset, style: { ...preset.style, ...patch } }
}
