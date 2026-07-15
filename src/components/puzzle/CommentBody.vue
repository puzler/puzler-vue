<script setup lang="ts">
// Renders a comment's server-redacted segments. Spoiler spans stay obscured
// even for viewers allowed to read them (click to reveal), so nobody gets
// spoiled by an accidental glance; redacted spans are inert placeholders.
import { ref } from 'vue'
import type { CommentFieldsFragment } from '@/graphql/generated/types'

const props = defineProps<{ comment: CommentFieldsFragment }>()

const revealed = ref<Set<number>>(new Set())

function toggle(index: number) {
  const next = new Set(revealed.value)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  revealed.value = next
}

const wholeSpoiler = props.comment.isSpoiler
</script>

<template>
  <div class="mt-1.5 text-sm text-ink-text leading-relaxed">
    <p
      v-if="wholeSpoiler && comment.spoilersRedacted"
      class="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs text-faint select-none"
      data-testid="spoiler-locked"
    >
      <span aria-hidden="true">🔒</span>
      Spoiler, hidden until you solve this puzzle.
    </p>

    <template v-else>
      <span class="whitespace-pre-line">
        <template
          v-for="(segment, index) in comment.segments"
          :key="index"
        >
          <template v-if="!segment.spoiler">{{ segment.text }}</template>
          <span
            v-else-if="segment.redacted"
            class="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-1.5 py-0.5 text-xs text-faint align-baseline select-none"
            data-testid="spoiler-locked"
          >
            <span aria-hidden="true">🔒</span>
            hidden until you solve
          </span>
          <button
            v-else
            type="button"
            class="inline rounded-md px-1 align-baseline transition-colors"
            :class="revealed.has(index)
              ? 'bg-spark-tint text-ink-text'
              : 'bg-ink text-ink cursor-pointer hover:opacity-80'"
            :aria-pressed="revealed.has(index)"
            :title="revealed.has(index) ? 'Hide spoiler' : 'Show spoiler'"
            data-testid="spoiler-reveal"
            @click="toggle(index)"
          >
            <span :class="revealed.has(index) ? '' : 'invisible'">{{ segment.text }}</span>
          </button>
        </template>
      </span>
    </template>

    <p
      v-if="comment.isSpoiler && comment.spoilerMarkedBySetter"
      class="mt-1 text-[11px] text-faint italic"
    >
      Marked as a spoiler by the setter.
    </p>
  </div>
</template>
