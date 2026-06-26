import { createConsumer } from '@rails/actioncable'
import { getToken } from '@/utils/tokenStorage'
import { getGuestToken } from '@/utils/guestIdentity'
import { WS_URL } from '@/utils/env'

// The single shared, authenticated ActionCable consumer. A browser can't set a
// header on the WS handshake, so the JWT (or, for guests, the guest token) rides
// the cable URL. The function form is re-evaluated on each (re)connect, so the
// current identity is always used. Exported separately from apolloClient so the
// presence store can open raw channels on the same socket without an import cycle.
export const cable = createConsumer(() => {
  const token = getToken()
  if (token) return `${WS_URL}/cable?token=${encodeURIComponent(token)}`
  return `${WS_URL}/cable?guest=${encodeURIComponent(getGuestToken())}`
})
