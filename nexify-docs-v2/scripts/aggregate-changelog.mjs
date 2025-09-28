import fs from 'fs-extra'
import path from 'path'
import { globby } from 'globby'
import matter from 'gray-matter'

function arg(name, def='') {
  const i = process.argv.indexOf(`--${name}`)
  if (i !== -1 && process.argv[i+1]) return process.argv[i+1]
  return def
}
function pad(n){ return n.toString().padStart(2,'0') }

const dateArg = arg('date') // YYYY-MM-DD
const now = new Date()
const y = dateArg ? dateArg.slice(0,4) : String(now.getUTCFullYear())
const m = dateArg ? dateArg.slice(5,7) : pad(now.getUTCMonth()+1)
const d = dateArg ? dateArg.slice(8,10) : pad(now.getUTCDate())
const dayStr = `${y}-${m}-${d}`

async function readInstancesForDay(y,m,d){
  const pattern = `pages/changelog/inst/${y}/${m}/${d}/*.md`
  const files = await globby(pattern)
  const items = []
  for (const f of files) {
    const raw = await fs.readFile(f,'utf8')
    const { data, content } = matter(raw)
    items.push({ file:f, data, content })
  }
  items.sort((a,b)=> String(a.data.date||'').localeCompare(String(b.data.date||'')))
  return items
}

function groupByScope(items){
  const scopes = {Frontend:[], Backend:[], Architecture:[], Infra:[], Users:[]}
  for (const it of items){
    const s = String(it.data.scope||'').toLowerCase()
    const key = s.startsWith('front') ? 'Frontend' :
                s.startsWith('back') ? 'Backend' :
                s.startsWith('arch') ? 'Architecture' :
                s.startsWith('infra') ? 'Infra' :
                s.startsWith('user') ? 'Users' : 'Backend'
    scopes[key].push(it)
  }
  return scopes
}

async function writeDay(items){
  const dayFile = path.join('pages','changelog','days', `${dayStr}.md`)
  const scopes = groupByScope(items)
  function render(list){
    if (list.length===0) return '- _no entries_'
    return list.map(it=>{
      const t = it.data.title || '(no title)'
      const hhmm = (it.data.date||'').slice(11,16)
      const refs = (it.data.refs||[]).join(', ')
      const author = it.data.author ? ` — ${it.data.author}` : ''
      const refStr = refs ? ` (${refs})` : ''
      return `- ${hhmm} ${t}${refStr}${author}`
    }).join('\n')
  }

  const md = `---
title: "${dayStr}"
role: lead-dev
status: approved
owner: maintainers
lastReviewed: ${dayStr}
tags: [changelog, day]
date: ${dayStr}
---

# ${dayStr}

## Frontend
${render(scopes.Frontend)}

## Backend
${render(scopes.Backend)}

## Architecture
${render(scopes.Architecture)}

## Infra
${render(scopes.Infra)}

## Users
${render(scopes.Users)}
`
  await fs.mkdirp(path.dirname(dayFile))
  await fs.writeFile(dayFile, md, 'utf8')
  return dayFile
}

async function writeMonth(y,m){
  const pattern = `pages/changelog/days/${y}-${m}-*.md`
  const files = await globby(pattern)
  files.sort()
  const links = files.map(f=>{
    const name = path.basename(f, '.md')
    return `- [${name}](/changelog/days/${name})`
  }).join('\n')

  const monthFile = path.join('pages','changelog','months', `${y}-${m}.md`)
  const md = `---
title: "${y}-${m}"
role: lead-dev
status: approved
owner: maintainers
lastReviewed: ${dayStr}
tags: [changelog, month]
month: "${y}-${m}"
---

# ${y}-${m}

Daily logs:
${links || '- _no days yet_'} 
`
  await fs.mkdirp(path.dirname(monthFile))
  await fs.writeFile(monthFile, md, 'utf8')
  return monthFile
}

async function writeYear(y){
  const pattern = `pages/changelog/months/${y}-*.md`
  const files = await globby(pattern)
  files.sort()
  const links = files.map(f=>{
    const name = path.basename(f, '.md')
    return `- [${name}](/changelog/months/${name})`
  }).join('\n')

  const yearFile = path.join('pages','changelog','years', `${y}.md`)
  const md = `---
title: "${y}"
role: lead-dev
status: approved
owner: maintainers
lastReviewed: ${dayStr}
tags: [changelog, year]
year: "${y}"
---

# ${y}

Monthly logs:
${links || '- _no months yet_'} 
`
  await fs.mkdirp(path.dirname(yearFile))
  await fs.writeFile(yearFile, md, 'utf8')
  return yearFile
}

const items = await readInstancesForDay(y,m,d)
await writeDay(items)
await writeMonth(y,m)
await writeYear(y)

console.log('Aggregated:', dayStr)
