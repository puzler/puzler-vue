<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { usePuzzleStore } from '@/stores/puzzle'

const puzzle = usePuzzleStore()
const username = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

async function run(action: () => Promise<unknown>) {
  busy.value = true
  error.value = null
  try {
    await action()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    busy.value = false
  }
}

async function addUser() {
  const name = username.value.trim()
  if (!name) return
  await run(() => puzzle.grantAccess(name))
  if (!error.value) username.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-xs font-semibold text-soft uppercase">People with access</span>
    <p
      v-if="error"
      class="text-xs text-red-600"
    >
      {{ error }}
    </p>
    <div class="flex gap-2">
      <input
        v-model="username"
        placeholder="username"
        class="flex-1 px-2 py-1 text-sm rounded-lg border border-line bg-paper"
        @keydown.enter="addUser"
      >
      <button
        class="px-3 py-1 text-sm rounded-lg bg-action text-on-action hover:bg-action-deep disabled:opacity-50"
        :disabled="busy"
        @click="addUser"
      >
        Add
      </button>
    </div>
    <ul class="flex flex-col gap-1">
      <li
        v-for="u in puzzle.grantedUsers"
        :key="u.id"
        class="flex items-center justify-between text-sm px-2 py-1 rounded-lg bg-paper"
      >
        <span>
          <RouterLink
            :to="`/profile/${u.username}`"
            class="hover:text-action transition-colors"
          >{{ u.displayName }}</RouterLink>
          <span class="text-faint">@{{ u.username }}</span>
        </span>
        <button
          class="text-xs text-red-600 hover:underline"
          :disabled="busy"
          @click="run(() => puzzle.revokeAccess(u.id))"
        >
          Remove
        </button>
      </li>
    </ul>
  </div>
</template>
