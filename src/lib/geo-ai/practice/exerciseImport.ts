import { matchingAnswerFromPairs, parseMatchingPairs, type MatchingPair } from './matching'

export type ExerciseQuestionType = 'choice' | 'blank' | 'matching'
export type ExerciseTopic = 'recognition' | 'objects' | 'formulas' | 'self' | 'custom'

export type ExerciseDraft = {
  title: string
  questionType: ExerciseQuestionType
  prompt: string
  options?: string[] | MatchingPair[]
  answer: string
  topic: ExerciseTopic
}

export function normalizeExerciseType(value: unknown): ExerciseQuestionType {
  const text = String(value ?? '').trim().toLowerCase()
  if (['blank', 'fill', 'fill_blank', 'fill-in', 'dien', 'điền', 'tu_luan', 'tự luận'].includes(text)) return 'blank'
  if (['matching', 'match', 'ghep cap', 'ghép cặp', 'ghep', 'ghép'].includes(text)) return 'matching'
  return 'choice'
}

export function normalizeExerciseTopic(value: unknown): ExerciseTopic {
  const text = String(value ?? '').trim().toLowerCase()
  if (['recognition', 'dau_hieu', 'dấu hiệu', 'nhan_biet', 'nhận biết'].includes(text)) return 'recognition'
  if (['objects', 'doi_tuong', 'đối tượng', 'object'].includes(text)) return 'objects'
  if (['formulas', 'formula', 'cong_thuc', 'công thức'].includes(text)) return 'formulas'
  if (['self', 'tu_danh_gia', 'tự đánh giá'].includes(text)) return 'self'
  return 'custom'
}

function splitOptions(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean)
    return items.length > 0 ? items : undefined
  }
  const text = String(value ?? '').trim()
  if (!text) return undefined
  const items = text.split(/\s*[|;]\s*|\r?\n/).map((item) => item.trim()).filter(Boolean)
  return items.length > 0 ? items : undefined
}

function matchingPairsFromUnknown(value: unknown, index: number): MatchingPair[] | undefined {
  if (Array.isArray(value)) {
    if (value.every((item) => item && typeof item === 'object' && 'left' in item && 'right' in item)) {
      return parseMatchingPairs(
        value.map((item) => `${(item as MatchingPair).left} => ${(item as MatchingPair).right}`),
        `Dòng ${index + 1}`,
      )
    }
    return parseMatchingPairs(value.map((item) => String(item)), `Dòng ${index + 1}`)
  }
  const text = String(value ?? '').trim()
  if (!text) return undefined
  return parseMatchingPairs(text.split(/\r?\n|[|;]/).map((item) => item.trim()).filter(Boolean), `Dòng ${index + 1}`)
}

function exerciseFromRaw(raw: Record<string, unknown>, index: number): ExerciseDraft {
  const title = String(raw.title ?? raw.tieuDe ?? raw['tiêu đề'] ?? `Bài tập ${index + 1}`).trim()
  const prompt = String(raw.prompt ?? raw.question ?? raw.cauHoi ?? raw['câu hỏi'] ?? '').trim()
  const rawAnswer = String(raw.answer ?? raw.dapAn ?? raw['đáp án'] ?? '').trim()
  const questionType = normalizeExerciseType(raw.questionType ?? raw.type ?? raw.loai ?? raw['loại'])
  const topic = normalizeExerciseTopic(raw.topic ?? raw.chuDe ?? raw['chủ đề'])

  if (!prompt) throw new Error(`Dòng ${index + 1} thiếu câu hỏi.`)

  if (questionType === 'matching') {
    const pairs = matchingPairsFromUnknown(raw.options ?? raw.choices ?? raw.luaChon ?? raw['lựa chọn'] ?? raw.pairs, index)
    if (!pairs) throw new Error(`Dòng ${index + 1} matching cần danh sách cặp.`)
    return { title, questionType, prompt, options: pairs, answer: rawAnswer || matchingAnswerFromPairs(pairs), topic }
  }

  if (!rawAnswer) throw new Error(`Dòng ${index + 1} thiếu đáp án.`)

  const options = splitOptions(raw.options ?? raw.choices ?? raw.luaChon ?? raw['lựa chọn'])
  if (questionType === 'choice' && (!options || options.length !== 4)) {
    throw new Error(`Dòng ${index + 1} là trắc nghiệm nên cần đúng 4 lựa chọn.`)
  }

  return { title, questionType, prompt, options, answer: rawAnswer, topic }
}

function parseCsv(text: string): Record<string, unknown>[] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    const next = text[index + 1]
    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index++
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index++
      row.push(cell)
      if (row.some((item) => item.trim())) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  row.push(cell)
  if (row.some((item) => item.trim())) rows.push(row)

  const [headerRow, ...dataRows] = rows
  if (!headerRow) return []
  const headers = headerRow.map((header) => header.trim())
  return dataRows.map((dataRow) => Object.fromEntries(
    headers.map((header, index) => [header, dataRow[index] ?? '']),
  ))
}

function cleanBracketLine(line: string): string {
  const trimmed = line.trim()
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return trimmed.slice(1, -1).trim()
  return trimmed
}

function txtTypeFromLine(line: string): ExerciseQuestionType | null {
  const text = line.trim().toLowerCase()
  if (['choice', 'trac nghiem', 'trắc nghiệm', 'tn', 'multiple choice'].includes(text)) return 'choice'
  if (['blank', 'dien', 'điền', 'dien khuyet', 'điền khuyết', 'fill', 'fill blank'].includes(text)) return 'blank'
  if (['matching', 'match', 'ghep cap', 'ghép cặp', 'ghep', 'ghép'].includes(text)) return 'matching'
  return null
}

