<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent, type Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import {
  mdiFormatBold, mdiFormatItalic, mdiFormatStrikethrough,
  mdiFormatHeader2, mdiFormatHeader3, mdiFormatListBulleted, mdiFormatListNumbered,
  mdiFormatQuoteClose, mdiLinkVariant, mdiImageOutline,
} from '@mdi/js'
import MdiIcon from '@/components/MdiIcon.vue'
import { usePuzzleStore } from '@/stores/puzzle'
import { sanitizeHtml } from '@/utils/sanitizeHtml'

const puzzle = usePuzzleStore()
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const message = ref<string | null>(null)

// Sanitize the incoming HTML before TipTap parses it (defence-in-depth; the
// stored value is already server-sanitized).
const editor = useEditor({
  content: sanitizeHtml(puzzle.pageDescriptionHtml) || '',
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false } }),
    Image,
  ],
  editorProps: { attributes: { class: 'description-prose focus:outline-none min-h-[8rem]' } },
  onUpdate: scheduleSave,
})

// Toolbar config: each entry knows how to run its command and (optionally) the
// mark/node name to highlight when active. Keeps the template tiny.
type Tool = { icon: string; title: string; active?: string; level?: number; run: (e: Editor) => void }
const TOOLS: Tool[] = [
  { icon: mdiFormatBold, title: 'Bold', active: 'bold', run: (e) => e.chain().focus().toggleBold().run() },
  { icon: mdiFormatItalic, title: 'Italic', active: 'italic', run: (e) => e.chain().focus().toggleItalic().run() },
  { icon: mdiFormatStrikethrough, title: 'Strikethrough', active: 'strike', run: (e) => e.chain().focus().toggleStrike().run() },
  { icon: mdiFormatHeader2, title: 'Heading', active: 'heading', level: 2, run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { icon: mdiFormatHeader3, title: 'Subheading', active: 'heading', level: 3, run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { icon: mdiFormatListBulleted, title: 'Bullet list', active: 'bulletList', run: (e) => e.chain().focus().toggleBulletList().run() },
  { icon: mdiFormatListNumbered, title: 'Numbered list', active: 'orderedList', run: (e) => e.chain().focus().toggleOrderedList().run() },
  { icon: mdiFormatQuoteClose, title: 'Quote', active: 'blockquote', run: (e) => e.chain().focus().toggleBlockquote().run() },
]

function isOn(e: Editor, tool: Tool): boolean {
  if (!tool.active) return false
  return tool.level ? e.isActive(tool.active, { level: tool.level }) : e.isActive(tool.active)
}

let timer: ReturnType<typeof setTimeout> | null = null
function scheduleSave() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(flushSave, 800)
}
async function flushSave() {
  if (timer) { clearTimeout(timer); timer = null }
  try {
    await puzzle.updatePageDescription(editor.value?.getHTML() ?? '')
    message.value = 'Saved'
  } catch (e) {
    message.value = e instanceof Error ? e.message : 'Could not save description'
  }
}

function setLink() {
  const url = window.prompt('Link URL (https://…)')
  if (url === null) return
  if (url === '') editor.value?.chain().focus().unsetLink().run()
  else editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

async function onPickImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploading.value = true
  message.value = null
  try {
    const url = await puzzle.uploadDescriptionImage(file)
    editor.value?.chain().focus().setImage({ src: url }).run()
  } catch (e) {
    message.value = e instanceof Error ? e.message : 'Could not upload image'
  } finally {
    uploading.value = false
  }
}

onBeforeUnmount(() => {
  void flushSave()
  editor.value?.destroy()
})
</script>

<template>
  <div class="rounded-xl border border-line bg-paper overflow-hidden">
    <div
      v-if="editor"
      class="flex flex-wrap items-center gap-0.5 border-b border-line px-1.5 py-1"
    >
      <button
        v-for="(tool, i) in TOOLS"
        :key="i"
        type="button"
        class="tb"
        :class="{ on: isOn(editor, tool) }"
        :title="tool.title"
        @click="tool.run(editor)"
      >
        <MdiIcon
          :path="tool.icon"
          :size="18"
        />
      </button>
      <span class="mx-0.5 w-px h-5 bg-line" />
      <button
        type="button"
        class="tb"
        :class="{ on: editor.isActive('link') }"
        title="Link"
        @click="setLink"
      >
        <MdiIcon
          :path="mdiLinkVariant"
          :size="18"
        />
      </button>
      <button
        type="button"
        class="tb"
        :disabled="uploading"
        title="Insert image"
        @click="fileInput?.click()"
      >
        <MdiIcon
          :path="mdiImageOutline"
          :size="18"
        />
      </button>
      <span
        v-if="message"
        class="ml-auto pr-1 text-[11px] text-faint"
      >{{ uploading ? 'Uploading…' : message }}</span>
    </div>

    <EditorContent
      :editor="editor"
      class="px-3 py-2 text-sm text-ink-text max-h-64 overflow-y-auto"
    />

    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      class="hidden"
      @change="onPickImage"
    >
  </div>
</template>

<style scoped>
.tb {
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  color: var(--color-soft);
}
.tb:hover { background: var(--color-action-tint); color: var(--color-action); }
.tb.on { background: var(--color-action-tint); color: var(--color-action); }
.tb:disabled { opacity: 0.5; }

.description-prose :deep(h2) { font-size: 1.2rem; font-weight: 700; margin: 0.6rem 0 0.3rem; }
.description-prose :deep(h3) { font-size: 1.05rem; font-weight: 700; margin: 0.5rem 0 0.3rem; }
.description-prose :deep(p) { margin: 0.4rem 0; }
.description-prose :deep(ul) { list-style: disc; margin: 0.4rem 0; padding-left: 1.4rem; }
.description-prose :deep(ol) { list-style: decimal; margin: 0.4rem 0; padding-left: 1.4rem; }
.description-prose :deep(a) { color: var(--color-action); text-decoration: underline; }
.description-prose :deep(blockquote) { border-left: 3px solid var(--color-line); padding-left: 0.75rem; color: var(--color-soft); margin: 0.4rem 0; }
.description-prose :deep(img) { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 0.4rem 0; }
</style>
