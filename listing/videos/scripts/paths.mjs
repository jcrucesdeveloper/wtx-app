import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

export const VIDEOS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const REPO_ROOT = resolve(VIDEOS_DIR, '..', '..')
export const BUILD_DIR = join(VIDEOS_DIR, 'build')
export const OUT_DIR = join(VIDEOS_DIR, 'out')

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

/** Google Chrome (not Chromium) — it ships the H.264 decoder the compositions don't need, but matches what reviewers see. */
export const CHROME = CHROME_CANDIDATES.find((p) => existsSync(p)) ?? CHROME_CANDIDATES[0]
