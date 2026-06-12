<script lang="ts">
import { h, defineComponent } from 'vue'
import type { PropType } from 'vue'
import LegalPage from './LegalPage.vue'
import type { LegalDoc, Block, Paragraph } from './content'

// Render-function component (no template) that turns a structured LegalDoc into
// prose. Keeping it as a render function keeps each legal document's text in a
// single readable data file and avoids a giant hand-written template.
function inline(p: Paragraph) {
  return (Array.isArray(p) ? p : [p]).map((seg) =>
    typeof seg === 'string' ? seg : h('a', { href: seg.href }, seg.text),
  )
}

function renderBlock(block: Block) {
  if ('p' in block) return h('p', inline(block.p))
  if ('ul' in block) return h('ul', block.ul.map((item) => h('li', inline(item))))
  const { head, rows } = block.table
  return h('table', [
    h('thead', h('tr', head.map((c) => h('th', c)))),
    h('tbody', rows.map((r) => h('tr', r.map((c) => h('td', c))))),
  ])
}

export default defineComponent({
  props: { doc: { type: Object as PropType<LegalDoc>, required: true } },
  setup(props) {
    return () =>
      h(LegalPage, { title: props.doc.title, updated: props.doc.updated }, () => [
        ...props.doc.intro.map(renderBlock),
        ...props.doc.sections.flatMap((section) => [
          h('h2', section.heading),
          ...section.blocks.map(renderBlock),
        ]),
      ])
  },
})
</script>
