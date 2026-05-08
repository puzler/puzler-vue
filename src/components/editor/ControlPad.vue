<script setup lang="ts">
const emit = defineEmits<{
  digit: [n: number]
  delete: []
}>()
</script>

<template>
  <div class="grid grid-cols-3 gap-1.5 w-full">
    <button
      v-for="n in [1, 2, 3, 4, 5, 6, 7, 8, 9]"
      :key="n"
      class="aspect-square rounded-lg bg-white border border-gray-200 text-gray-800 text-xl font-semibold shadow-sm hover:bg-blue-50 hover:border-blue-300 active:bg-blue-100 transition-colors"
      @click="emit('digit', n)"
    >
      {{ n }}
    </button>

    <button
      class="aspect-square rounded-lg bg-white border border-gray-200 text-gray-800 text-xl font-semibold shadow-sm hover:bg-blue-50 hover:border-blue-300 active:bg-blue-100 transition-colors"
      @click="emit('digit', 0)"
    >
      0
    </button>

    <button
      class="col-span-2 rounded-lg bg-white border border-gray-200 text-gray-500 text-sm font-medium shadow-sm hover:bg-red-50 hover:border-red-300 hover:text-red-500 active:bg-red-100 transition-colors py-2"
      @click="emit('delete')"
    >
      Delete
    </button>
  </div>
</template>