export function parseTxtBlocks(text: string): ExerciseDraft[] {
  const lines = text.split(/\r?\n/).map(cleanBracketLine).filter(Boolean)
  const drafts: ExerciseDraft[] = []
  let index = 0

  while (index < lines.length) {
    const typeRaw = lines[index++] ?? ''
    const questionType = txtTypeFromLine(typeRaw) ?? normalizeExerciseType(typeRaw)
    const prompt = lines[index++]?.trim()
    if (!prompt) throw new Error(`Block ${drafts.length + 1} thiếu câu hỏi.`)

    if (questionType === 'blank') {
      const answer = lines[index++]?.trim()
      if (!answer) throw new Error(`Block ${drafts.length + 1} thiếu đáp án đúng.`)
      drafts.push({ title: `Bài tập ${drafts.length + 1}`, questionType, prompt, answer, topic: 'formulas' })
      continue
    }

    const items: string[] = []
    while (index < lines.length) {
      const current = lines[index]?.trim()
      if (!current) {
        index++
        continue
      }
      if (txtTypeFromLine(current) && items.length >= 4) break
      items.push(current)
      index++
    }

    if (questionType === 'matching') {
      const pairs = parseMatchingPairs(items, 'Matching')
      drafts.push({
        title: `Bài tập ${drafts.length + 1}`,
        questionType,
        prompt,
        options: pairs,
        answer: matchingAnswerFromPairs(pairs),
        topic: 'custom',
      })
      continue
    }

    const answerRaw = items.pop()?.trim()
    if (items.length !== 4 || !answerRaw) {
      throw new Error(`Block ${drafts.length + 1} trắc nghiệm cần câu hỏi, đúng 4 đáp án và đáp án đúng.`)
    }
    const letterIndex = ['A', 'B', 'C', 'D', 'Đ', 'E'].indexOf(answerRaw.toUpperCase())
    const answer = letterIndex >= 0 ? items[letterIndex] ?? answerRaw : answerRaw
    drafts.push({ title: `Bài tập ${drafts.length + 1}`, questionType, prompt, options: items, answer, topic: 'custom' })
  }

  return drafts
}

export function parseExerciseImport(text: string, fileName: string): ExerciseDraft[] {
  const trimmed = text.trim()
  const lowerFileName = fileName.toLowerCase()
  const isTxt = lowerFileName.endsWith('.txt')
  const isJson = !isTxt && (lowerFileName.endsWith('.json') || trimmed.startsWith('{'))
  const isCsv = lowerFileName.endsWith('.csv')
  if (!isJson && !isCsv) return parseTxtBlocks(text)

  const rawItems = isJson
    ? (() => {
        const parsed = JSON.parse(trimmed) as unknown
        if (Array.isArray(parsed)) return parsed
        if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { exercises?: unknown }).exercises)) {
          return (parsed as { exercises: unknown[] }).exercises
        }
        throw new Error('File JSON cần là mảng bài tập hoặc { "exercises": [...] }.')
      })()
    : parseCsv(text)

  if (rawItems.length === 0) throw new Error('File không có bài tập nào.')
  return rawItems.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`Bài tập ${index + 1} không hợp lệ.`)
    return exerciseFromRaw(item as Record<string, unknown>, index)
  })
}

export function exerciseTemplateContent(format: 'json' | 'csv' | 'txt'): string {
  const jsonTemplate = {
    exercises: [
      {
        title: 'Ghép ký hiệu',
        questionType: 'matching',
        prompt: 'Ghép ký hiệu với ý nghĩa đúng',
        options: [
          { left: 'Sxq', right: 'Diện tích xung quanh' },
          { left: 'Stp', right: 'Diện tích toàn phần' },
          { left: 'Sđáy', right: 'Diện tích đáy' },
          { left: 'V', right: 'Thể tích' },
        ],
        topic: 'formulas',
      },
      {
        title: 'Tính diện tích xung quanh',
        questionType: 'choice',
        prompt: 'Công thức diện tích xung quanh hình hộp chữ nhật là gì?',
        options: ['Sxq = 2(a+b)h', 'Sxq = ab', 'Sxq = 6a²', 'Sxq = a+b+h'],
        answer: 'Sxq = 2(a+b)h',
        topic: 'formulas',
      },
    ],
  }
  if (format === 'json') return JSON.stringify(jsonTemplate, null, 2)
  if (format === 'csv') {
    return [
      'title,questionType,prompt,options,answer,topic',
      '"Ghép ký hiệu","matching","Ghép ký hiệu với ý nghĩa đúng","Sxq => Diện tích xung quanh|Stp => Diện tích toàn phần|Sđáy => Diện tích đáy|V => Thể tích","","formulas"',
      '"Tính diện tích xung quanh","choice","Công thức diện tích xung quanh hình hộp chữ nhật là gì?","Sxq = 2(a+b)h|Sxq = ab|Sxq = 6a²|Sxq = a+b+h","Sxq = 2(a+b)h","formulas"',
    ].join('\n')
  }
  return [
    '[choice]',
    '[Công thức diện tích xung quanh hình hộp chữ nhật là gì?]',
    '[Sxq = 2(a+b)h]',
    '[Sxq = ab]',
    '[Sxq = 6a²]',
    '[Sxq = a+b+h]',
    '[A]',
    '',
    '[blank]',
    '[Điền công thức diện tích toàn phần hình lập phương: Stp = ____]',
    '[6a²]',
    '',
    '[matching]',
    '[Ghép ký hiệu với ý nghĩa đúng]',
    '[Sxq => Diện tích xung quanh]',
    '[Stp => Diện tích toàn phần]',
    '[Sđáy => Diện tích đáy]',
    '[V => Thể tích]',
  ].join('\n')
}
