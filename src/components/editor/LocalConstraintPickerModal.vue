<script setup lang="ts">
import { ref, computed } from 'vue'
import ConstraintTile from '@/components/editor/ConstraintTile.vue'
import ConstraintCategoryNav from '@/components/editor/ConstraintCategoryNav.vue'
import ConstraintPickerToolbar from '@/components/editor/ConstraintPickerToolbar.vue'

interface ConstraintOption {
  type: string
  label: string
}

interface ConstraintGroup {
  key: string
  label: string
  options: ConstraintOption[]
}

const GROUPS: ConstraintGroup[] = [
  {
    key: 'lines',
    label: 'Lines',
    options: [
      { type: 'renban', label: 'Renban Lines' },
      { type: 'german_whispers', label: 'German Whispers' },
      { type: 'region_sum', label: 'Region Sum Lines' },
      { type: 'palindrome', label: 'Palindrome Lines' },
      { type: 'dutch_whispers', label: 'Dutch Whispers' },
      { type: 'between_lines', label: 'Between Lines' },
    ],
  },
  {
    key: 'single_cell',
    label: 'Single Cell Constraints',
    options: [
      { type: 'odd_cells', label: 'Odd Cells' },
      { type: 'even_cells', label: 'Even Cells' },
      { type: 'minimums', label: 'Minimums' },
      { type: 'maximums', label: 'Maximums' },
      { type: 'row_index_cells', label: 'Row Index Cells' },
      { type: 'col_index_cells', label: 'Column Index Cells' },
    ],
  },
  {
    key: 'cell_connectors',
    label: 'Cell Connectors',
    options: [
      { type: 'difference_dots', label: 'Difference Dots' },
      { type: 'ratio_dots', label: 'Ratio Dots' },
      { type: 'xv', label: 'XV' },
      { type: 'quadruples', label: 'Quadruples' },
    ],
  },
  {
    key: 'multi_cell',
    label: 'Multi-Cell Constraints',
    options: [
      { type: 'thermometer', label: 'Thermometers' },
      { type: 'slow_thermometer', label: 'Slow Thermometers' },
      { type: 'arrow', label: 'Arrows' },
      { type: 'killer_cage', label: 'Killer Cages' },
      { type: 'clone', label: 'Clones' },
      { type: 'extra_regions', label: 'Extra Regions' },
    ],
  },
  {
    key: 'outer_clues',
    label: 'Outer Clues',
    options: [
      { type: 'x_sums', label: 'X-Sums' },
      { type: 'sandwich_sums', label: 'Sandwich Sums' },
      { type: 'skyscrapers', label: 'Skyscrapers' },
      { type: 'little_killers', label: 'Little Killers' },
    ],
  },
]

interface FlatConstraint {
  type: string
  label: string
  categoryKey: string
  categoryLabel: string
}

// Flatten GROUPS once for searching/sorting; GROUPS stays the source of truth.
const FLAT: FlatConstraint[] = GROUPS.flatMap((g) =>
  g.options.map((o) => ({
    type: o.type,
    label: o.label,
    categoryKey: g.key,
    categoryLabel: g.label,
  })),
)

const props = defineProps<{
  disabledTypes?: string[]
}>()

const emit = defineEmits<{
  pick: [type: string, label: string]
  close: []
}>()

type SortMode = 'alphabetical' | 'category'

const selectedCategory = ref<string | null>(null)
const search = ref('')
const sortMode = ref<SortMode>('alphabetical')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return FLAT.filter((c) => {
    if (selectedCategory.value && c.categoryKey !== selectedCategory.value) return false
    if (q && !c.label.toLowerCase().includes(q)) return false
    return true
  })
})

// Alphabetical view: one flat A-Z list.
const alphabetical = computed(() =>
  [...filtered.value].sort((a, b) => a.label.localeCompare(b.label)),
)

// By-category view: groups in GROUPS order, items A-Z within, empty groups omitted.
const byCategory = computed(() => {
  return GROUPS.map((g) => ({
    categoryKey: g.key,
    categoryLabel: g.label,
    items: filtered.value
      .filter((c) => c.categoryKey === g.key)
      .sort((a, b) => a.label.localeCompare(b.label)),
  })).filter((group) => group.items.length > 0)
})

function isDisabled(type: string) {
  return props.disabledTypes?.includes(type) ?? false
}

function pick(type: string, label: string) {
  if (isDisabled(type)) return
  // Intentionally does not close: lets the user add several constraints in one
  // session. The just-added tile greys out as the parent's disabledTypes updates.
  emit('pick', type, label)
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      @click.self="emit('close')"
    >
      <div class="bg-surface rounded-xl shadow-xl w-full max-w-3xl h-[600px] max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <h3 class="font-display font-semibold text-ink-text text-sm">
            Add Local Constraint
          </h3>
          <button
            class="text-faint hover:text-soft text-lg leading-none"
            @click="emit('close')"
          >
            ×
          </button>
        </div>

        <div class="flex-1 min-h-0 flex flex-col md:flex-row md:gap-4">
          <ConstraintCategoryNav
            v-model="selectedCategory"
            :groups="GROUPS"
          />

          <!-- Right: search + sort toolbar, then scrollable grid -->
          <div class="flex-1 min-w-0 flex flex-col min-h-0">
            <ConstraintPickerToolbar
              v-model:search="search"
              v-model:sort="sortMode"
            />

            <div class="flex-1 overflow-y-auto px-4 pb-4">
              <p
                v-if="filtered.length === 0"
                class="text-center text-sm text-faint py-10"
              >
                No constraints match your search.
              </p>

              <!-- Alphabetical: one flat grid -->
              <div
                v-else-if="sortMode === 'alphabetical'"
                class="grid grid-cols-3 md:grid-cols-4 gap-2"
              >
                <ConstraintTile
                  v-for="opt in alphabetical"
                  :key="opt.type"
                  :type="opt.type"
                  :label="opt.label"
                  :disabled="isDisabled(opt.type)"
                  @pick="pick"
                />
              </div>

              <!-- By Category: section header + sub-grid per category -->
              <template v-else>
                <section
                  v-for="group in byCategory"
                  :key="group.categoryKey"
                >
                  <p class="text-[10px] font-semibold uppercase tracking-widest text-faint px-1 mb-1.5 mt-3 first:mt-0">
                    {{ group.categoryLabel }}
                  </p>
                  <div class="grid grid-cols-3 md:grid-cols-4 gap-2">
                    <ConstraintTile
                      v-for="opt in group.items"
                      :key="opt.type"
                      :type="opt.type"
                      :label="opt.label"
                      :disabled="isDisabled(opt.type)"
                      @pick="pick"
                    />
                  </div>
                </section>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
