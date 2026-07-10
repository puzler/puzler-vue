<script setup lang="ts">
import RichProseBody from '@/components/RichProseBody.vue'

// Rules text + the author's sanitized rich description, in one card. `html` is
// already sanitized by the caller (sanitizeHtml/DOMPurify).
defineProps<{ rules?: string | null; html: string }>()
</script>

<template>
  <div
    v-if="rules || html"
    class="bg-surface border border-line rounded-xl p-5"
  >
    <section v-if="rules">
      <h2 class="text-[11px] font-semibold uppercase tracking-widest text-soft mb-1.5">
        Rules
      </h2>
      <p class="text-ink-text whitespace-pre-line leading-relaxed">
        {{ rules }}
      </p>
    </section>

    <RichProseBody
      v-if="html"
      :html="html"
      :class="rules ? 'mt-6 pt-6 border-t border-line' : ''"
    />
  </div>
</template>
