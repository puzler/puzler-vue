<script setup lang="ts">
import { ref, computed } from 'vue'
import ConstraintTile from '@/components/editor/ConstraintTile.vue'
import ConstraintCategoryNav from '@/components/editor/ConstraintCategoryNav.vue'
import ConstraintPickerToolbar from '@/components/editor/ConstraintPickerToolbar.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { LOCAL_PICKER_GROUPS } from '@/constraints/registry'

// Groups derived from the UI constraint registry (each def's toolbox.pickerGroup +
// pickerLabel). Both views sort options A-Z, so only group order matters.
const GROUPS = LOCAL_PICKER_GROUPS

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
  <BaseModal
    variant="sheet"
    size="3xl"
    card-class="sm:h-[600px]"
    @close="emit('close')"
  >
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
  </BaseModal>
</template>
