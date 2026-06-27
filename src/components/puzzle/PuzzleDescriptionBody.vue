<script setup lang="ts">
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

    <!-- eslint-disable vue/no-v-html -- html is sanitized by sanitizeHtml() (DOMPurify), mirroring the server-side sanitizer. -->
    <section
      v-if="html"
      class="description-body text-ink-text leading-relaxed"
      :class="rules ? 'mt-6 pt-6 border-t border-line' : ''"
      v-html="html"
    />
    <!-- eslint-enable vue/no-v-html -->
  </div>
</template>

<style scoped>
/* v-html content isn't scoped, so target it through :deep. */
.description-body :deep(h1),
.description-body :deep(h2),
.description-body :deep(h3) {
  font-family: var(--font-display, inherit);
  font-weight: 700;
  margin: 1.25rem 0 0.5rem;
  line-height: 1.2;
}
.description-body :deep(h1) { font-size: 1.5rem; }
.description-body :deep(h2) { font-size: 1.25rem; }
.description-body :deep(h3) { font-size: 1.1rem; }
.description-body :deep(p) { margin: 0.75rem 0; }
.description-body :deep(ul),
.description-body :deep(ol) { margin: 0.75rem 0; padding-left: 1.5rem; }
.description-body :deep(ul) { list-style: disc; }
.description-body :deep(ol) { list-style: decimal; }
.description-body :deep(a) { color: var(--color-action); text-decoration: underline; }
.description-body :deep(blockquote) {
  border-left: 3px solid var(--color-line);
  padding-left: 1rem;
  margin: 0.75rem 0;
  color: var(--color-soft);
}
.description-body :deep(img) { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 0.75rem 0; }
.description-body :deep(pre) {
  background: var(--color-line);
  padding: 0.75rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 0.75rem 0;
}
.description-body :deep(code) { font-family: ui-monospace, monospace; font-size: 0.9em; }
.description-body :deep(hr) { border: none; border-top: 1px solid var(--color-line); margin: 1.5rem 0; }
</style>
