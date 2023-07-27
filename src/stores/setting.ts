import { ref } from 'vue';
import { defineStore } from 'pinia'
import { UserSettings } from '@/types'

const useSettingStore = defineStore('setting', () => {
  const LOCAL_STORAGE_SETTINGS_KEY = 'puzler-user-settings'

  const strFromStorage = localStorage.getItem(
    LOCAL_STORAGE_SETTINGS_KEY
  )

  const userSettings = ref(
    ((): UserSettings => {
      if (!strFromStorage) return new UserSettings()

      return UserSettings.fromString(strFromStorage)
    })(),
  );

  function saveSettings() {
    localStorage.setItem(
      LOCAL_STORAGE_SETTINGS_KEY,
      userSettings.value.toJson(),
    )
  }

  return {
    userSettings,
    saveSettings,
  }
})

export default useSettingStore
