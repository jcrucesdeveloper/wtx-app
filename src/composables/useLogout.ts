import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore, type LogoutCheck } from '@/stores/auth'

/**
 * Logging out, with its confirmation — shared so every place that offers it
 * (Configuration, your own profile) warns about the same things.
 */
export function useLogout() {
  const { t } = useI18n()
  const auth = useAuthStore()

  const loggingOut = ref(false)

  /** The log-out confirmation, spelling out anything that won't be in the account afterwards. */
  function logoutMessage(check: LogoutCheck): string {
    const lines: string[] = []
    if (!check.synced) {
      lines.push(t(check.offline ? 'account.logoutOffline' : 'account.logoutSyncFailed'))
      if (check.unsyncedSessions) lines.push(t('account.logoutUnsyncedSessions', check.unsyncedSessions))
      lines.push(t('account.logoutUnsyncedChanges'))
    }
    if (check.activeWorkout) lines.push(t('account.logoutActiveWorkout'))
    if (check.deviceOnlySessions) lines.push(t('account.logoutDeviceOnly', check.deviceOnlySessions))
    const warned = !check.synced || check.activeWorkout
    if (!warned) lines.unshift(t('account.logoutConfirm'))
    else lines.push(t('account.logoutAnyway'))
    return lines.join('\n\n')
  }

  /** Resolves `true` once logged out, `false` if the user backed out of the confirmation. */
  async function logout(): Promise<boolean> {
    if (loggingOut.value) return false
    loggingOut.value = true
    try {
      const check = await auth.checkLogout()
      if (!confirm(logoutMessage(check))) return false
      await auth.signOut()
      return true
    } finally {
      loggingOut.value = false
    }
  }

  return { logout, loggingOut }
}
