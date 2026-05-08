<script setup lang="ts">
interface Option {
  type: string
  label: string
}

const props = defineProps<{
  title: string
  options: Option[]
  disabledTypes?: string[]
}>()

const emit = defineEmits<{
  pick: [type: string, label: string]
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-xl shadow-xl w-64 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-900 text-sm">
            Add {{ title }}
          </h3>
          <button
            class="text-gray-400 hover:text-gray-600 text-lg leading-none"
            @click="emit('close')"
          >
            ×
          </button>
        </div>

        <div class="flex flex-col gap-0.5">
          <button
            v-for="opt in options"
            :key="opt.type"
            :disabled="props.disabledTypes?.includes(opt.type)"
            class="text-left px-3 py-2 rounded-lg text-sm transition-colors"
            :class="props.disabledTypes?.includes(opt.type)
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'"
            @click="!props.disabledTypes?.includes(opt.type) && (emit('pick', opt.type, opt.label), emit('close'))"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
