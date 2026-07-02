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

  function reset(): void {
    const fresh = make(`${labelPrefix} 1`)
    presets.value = [fresh]
    activeId.value = fresh.id
  }

  return { presets, activeId, active, add, setActive, updateActive, reset }
}

// The common preset shape: patches merge into a nested `style` object.
export function styledPatch<P extends { style: object }, Patch extends object>(
  preset: P,
  patch: Patch,
): P {
  return { ...preset, style: { ...preset.style, ...patch } }
}
