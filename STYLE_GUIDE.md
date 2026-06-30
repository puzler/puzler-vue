# Puzler Style Guide — "Ink & Paper"

The reference for all UI work. Consult this before styling anything; update it (deliberately) when a decision changes.

## Personality

Crafted, clever, calm. A premium puzzle atelier — closer to a quality puzzle
magazine than a SaaS dashboard. The grid is always the hero; chrome frames it
and recedes.

## Core principles

1. **Hierarchy by surface, not borders.** Four levels, darkest frames lightest:
   Ink chrome → Canvas → Paper panels → White cards. The eye should always know
   where it is without reading a border.
2. **Two accents with strict jobs.** Indigo = *action* (buttons, active tools,
   links, focus). Amber = *spark* (cell selection, active nav indicator) — used
   sparingly, never for buttons. One color doing every job is what makes UIs bland.
3. **One display font, used sparingly.** Space Grotesk for brand moments and
   digits; Inter does the quiet work.
4. **Warm, not gray.** Neutrals lean warm (paper, not slate). Avoid default
   Tailwind cool grays for surfaces and borders.

## Color tokens

Defined in `src/style.css` under `@theme` (Tailwind v4), usable as
`bg-ink`, `text-soft`, `border-line`, etc.

| Token | Hex | Role |
|---|---|---|
| `ink` | `#212B42` | Navbar / dark chrome background |
| `ink-2` | `#2F3C5C` | Hover/raised state on ink |
| `paper` | `#F4F2ED` | Panel & toolbar background |
| `canvas` | `#EAE7E0` | Grid canvas (darkest light surface) |
| `surface` | `#FFFFFF` | Cards, inputs, numpad keys, modals, the grid itself |
| `line` | `#E3E0D8` | Borders/dividers on light surfaces |
| `ink-text` | `#232B3D` | Primary text on light surfaces |
| `soft` | `#5C6475` | Secondary text, section labels |
| `faint` | `#9097A6` | Placeholders, disabled, empty states |
| `action` | `#4F46E5` | Primary buttons, active tool, links, focus rings |
| `action-deep` | `#4338CA` | Action hover |
| `action-tint` | `#EEF0FE` | Active tool row bg, subtle action fills |
| `spark` | `#F0A93B` | Active nav underline, selection accents |
| `spark-tint` | `#FBEED3` | Selected cell fill |

Semantic: danger `#DC2626` (red-600), success `#15803D` (green-700). Text on
ink: white primary, `#9AA3B8` secondary.

## Typography

- **Display — Space Grotesk** (500/600/700): wordmark, page titles, modal
  titles, grid digits, numpad digits. Token: `font-display`.
- **UI — Inter** (400/500/600): everything else. Token: `font-sans` (default).
- Loaded via Google Fonts in `index.html`.
- Section labels: 10–11px, weight 600, uppercase, `tracking-widest`, color `soft`.
- Sentence case everywhere (buttons, titles, labels) — section labels are the
  only uppercase element.
- Digits use `tabular-nums` wherever they align (grid, numpad, timers).

## Component recipes

- **NavBar**: `bg-ink`; wordmark `font-display` bold white; links `#9AA3B8`,
  hover white + `bg-ink-2`; active link white with 2px `spark` bottom border;
  Sign up = primary button.
- **Primary button**: `bg-action` white text, hover `bg-action-deep`,
  `rounded-lg`, weight 500.
- **Ghost button** (on paper): `text-soft`, hover `bg-line/60 text-ink-text`.
- **Danger button**: `bg-red-600` white, hover `bg-red-700`.
- **Inputs**: `bg-surface border-line rounded-md`, text `ink-text`, placeholder
  `faint`, focus `border-action` (no ring).
- **Panels** (tool selector, control box, numpad): `bg-paper`, `border-line`
  dividers.
- **Tool list item**: default `text-ink-text hover:bg-line/60`; active
  `bg-action-tint text-action font-medium`.
- **Numpad keys**: `bg-surface border-line`, digits in `font-display`,
  hover `border-action text-action`.
- **Toolbar icon button**: 32px square (`w-8 h-8`), `bg-surface border-line
  rounded-lg`, icon 18px `text-soft`; hover `text-action border-action`.
  Destructive variant hovers red (`text-red-600 border-red-400 bg-red-50`).
  Always pair with `title` + `aria-label` since there's no visible text.
- **Mode switch** (Setting/Solving): labels on both sides of an indigo
  `rounded-full` track with a sliding white knob (200ms ease-out). Active
  label `text-ink-text font-semibold`, inactive `text-soft`; labels are
  clickable to jump directly to a mode. Track uses `role="switch"` +
  `aria-checked`. Lives centered in the puzzle toolbar.
- **Modals**: use `BaseModal` (`components/ui/BaseModal.vue`) — never hand-roll
  the Teleport/backdrop. `variant="center"` for small dialogs, `variant="sheet"`
  for content-heavy ones (full-screen on mobile, centered card on desktop). Card
  is `bg-surface rounded-2xl shadow-xl`, title in `font-display` semibold,
  overlay `bg-black/40`.
- **Grid**: white surface on `canvas` bg; heavy lines `ink-text`; light lines
  `#D8D4CA`; selected cells `spark-tint` fill with `spark` edge; given digits
  `ink-text`; entered digits `action`.

## Responsive / mobile-first

The app must work well on phones. Design and **verify** every view, modal, and
tab at mobile widths (≤430px) before it's done — not as a retrofit.

- **Breakpoint:** `md:` (768px) is the canonical mobile↔desktop line (matches the
  `useIsMobile` composable). Prefer pure-CSS visibility (`hidden md:flex` /
  `md:hidden`) over JS layout swaps — `useIsMobile` is `onMounted`-gated and
  flashes the wrong layout on first paint.
- **Page padding:** `p-4 sm:p-6 lg:p-8` — never a bare `p-8`.
- **Primitives (don't reinvent):**
  - `ui/BaseModal` — modal chrome with `center`/`sheet` variants + `size`
    presets; never hard-code a `w-NN` wider than ~320px.
  - `ui/FilterSheet` — slide-up bottom sheet for mobile-only secondary UI.
  - `ui/FilterPanel` — a list page's filters from one slot: desktop sidebar +
    mobile sheet.
  - `listing/MobileFilterButton` — the `md:hidden` trigger that opens the sheet.
  - **Tab bars:** `overflow-x-auto whitespace-nowrap` so they scroll, never wrap.
- **Verify** with the preview MCP at 320 / 375 / 390 / 430 and the 768 boundary:
  no horizontal overflow (`scrollWidth <= innerWidth`) and screenshot.

## Motion

- Color/hover transitions: 150ms ease-out.
- Panel expand/collapse: 300ms ease-in-out width (existing pattern).
- No motion on text color alone; never animate layout on keystroke paths.

## Don'ts

- No pure white panels floating on white (the pre-redesign failure mode).
- No amber buttons; no indigo cell selections.
- No new grays — use the token scale.
- No third accent color without updating this guide first.
