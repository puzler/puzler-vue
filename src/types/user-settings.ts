type UserSettingConstructor = {
  checkOnFinish?: boolean
  highlightConflicts?: boolean
  highlightPencilMarkConflicts?: boolean
}

const DEFAULT_SETTINGS = {
  checkOnFinish: false,
  highlightConflicts: true,
  highlightPencilMarkConflicts: false,
}

class UserSettings {
  checkOnFinish: boolean
  highlightConflicts: boolean
  highlightPencilMarkConflicts: boolean

  constructor({
    checkOnFinish = DEFAULT_SETTINGS.checkOnFinish,
    highlightConflicts = DEFAULT_SETTINGS.highlightConflicts,
    highlightPencilMarkConflicts = DEFAULT_SETTINGS.highlightPencilMarkConflicts,
  }: UserSettingConstructor = {}) {
    this.checkOnFinish = checkOnFinish
    this.highlightConflicts = highlightConflicts
    this.highlightPencilMarkConflicts = highlightPencilMarkConflicts
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
    })
  }
}

export {
  UserSettings
}
