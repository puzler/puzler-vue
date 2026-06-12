// Legal documents as structured content so the renderer stays tiny and each
// document lives in one readable, reviewable file. An inline segment is plain
// text or a link; a paragraph is a string (common case) or segments (when it
// contains links).
export type Inline = string | { text: string; href: string }
export type Paragraph = string | Inline[]

export type Block =
  | { p: Paragraph }
  | { ul: Paragraph[] }
  | { table: { head: string[]; rows: string[][] } }

export interface Section {
  heading: string
  blocks: Block[]
}

export interface LegalDoc {
  title: string
  updated: string
  intro: Block[]
  sections: Section[]
}
