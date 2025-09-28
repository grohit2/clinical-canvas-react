import fs from 'fs-extra'
import path from 'path'
import { globby } from 'globby'
import matter from 'gray-matter'
import semver from 'semver'

function arg(name, def='') {
  const i = process.argv.indexOf(`--${name}`)
  if (i !== -1 && process.argv[i+1]) return process.argv[i+1]
  return def
}

const version = arg('version')
const relName = arg('name', '')

if (!version || !semver.valid(version)) {
  console.error('Please provide a valid --version (e.g., 1.2.3)')
  process.exit(1)
}

const verDir = path.join('pages','changelog','versions')
await fs.mkdirp(verDir)
const verFiles = (await globby(`${verDir}/v*.md`)).map(f=>path.basename(f,'.md'))
const prev = verFiles
  .map(v => v.startsWith('v') ? v.slice(1) : v)
  .filter(v => semver.valid(v))
  .sort(semver.compare)
  .pop()

let since = '1970-01-01T00:00:00Z'
if (prev) {
  const prevRaw = await fs.readFile(path.join(verDir, `v${prev}.md`),'utf8')
  const { data } = matter(prevRaw)
  if (data && data.until) since = data.until
}

const instFiles = await globby(`pages/changelog/inst/**/*.md`)
const items = []
for (const f of instFiles) {
  const raw = await fs.readFile(f,'utf8')
  const { data, content } = matter(raw)
  const date = new Date(data.date || 0).toISOString()
  if (date > since) items.push({file:f, data, content})
}
items.sort((a,b)=> String(a.data.date||'').localeCompare(String(b.data.date||'')))

function group(items){
  const sections = {Frontend:[], Backend:[], Architecture:[], Infra:[], Users:[]}
  for (const it of items){
    const s = String(it.data.scope||'').toLowerCase()
    const key = s.startsWith('front') ? 'Frontend' :
                s.startsWith('back') ? 'Backend' :
                s.startsWith('arch') ? 'Architecture' :
                s.startsWith('infra') ? 'Infra' :
                s.startsWith('user') ? 'Users' : 'Backend'
    sections[key].push(it)
  }
  return sections
}

const sections = group(items)
function render(list){
  if (!list || list.length===0) return '- _no entries_'
  return list.map(it=>{
    const t = it.data.title || '(no title)'
    const day = (it.data.date||'').slice(0,10)
    const refs = (it.data.refs||[]).join(', ')
    return `- ${day} — ${t}${refs ? ' ('+refs+')' : ''}`
  }).join('\n')
}

const until = new Date().toISOString()
const verFile = path.join(verDir, `v${version}.md`)

const md = `---
title: "v${version}${relName ? ' — '+relName : ''}"
role: lead-dev
status: approved
owner: maintainers
lastReviewed: 2025-09-26
tags: [changelog, version]
since: ${since}
until: ${until}
version: ${version}
---

# v${version} ${relName}

## Frontend
${render(sections.Frontend)}

## Backend
${render(sections.Backend)}

## Architecture
${render(sections.Architecture)}

## Infra
${render(sections.Infra)}

## Users
${render(sections.Users)}
`

await fs.writeFile(verFile, md, 'utf8')
console.log('Wrote', verFile)
