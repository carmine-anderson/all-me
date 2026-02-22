/**
 * Generates PWA icons from an inline SVG using only Node.js built-ins.
 * Writes proper PNG files with dark background to public/
 */

import { writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')

// Sizes needed
const sizes = [
  { name: 'web-app-manifest-192x192.png', size: 192 },
  { name: 'web-app-manifest-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-96x96.png', size: 96 },
]

for (const { name, size } of sizes) {
  // Write a sized SVG to a temp file
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="none">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#09090b"/>
  <text x="${size / 2}" y="${size * 0.72}" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.round(size * 0.56)}" font-weight="700" text-anchor="middle" fill="#10b981">A</text>
</svg>`

  const tmpSvg = `/tmp/allme-icon-${size}.svg`
  writeFileSync(tmpSvg, svg)

  const outPath = `${publicDir}/${name}`

  try {
    // macOS has qlmanage but it's unreliable for this. Use sips with SVG input.
    // sips can convert SVG → PNG on macOS natively
    execSync(`sips -s format png "${tmpSvg}" --out "${outPath}" --resampleHeightWidth ${size} ${size} 2>/dev/null`, { stdio: 'pipe' })
    console.log(`✅ Generated ${name} (${size}x${size})`)
  } catch (e) {
    console.error(`❌ Failed ${name}: ${e.message}`)
  }
}

console.log('\nDone! Check public/ for the generated icons.')
