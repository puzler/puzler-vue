import DOMPurify from 'dompurify'
import { API_URL } from './env'

// Render-time mirror of the server-side allowlist (api/app/services/html_sanitizer.rb).
// The server sanitizes authoritatively on save; this is defense-in-depth so a
// hypothetical stored payload still can't execute when we v-html the description.
const ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'strong', 'em', 'u', 's', 'a',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'img', 'br', 'hr',
]
const ALLOWED_ATTR = ['href', 'rel', 'target', 'src', 'alt']

function apiHost(): string | null {
  try {
    return new URL(API_URL).host
  } catch {
    return null
  }
}

function isAllowedImageSrc(src: string): boolean {
  try {
    const url = new URL(src)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.host === apiHost()
  } catch {
    return false
  }
}

let hookInstalled = false
function ensureHook(): void {
  if (hookInstalled) return
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const el = node as Element
    if (el.tagName === 'A' && el.getAttribute('href')) {
      el.setAttribute('rel', 'nofollow noopener noreferrer')
      el.setAttribute('target', '_blank')
    }
    // Only keep images we served ourselves — no hotlinking, no data:/javascript:.
    if (el.tagName === 'IMG' && !isAllowedImageSrc(el.getAttribute('src') ?? '')) {
      el.remove()
    }
  })
  hookInstalled = true
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  ensureHook()
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_ATTR: ['style'],
    ALLOW_DATA_ATTR: false,
  })
}
