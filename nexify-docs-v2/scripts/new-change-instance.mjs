import fs from 'fs-extra'
import path from 'path'
import { execSync } from 'child_process'
import slugify from 'slugify'

function arg(name, def='') {
  const i = process.argv.indexOf(`--${name}`)
  if (i !== -1 && process.argv[i+1]) return process.argv[i+1]
  return def
}

const title = arg('title')
const scope = (arg('scope') || 'backend').toLowerCase()
const refs = (arg('refs') || '').split(',').map(s => s.trim()).filter(Boolean)
const body = arg('body')

if (!title) {
  console.error('Missing --title')
  process.exit(1)
}

const now = new Date()
const iso = now.toISOString()
const y = iso.slice(0,4)
const m = iso.slice(5,7)
const d = iso.slice(8,10)
const ts = iso.replace(/[:]/g,'-')

let authorName = ''
let authorEmail = ''
try { authorName = execSync('git config user.name').toString().trim() } catch {}
try { authorEmail = execSync('git config user.email').toString().trim() } catch {}

const base = path.join('pages','changelog','inst', y, m, d)
await fs.mkdirp(base)

const file = path.join(base, `${ts}--${slugify(title, {lower:true, strict:true})}.md`)

const fm = `---
title: "${title.replace(/"/g,'\"')}"
date: ${iso}
scope: ${scope}
author: "${authorName}${authorEmail ? ' <'+authorEmail+'>' : ''}"
tags: [changelog, ${scope}]
refs: ${JSON.stringify(refs)}
---`

const md = `${fm}

# ${title}

${body ? body : '_no body provided_'} 
`

await fs.writeFile(file, md, 'utf8')
console.log('Wrote', file)
