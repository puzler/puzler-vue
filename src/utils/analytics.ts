// Cookieless, privacy-friendly analytics (Plausible). Loads ONLY in a
// production build when VITE_PLAUSIBLE_DOMAIN is set, so nothing runs in dev
// or until the account exists. Plausible sets no cookies and tracks no
// personal data, so no consent banner is required.
export function initAnalytics(): void {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN
  if (!import.meta.env.PROD || !domain) return

  const script = document.createElement('script')
  script.defer = true
  script.dataset.domain = domain
  // The "hash" + "outbound-links" auto-extension also tracks SPA route changes.
  script.src = 'https://plausible.io/js/script.hash.outbound-links.js'
  document.head.appendChild(script)
}
