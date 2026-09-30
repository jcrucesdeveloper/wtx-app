import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import type { Router } from 'vue-router'
import { deepLinkToRoute } from '@/lib/publicUrl'

/** The same URL arriving twice this quickly (launch URL + event) is one tap, not two. */
const DUPLICATE_WINDOW_MS = 2000

/**
 * Routes universal links (iOS) / app links (Android) on the public host into
 * the app: `https://<host>/social/follow?follow=…` opens the follow screen,
 * `https://<host>/auth/callback#access_token=…` finishes sign-up, and so on.
 * Auth links go through the same routes, whose views hand the URL to Supabase.
 *
 * No-op on the web, where the browser already opened the right route.
 */
export function initDeepLinks(router: Router) {
  if (!Capacitor.isNativePlatform()) return

  let lastUrl = ''
  let lastAt = 0

  function open(url: string | undefined) {
    if (!url) return
    const now = Date.now()
    if (url === lastUrl && now - lastAt < DUPLICATE_WINDOW_MS) return
    lastUrl = url
    lastAt = now
    const target = deepLinkToRoute(url)
    if (target) void router.push(target)
  }

  void CapacitorApp.addListener('appUrlOpen', ({ url }) => open(url))
  // A cold start from a link: the event may have fired before this listener existed.
  CapacitorApp.getLaunchUrl()
    .then((launch) => open(launch?.url))
    .catch(() => {})
}
