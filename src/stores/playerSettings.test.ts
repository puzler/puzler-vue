import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { usePlayerSettingsStore } from './playerSettings'

describe('playerSettings overrides', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('layers enforced values over user prefs in effective, leaving settings untouched', () => {
    const player = usePlayerSettingsStore()
    player.settings.highlightConflicts = true
    player.setOverrides({ highlightConflicts: false, hideTimer: true })

    expect(player.effective.highlightConflicts).toBe(false)
    expect(player.effective.hideTimer).toBe(true)
    expect(player.settings.highlightConflicts).toBe(true)
    expect(player.isEnforced('highlightConflicts')).toBe(true)
    expect(player.isEnforced('showRulesOnStart')).toBe(false)
  })

  it('never persists enforced values into the user prefs', async () => {
    const player = usePlayerSettingsStore()
    player.setOverrides({ checkOnFinish: false })
    await nextTick()

    const stored = JSON.parse(localStorage.getItem('puzler:player-settings') ?? '{}')
    expect(stored.checkOnFinish ?? true).toBe(true)
  })

  it('restores user prefs when overrides clear', () => {
    const player = usePlayerSettingsStore()
    player.settings.hideColors = true
    player.setOverrides({ hideColors: false })
    expect(player.effective.hideColors).toBe(false)
    player.clearOverrides()
    expect(player.effective.hideColors).toBe(true)
  })

  it('still persists genuine user changes made during a competition', async () => {
    const player = usePlayerSettingsStore()
    player.setOverrides({ hideTimer: true })
    player.settings.highlightSeen = true
    await nextTick()

    const stored = JSON.parse(localStorage.getItem('puzler:player-settings') ?? '{}')
    expect(stored.highlightSeen).toBe(true)
    expect(stored.hideTimer ?? false).toBe(false)
  })

  it('competition enforcement beats player-enabled math helpers', () => {
    // The math helpers gate on `effective`, so an enforced false must win even
    // when the player switched a helper on themselves.
    const player = usePlayerSettingsStore()
    player.settings.enableSumHelper = true
    player.settings.enableKillerHelper = true
    player.settings.enableSelectionCalculator = true
    player.setOverrides({
      enableSumHelper: false,
      enableKillerHelper: false,
      enableSelectionCalculator: false,
    })
    expect(player.effective.enableSumHelper).toBe(false)
    expect(player.effective.enableKillerHelper).toBe(false)
    expect(player.effective.enableSelectionCalculator).toBe(false)
    expect(player.isEnforced('enableSumHelper')).toBe(true)
  })

  it('reset clears user prefs but keeps enforcement', () => {
    const player = usePlayerSettingsStore()
    player.setOverrides({ hideTimer: true })
    player.reset()
    expect(player.effective.hideTimer).toBe(true)
  })
})
