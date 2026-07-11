import { describe, it, expect } from 'vitest'
import { PLAYER_SETTING_GROUPS, ENFORCEABLE_SETTING_GROUPS } from './playerSettingMeta'
import { DEFAULT_PLAYER_SETTINGS } from './playerSettings'

describe('playerSettingMeta', () => {
  it('covers every player setting exactly once (drift guard)', () => {
    const keys = PLAYER_SETTING_GROUPS.flatMap((g) => g.items.map((i) => i.key)).sort()
    expect(keys).toEqual(Object.keys(DEFAULT_PLAYER_SETTINGS).sort())
  })

  it('excludes collaboration settings from the enforceable list', () => {
    const keys = ENFORCEABLE_SETTING_GROUPS.flatMap((g) => g.items.map((i) => i.key))
    expect(keys).not.toContain('enableCollaborationMode')
    expect(keys).not.toContain('hideShareToken')
  })
})
