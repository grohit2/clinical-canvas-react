import fs from 'fs-extra'
import path from 'path'

function arg(name, def='') {
  const i = process.argv.indexOf(`--${name}`)
  if (i !== -1 && process.argv[i+1]) return process.argv[i+1]
  return def
}
const fileArg = arg('file')
const note = arg('note', '(no note)')
const scope = arg('scope','backend')

const now = new Date()
const iso = now.toISOString()
const y = iso.slice(0,4)
const m = iso.slice(5,7)
const d = iso.slice(8,10)
const ts = iso.replace(/[:]/g,'-')

const dir = path.join('pages','traces', y, m, d)
await fs.mkdirp(dir)
const f = path.join(dir, `${ts}.md`)

const md = `---
title: "Trace ${iso}"
date: ${iso}
scope: ${scope}
file: ${fileArg}
---

# Trace

- File: \`${fileArg}\`
- Note: ${note}
`

await fs.writeFile(f, md, 'utf8')
console.log('Wrote', f)
