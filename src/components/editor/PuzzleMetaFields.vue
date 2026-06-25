<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useAuthStore } from '@/stores/auth'
import RulesModal from './RulesModal.vue'
import DifficultyPips from '@/components/DifficultyPips.vue'

const editor = useEditorStore()
const auth = useAuthStore()

const showRules = ref(false)
</script>

<template>
  <div class="px-2 py-3 border-b border-line">
    <p class="text-[10px] font-semibold uppercase tracking-widest text-soft px-2 mb-2">
      Puzzle
    </p>
    <div class="flex flex-col gap-1.5 px-1">
      <input
        v-model="editor.puzzleName"
        placeholder="Puzzle name"
        maxlength="100"
        class="w-full text-sm px-2 py-1 rounded border border-line bg-surface text-ink-text focus:outline-none focus:border-action"
      >
      <input
        v-model="editor.puzzleAuthor"
        :placeholder="auth.user?.displayName || 'Author'"
        class="w-full text-sm px-2 py-1 rounded border border-line bg-surface text-ink-text focus:outline-none focus:border-action"
      >
      <button
        type="button"
        class="w-full text-left text-sm px-2 py-1.5 rounded border border-line bg-surface hover:border-action transition-colors min-h-[2.5rem]"
        @click="showRules = true"
      >
        <span
          v-if="editor.puzzleRules"
          class="line-clamp-2 text-ink-text"
        >{{ editor.puzzleRules }}</span>
        <span
          v-else
          class="text-faint"
        >Rules &amp; solve message…</span>
      </button>
      <div class="flex items-center justify-between px-1 pt-0.5">
        <span class="text-xs text-soft">Difficulty</span>
        <DifficultyPips v-model="editor.authorDifficulty" />
      </div>
    </div>

    <RulesModal
      v-if="showRules"
      v-model:rules="editor.puzzleRules"
      v-model:solve-message="editor.solveMessage"
      @close="showRules = false"
    />
  </div>
</template>
