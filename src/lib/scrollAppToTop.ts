/**
 * Scrolls the app's content area (`App.vue`'s `.app-content`, the one
 * scroller) back to the top. The router can't: it only restores the window's
 * scroll, so without this a page opened from deep in the feed would start
 * at the feed's scroll offset.
 */
export function scrollAppToTop() {
  document.querySelector('.app-content')?.scrollTo({ top: 0 })
}
