// @vitest-environment jsdom
// DOMPurify is built and tested against jsdom (and real browsers); happy-dom
// mis-sanitizes it, so this file opts into jsdom to mirror production behavior.
import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from './sanitizeHtml'

// Default API_URL in tests is http://localhost:3000, so allowed images must
// live on localhost:3000.
describe('sanitizeHtml', () => {
  it('returns empty string for nullish input', () => {
    expect(sanitizeHtml('')).toBe('')
    expect(sanitizeHtml(null)).toBe('')
    expect(sanitizeHtml(undefined)).toBe('')
  })

  it('removes script tags', () => {
    expect(sanitizeHtml('<p>hi</p><script>alert(1)</script>')).toBe('<p>hi</p>')
  })

  it('strips event-handler attributes and inline styles', () => {
    expect(sanitizeHtml('<p onclick="x()" style="color:red">hi</p>')).toBe('<p>hi</p>')
  })

  it('drops javascript: links', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript')
  })

  it('marks safe links nofollow / noopener / new-tab', () => {
    const out = sanitizeHtml('<a href="https://example.com">x</a>')
    expect(out).toContain('rel="nofollow noopener noreferrer"')
    expect(out).toContain('target="_blank"')
  })

  it('keeps images served from our API host', () => {
    const out = sanitizeHtml('<img src="http://localhost:3000/blob/a.webp" alt="x">')
    expect(out).toContain('src="http://localhost:3000/blob/a.webp"')
  })

  it('drops foreign-host and data: images', () => {
    expect(sanitizeHtml('<img src="https://evil.example/a.png">')).not.toContain('<img')
    expect(sanitizeHtml('<img src="data:image/png;base64,AAAA">')).not.toContain('<img')
  })

  it('keeps allowed formatting tags', () => {
    const out = sanitizeHtml('<h1>T</h1><strong>b</strong><ul><li>x</li></ul><blockquote>q</blockquote>')
    expect(out).toContain('<h1>T</h1>')
    expect(out).toContain('<strong>b</strong>')
    expect(out).toContain('<ul><li>x</li></ul>')
    expect(out).toContain('<blockquote>q</blockquote>')
  })
})
