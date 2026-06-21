#!/usr/bin/env node
/**
 * scripts/update-given-params.mjs
 *
 * Uses DeepSeek to regenerate `givenParams` for every example in shapes-data.ts.
 * Only param keys that are EXPLICITLY stated as known values in the problem
 * are included — the rest are left for the student to discover/calculate.
 *
 * Usage:
 *   node scripts/update-given-params.mjs
 *
 * Reads DEEPSEEK_API_KEY from .env.local (or process.env).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const FILE = path.join(ROOT, 'src/lib/geo-ai/data/shapes-data.ts')

// ── Env loading ───────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
}
loadEnv()

const API_KEY = process.env.DEEPSEEK_API_KEY
const BASE_URL = 'https://api.deepseek.com'
const MODEL = 'deepseek-chat'

if (!API_KEY) {
  console.error('Error: DEEPSEEK_API_KEY not found in .env.local or environment.')
  process.exit(1)
}

// ── DeepSeek call ─────────────────────────────────────────────────────────────
const SYSTEM = `You are a Vietnamese math education expert.
Given a Vietnamese geometry problem, identify which parameter keys are EXPLICITLY STATED as given/known values.
Return ONLY a JSON array of key strings. Example: ["a","h"] or ["r"] or ["a","b","h"]
Rules:
- Include a key only if its value is directly given in the problem text
- Do NOT include keys the student must calculate or find
- If the problem says "find the height" → height key is NOT given
- If the problem says "height = 4 cm" → height key IS given`

async function getGivenParams(id, title, description, prompt, paramKeys) {
  const userMsg = `Example id: ${id}
Title: ${title}
Description: ${description}
Problem: ${prompt}
Available param keys: ${JSON.stringify(paramKeys)}

Which keys are explicitly given in this problem?`

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userMsg },
      ],
      max_tokens: 100,
      temperature: 0,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content?.trim() ?? '[]'

  // Extract JSON array from response (handle any surrounding text)
  const match = text.match(/\[.*?\]/)
  if (!match) return paramKeys // fallback: all params given
  try {
    const parsed = JSON.parse(match[0])
    // Filter to only valid keys from paramKeys
    return parsed.filter(k => paramKeys.includes(k))
  } catch {
    return paramKeys
  }
}

// ── Parse examples from file text ─────────────────────────────────────────────
function parseExamples(content) {
  const examples = []

  // Find examples array section
  const examplesStart = content.indexOf('examples: [')
  if (examplesStart === -1) throw new Error('Could not find examples: [ in file')

  // Find each example by id: pattern
  const idPattern = /id:\s*'([^']+)'/g
  let m
  while ((m = idPattern.exec(content)) !== null) {
    if (m.index < examplesStart) continue

    const id = m[1]
    // Find the example block: scan backward from id to find opening {
    // and forward to find closing }
    let blockStart = m.index
    while (blockStart > 0 && content[blockStart] !== '{') blockStart--

    // Find the matching closing brace
    let depth = 0
    let blockEnd = blockStart
    while (blockEnd < content.length) {
      if (content[blockEnd] === '{') depth++
      else if (content[blockEnd] === '}') {
        depth--
        if (depth === 0) { blockEnd++; break }
      }
      blockEnd++
    }

    const block = content.slice(blockStart, blockEnd)

    // Extract fields
    const titleM = block.match(/title:\s*'([^']*)'/)
    const descM = block.match(/description:\s*'([^']*)'/)
    const promptM = block.match(/prompt:\s*'([^']*)'/)

    // Extract params keys
    const paramsM = block.match(/params:\s*\{([^}]*)\}/)
    const paramKeys = []
    if (paramsM) {
      const keyMatches = paramsM[1].matchAll(/(\w+):/g)
      for (const km of keyMatches) paramKeys.push(km[1])
    }

    // Check existing givenParams
    const givenM = block.match(/givenParams:\s*(\[[^\]]*\])/)
    const existingGiven = givenM ? givenM[1] : null

    examples.push({
      id,
      title: titleM?.[1] ?? id,
      description: descM?.[1] ?? '',
      prompt: promptM?.[1] ?? '',
      paramKeys,
      existingGiven,
      blockStart,
      blockEnd,
      block,
    })
  }

  return examples
}

// ── Patch file text ───────────────────────────────────────────────────────────
function patchGivenParams(content, id, newGiven) {
  const givenStr = `[${newGiven.map(k => `'${k}'`).join(', ')}]`

  // Find the example block by id
  const idIdx = content.indexOf(`id: '${id}'`)
  if (idIdx === -1) return content

  let blockStart = idIdx
  while (blockStart > 0 && content[blockStart] !== '{') blockStart--

  let depth = 0
  let blockEnd = blockStart
  while (blockEnd < content.length) {
    if (content[blockEnd] === '{') depth++
    else if (content[blockEnd] === '}') {
      depth--
      if (depth === 0) { blockEnd++; break }
    }
    blockEnd++
  }

  const block = content.slice(blockStart, blockEnd)

  let newBlock
  if (block.includes('givenParams:')) {
    // Replace existing givenParams line
    newBlock = block.replace(/givenParams:\s*\[[^\]]*\]/, `givenParams: ${givenStr}`)
  } else if (block.includes('params:')) {
    // Insert after params: {...} closing brace
    newBlock = block.replace(/(params:\s*\{[^}]*\}),?/, `$1,\n      givenParams: ${givenStr},`)
  } else {
    return content
  }

  return content.slice(0, blockStart) + newBlock + content.slice(blockEnd)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  let content = fs.readFileSync(FILE, 'utf8')
  const examples = parseExamples(content)

  const toProcess = examples.filter(e => e.paramKeys.length > 0)
  console.log(`Found ${examples.length} examples, ${toProcess.length} have params.\n`)

  let updated = 0
  for (const ex of toProcess) {
    process.stdout.write(`  [${ex.id}] params=${JSON.stringify(ex.paramKeys)} → `)

    let given
    try {
      given = await getGivenParams(ex.id, ex.title, ex.description, ex.prompt, ex.paramKeys)
    } catch (err) {
      console.error(`FAILED: ${err.message}`)
      continue
    }

    const givenStr = JSON.stringify(given)
    const existingStr = ex.existingGiven ?? 'none'
    const changed = givenStr !== ex.existingGiven?.replace(/'/g, '"')

    console.log(`${givenStr}${changed ? ' ✓' : ' (unchanged)'}`)

    if (changed) {
      content = patchGivenParams(content, ex.id, given)
      updated++
    }

    // Rate limit: 1 req / 200ms
    await new Promise(r => setTimeout(r, 200))
  }

  fs.writeFileSync(FILE, content, 'utf8')
  console.log(`\nDone. Updated ${updated} examples.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
