type UserSettingConstructor = {
  checkOnFinish?: boolean
  highlightConflicts?: boolean
  highlightPencilMarkConflicts?: boolean
  startPaused?: boolean
}

const DEFAULT_SETTINGS = {
  checkOnFinish: false,
  highlightConflicts: true,
  highlightPencilMarkConflicts: false,
  startPaused: true,
}

class UserSettings {
  checkOnFinish: boolean
  highlightConflicts: boolean
  highlightPencilMarkConflicts: boolean
  startPaused: boolean

  constructor({
    checkOnFinish = DEFAULT_SETTINGS.checkOnFinish,
    highlightConflicts = DEFAULT_SETTINGS.highlightConflicts,
    highlightPencilMarkConflicts = DEFAULT_SETTINGS.highlightPencilMarkConflicts,
    startPaused = DEFAULT_SETTINGS.startPaused,
  }: UserSettingConstructor = {}) {
    this.checkOnFinish = checkOnFinish
    this.highlightConflicts = highlightConflicts
    this.highlightPencilMarkConflicts = highlightPencilMarkConflicts
    this.startPaused = startPaused
  }

  static fromString(jsonString: string) {
    return new UserSettings(
      JSON.parse(jsonString)
    )
  }

  toJson(): string {
    return JSON.stringify({
      checkOnFinish: this.checkOnFinish,
      highlightConflicts: this.highlightConflicts,
      highlightPencilMarkConflicts: this.highlightPencilMarkConflicts,
      startPaused: this.startPaused,
    })
  }
}

export {
  UserSettings
}
