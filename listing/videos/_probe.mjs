import puppeteer from 'puppeteer-core'
import { buildSeed } from './scripts/seed.mjs'
const S = process.argv[2]
const seed = buildSeed('../..')
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 443, height: 960, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
await page.evaluateOnNewDocument((seed) => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); for (const [k,v] of Object.entries(seed)) localStorage.setItem(k,v); sessionStorage.setItem('seeded','1') } }, seed)
await page.goto('http://localhost:5191/', { waitUntil: 'networkidle0' })
const w = (ms) => new Promise(r => setTimeout(r, ms))
let n = 0; const shot = async (l) => { await page.screenshot({ path: `${S}/explore/p${String(++n).padStart(2,'0')}-${l}.png` }) }
const dump = async (l) => console.log('== '+l+'\n'+(await page.$$eval('button, a, input, textarea, [role=button]', els => els.filter(e=>e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return `${e.tagName}.${e.className} "${(e.getAttribute('aria-label')||e.textContent||e.placeholder||'').trim().slice(0,30)}" @${Math.round(r.x+r.width/2)},${Math.round(r.y+r.height/2)}` }))).join('\n'))
await page.tap('a.tab[href="/sessions"]'); await w(1200); await shot('sessions'); await dump('sessions')
await page.tap('a.tab[href="/"]'); await w(800)
await page.tap('.add'); await w(900); await shot('load'); await dump('load')
await page.keyboard.press('Escape'); await page.goto('http://localhost:5191/routines/r-push', { waitUntil: 'networkidle0' }); await w(800); await shot('detail'); await dump('detail')
await page.goto('http://localhost:5191/menu', { waitUntil: 'networkidle0' }).catch(()=>{}); await w(800); await shot('config'); await dump('config')
await browser.close()
