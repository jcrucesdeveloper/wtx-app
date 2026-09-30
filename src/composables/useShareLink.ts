import { ref } from 'vue'
import { canShare, shareLink } from '@/services/nativeShare'

/** How long "Link copied" stays up after falling back to the clipboard. */
const COPIED_MS = 1500

/**
 * Shares a link with the native share sheet where there is one, else copies
 * it — the same fallback `FollowMeCard` offers as two separate buttons.
 */
export function useShareLink() {
  const copied = ref(false)

  async function share(payload: { url: string; text?: string }) {
    if (canShare()) {
      try {
        await shareLink(payload)
      } catch {
        /* dismissed */
      }
      return
    }
    try {
      await navigator.clipboard.writeText(payload.url)
      copied.value = true
      setTimeout(() => (copied.value = false), COPIED_MS)
    } catch {
      /* clipboard blocked */
    }
  }

  return { share, copied }
}
