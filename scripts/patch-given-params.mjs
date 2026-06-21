#!/usr/bin/env node
/**
 * Patches givenParams into all examples in shapes-data.ts
 * Based on which params are explicitly stated in the prompt text.
 * 
 * Logic:
 * - Parse prompt to detect mentioned param values
 * - If a param's value appears near its Vietnamese keyword → it's given
 * - Fallback: all params = given (safe for 3D examples)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const FILE = path.join(ROOT, 'src/lib/geo-ai/data/shapes-data.ts')

// Vietnamese keywords that indicate a param is explicitly given in the problem
const PARAM_KEYWORDS = {
  a: ['chiều dài', 'cạnh đáy', 'cạnh', 'đáy lớn', 'đáy', 'đường kính', 'bán kính'],
  b: ['chiều rộng', 'cạnh bên', 'đáy nhỏ', 'rộng'],
  h: ['chiều cao', 'cao'],
  r: ['bán kính', 'radius', 'r =', 'r≈'],
  a2: ['góc', '°'],
}

function inferGivenParams(prompt, params) {
  if (!params || Object.keys(params).length === 0) return []
  
  const promptLower = prompt.toLowerCase()
  const given = []
  
  for (const [key, value] of Object.entries(params)) {
    const keywords = PARAM_KEYWORDS[key]
    if (!keywords) {
      // Unknown param key — assume given
      given.push(key)
      continue
    }
    
    const valueStr = String(value)
    // Check if any keyword + value appears in prompt
    const isExplicit = keywords.some(kw => {
      const kwLower = kw.toLowerCase()
      const idx = promptLower.indexOf(kwLower)
      if (idx === -1) return false
      // Check if the value appears within 20 chars of the keyword
      const nearby = promptLower.slice(Math.max(0, idx - 5), idx + kwLower.length + 20)
      return nearby.includes(valueStr)
    })
    
    if (isExplicit) given.push(key)
  }
  
  // If nothing detected, fall back to all params (safe)
  return given.length > 0 ? given : Object.keys(params)
}

let content = fs.readFileSync(FILE, 'utf8')

// Find all example objects and add givenParams
// Pattern: find `params: {` blocks inside examples array and add givenParams after
let modified = 0

// Use a regex to find example blocks and patch them
content = content.replace(
  /(\{\s*id:\s*'[^']+',[\s\S]*?prompt:\s*'([^']+)',\s*params:\s*(\{[^}]*\}),?\s*\})/g,
  (match, _full, prompt, paramsStr) => {
    // Already has givenParams?
    if (match.includes('givenParams')) return match
    
    // Parse params object
    const params = {}
    const paramMatches = paramsStr.matchAll(/(\w+):\s*([\d.]+)/g)
    for (const m of paramMatches) {
      params[m[1]] = parseFloat(m[2])
    }
    
    const given = inferGivenParams(prompt, params)
    if (given.length === 0) return match
    
    const givenStr = `[${given.map(k => `'${k}'`).join(', ')}]`
    modified++
    
    // Insert givenParams after params block
    return match.replace(
      /(params:\s*\{[^}]*\})(,?\s*\})/,
      `$1,\n      givenParams: ${givenStr},\n    $2`.replace(/,\s*,/, ',')
    )
  }
)

// Fix any double-comma or malformed closing
content = content.replace(/,\s*\n\s*,/g, ',\n')

fs.writeFileSync(FILE, content, 'utf8')
console.log(`Patched ${modified} examples with givenParams.`)
