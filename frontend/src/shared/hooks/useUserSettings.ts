import {
  clearUserSettingsCache,
  getCachedUserSettings,
  getUserSettingsFromServer,
  removeUserSetting,
  saveUserSetting,
  updateUserSettings,
  useUserSettingsStore,
} from '../stores/userSettingsStore'

export function useUserSettings() {
  const loading = useUserSettingsStore((state) => state.loading)
  const error = useUserSettingsStore((state) => state.error)
  const userSettingsCache = useUserSettingsStore((state) => state.cache)

  return {
    loading,
    error,
    get: getUserSettingsFromServer,
    save: saveUserSetting,
    remove: removeUserSetting,
    update: updateUserSettings,
    getCached: getCachedUserSettings,
    clearCache: clearUserSettingsCache,
    userSettingsCache,
  }
}
