'use client'

import { useEffect, useState, useMemo, type ChangeEvent } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { GeometrySpec } from '@/types/geo-ai'
import type { LessonContent, LessonFormula, LessonObject } from '@/lib/geo-ai/data/types'
import { getShape } from '@/lib/geo-ai/data/index'
import type { LearningUser } from '@/components/geo-ai/auth/AuthRolePanel'
import { isEquivalentMathAnswer } from '@/lib/geo-ai/practice/mathAnswer'
import {
  exerciseTemplateContent,
  parseExerciseImport as parseImportedExercises,
} from '@/lib/geo-ai/practice/exerciseImport'
import { matchingAnswerFromPairs, parseMatchingPairs, type MatchingPair } from '@/lib/geo-ai/practice/matching'

// ---------------------------------------------------------------------------
// KaTeX — synchronous, no flash
// ---------------------------------------------------------------------------

function KaTeX({ latex }: { latex: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, { displayMode: false, throwOnError: false })
    } catch {
      return latex
    }
  }, [latex])
  return (
    <span
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
      className="text-white"
      style={{ fontSize: '0.9rem' }}
    />
  )
}

// ---------------------------------------------------------------------------
// Formula card — title + description + KaTeX
// ---------------------------------------------------------------------------

function FormulaCard({ item }: { item: LessonFormula }) {
  return (
    <div className="rounded-lg bg-slate-800/70 border border-slate-700 p-3 space-y-1.5">
      <p className="text-xs font-semibold text-indigo-300">{item.title}</p>
      {item.description && (
        <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
      )}
      {item.latex && (
        <div className="overflow-x-auto rounded bg-slate-900/60 px-3 py-2 text-center">
          <KaTeX latex={item.latex} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: 'recognition', label: 'Dấu hiệu nhận biết', icon: '🔍' },
  { id: 'objects',     label: 'Đối tượng hình học',  icon: '📐' },
  { id: 'theorems',    label: 'Định lý',               icon: '📖' },
  { id: 'formulas',    label: 'Công thức',             icon: '🧮' },
  { id: 'practice',    label: 'Bài tập & tự đánh giá', icon: '📝' },
]

const LEVEL_LABEL: Record<string, { text: string; color: string }> = {
  cap2: { text: 'Cấp 2 (Lớp 8–9)',   color: 'text-sky-300 bg-sky-900/30 border-sky-700/40' },
  cap3: { text: 'Cấp 3 (Lớp 10–11)', color: 'text-violet-300 bg-violet-900/30 border-violet-700/40' },
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface FormulaDiscoveryProps {
  shape: GeometrySpec['shape'] | null
}

type PracticeTopic = 'recognition' | 'objects' | 'formulas' | 'self'
type PracticeQuestion = {
  id: string
  type: 'choice' | 'blank'
  topic: PracticeTopic
  prompt: string
  options?: string[]
  answer: string
  hint: string
}

const TOPIC_LABELS: Record<PracticeTopic, string> = {
  recognition: 'Dấu hiệu nhận biết',
  objects: 'Đối tượng hình học',
  formulas: 'Công thức',
  self: 'Tự đánh giá',
}

function buildPracticeQuestions(shape: GeometrySpec['shape'], lesson: LessonContent): PracticeQuestion[] {
  const firstRecognition = lesson.recognition[0] ?? 'có các mặt, cạnh và đỉnh đặc trưng'
  const objectGroups = lesson.objects.filter((group: LessonObject) => group.items.length > 0)
  const firstObject = objectGroups[0]?.items[0]?.split(' — ')[0]?.trim() ?? 'đỉnh'
  const firstFormula = lesson.formulas[0]
  const formulaAnswer = firstFormula?.latex
    ? firstFormula.latex.replace(/\\/g, '').replace(/[{}]/g, '')
    : 'công thức đã học'

  const isCube = shape === 'cube'
  const isRectangularPrism = shape === 'rectangular_prism'

  if (isCube || isRectangularPrism) {
    return [
      {
        id: 'recognition-1',
        type: 'choice',
        topic: 'recognition',
        prompt: isCube
          ? 'Hình lập phương có đặc điểm nào đúng?'
          : 'Hình hộp chữ nhật có đặc điểm nào đúng?',
        options: isCube
          ? ['6 mặt đều là hình vuông', 'Chỉ có 4 cạnh', 'Không có đỉnh', 'Có đúng 1 mặt']
          : ['6 mặt đều là hình chữ nhật', 'Chỉ có một mặt đáy', 'Không có cạnh bên', 'Không có đỉnh'],
        answer: isCube ? '6 mặt đều là hình vuông' : '6 mặt đều là hình chữ nhật',
        hint: 'Xem lại mục Dấu hiệu nhận biết.',
      },
      {
        id: 'objects-1',
        type: 'choice',
        topic: 'objects',
        prompt: 'Một hình hộp/lập phương có bao nhiêu đỉnh?',
        options: ['8 đỉnh', '6 đỉnh', '12 đỉnh', '4 đỉnh'],
        answer: '8 đỉnh',
        hint: 'Đếm các điểm góc của hình.',
      },
      {
        id: 'formula-1',
        type: 'blank',
        topic: 'formulas',
        prompt: isCube
          ? 'Điền công thức diện tích toàn phần hình lập phương: Stp = ____'
          : 'Điền công thức diện tích xung quanh hình hộp chữ nhật: Sxq = ____',
        answer: isCube ? '6a²' : '2(a+b)h',
        hint: 'Có thể dùng 6 mặt vuông hoặc trải 4 mặt bên thành hình chữ nhật.',
      },
      {
        id: 'self-1',
        type: 'choice',
        topic: 'self',
        prompt: 'Sau bài học này, em tự đánh giá mức hiểu của mình thế nào?',
        options: ['Đã hiểu chắc', 'Hiểu nhưng cần luyện thêm', 'Còn lẫn công thức', 'Cần luyện lại từ đầu'],
        answer: 'Đã hiểu chắc',
        hint: 'Câu này giúp hệ thống biết em cần luyện thêm mức nào.',
      },
    ]
  }

  return [
    {
      id: 'recognition-1',
      type: 'choice',
      topic: 'recognition',
      prompt: 'Dấu hiệu nhận biết nào phù hợp với hình này?',
      options: [firstRecognition, 'Không có cạnh hoặc mặt nào', 'Luôn là hình phẳng', 'Không có yếu tố đặc trưng'],
      answer: firstRecognition,
      hint: 'Xem lại mục Dấu hiệu nhận biết.',
    },
    {
      id: 'objects-1',
      type: 'blank',
      topic: 'objects',
      prompt: 'Điền tên một đối tượng hình học quan trọng của hình này: ____',
      answer: firstObject,
      hint: 'Xem lại mục Đối tượng hình học.',
    },
    {
      id: 'formula-1',
      type: 'blank',
      topic: 'formulas',
      prompt: firstFormula
        ? `Điền công thức cho "${firstFormula.title}": ____`
        : 'Điền một công thức quan trọng của hình này: ____',
      answer: formulaAnswer,
      hint: 'Xem lại mục Công thức.',
    },
    {
      id: 'self-1',
      type: 'choice',
      topic: 'self',
      prompt: 'Em tự đánh giá sau bài học này như thế nào?',
      options: ['Đã hiểu chắc', 'Hiểu nhưng cần luyện thêm', 'Còn lẫn công thức', 'Cần luyện lại từ đầu'],
      answer: 'Đã hiểu chắc',
      hint: 'Câu này không phạt nặng; dùng để gợi ý luyện tiếp.',
    },
  ]
}

type TeacherExercise = {
  id: string
  title: string
  questionType: 'choice' | 'blank' | 'matching'
  prompt: string
  options?: string[] | MatchingPair[]
  answer: string
  topic: string
}

type StudentResult = {
  id: string
  studentName: string | null
  studentEmail: string | null
  score: number
  total: number
  weakTopics: string[]
  selfAssessment: string | null
  createdAt: number
}

type ExerciseDraft = {
  title: string
  questionType: 'choice' | 'blank' | 'matching'
  prompt: string
  options?: string[] | MatchingPair[]
  answer: string
  topic: 'recognition' | 'objects' | 'formulas' | 'self' | 'custom'
}

function normalizeExerciseType(value: unknown): ExerciseDraft['questionType'] {
  const text = String(value ?? '').trim().toLowerCase()
  if (['blank', 'fill', 'fill_blank', 'fill-in', 'dien', 'điền', 'tu_luan', 'tự luận'].includes(text)) return 'blank'
  return 'choice'
}

function normalizeExerciseTopic(value: unknown): ExerciseDraft['topic'] {
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

function exerciseFromRaw(raw: Record<string, unknown>, index: number): ExerciseDraft {
  const title = String(raw.title ?? raw.tieuDe ?? raw['tiêu đề'] ?? `Bài tập ${index + 1}`).trim()
  const prompt = String(raw.prompt ?? raw.question ?? raw.cauHoi ?? raw['câu hỏi'] ?? '').trim()
  const answer = String(raw.answer ?? raw.dapAn ?? raw['đáp án'] ?? '').trim()
  const questionType = normalizeExerciseType(raw.questionType ?? raw.type ?? raw.loai ?? raw['loại'])
  const options = splitOptions(raw.options ?? raw.choices ?? raw.luaChon ?? raw['lựa chọn'])
  const topic = normalizeExerciseTopic(raw.topic ?? raw.chuDe ?? raw['chủ đề'])

  if (!prompt || !answer) {
    throw new Error(`Dòng ${index + 1} thiếu câu hỏi hoặc đáp án.`)
  }
  if (questionType === 'choice' && (!options || options.length !== 4)) {
    throw new Error(`Dòng ${index + 1} là trắc nghiệm nên cần đúng 4 lựa chọn.`)
  }

  return { title, questionType, prompt, options, answer, topic }
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

function cleanBracketLine(line: string) {
  const trimmed = line.trim()
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function txtTypeFromLine(line: string): ExerciseDraft['questionType'] | null {
  const text = line.trim().toLowerCase()
  if (['choice', 'trac nghiem', 'trắc nghiệm', 'tn', 'multiple choice'].includes(text)) return 'choice'
  if (['blank', 'dien', 'điền', 'dien khuyet', 'điền khuyết', 'fill', 'fill blank'].includes(text)) return 'blank'
  if (['matching', 'match', 'ghep cap', 'ghép cặp', 'ghep', 'ghép'].includes(text)) return 'matching'
  return null
}

function parseTxtBlocks(text: string): ExerciseDraft[] {
  const lines = text
    .split(/\r?\n/)
    .map(cleanBracketLine)
    .filter(Boolean)

  const drafts: ExerciseDraft[] = []
  let index = 0

  while (index < lines.length) {
    const typeRaw = lines[index++] ?? ''
    const questionType = txtTypeFromLine(typeRaw) ?? normalizeExerciseType(typeRaw)

    if (questionType === 'blank') {
      const prompt = lines[index++]?.trim()
      const answer = lines[index++]?.trim()
      if (!prompt || !answer) throw new Error(`Block ${drafts.length + 1} thiếu nội dung hoặc đáp án đúng.`)
      drafts.push({
        title: `Bài tập ${drafts.length + 1}`,
        questionType: 'blank',
        prompt,
        answer,
        topic: 'formulas',
      })
      continue
    }

    const prompt = lines[index++]?.trim()
    const options: string[] = []
    while (index < lines.length) {
      const current = lines[index]?.trim()
      if (!current) {
        index++
        continue
      }
      if (txtTypeFromLine(current) && options.length >= 4) break
      options.push(current)
      index++
    }

    const answerRaw = options.pop()?.trim()
    if (!prompt || options.length !== 4 || !answerRaw) {
      throw new Error(`Block ${drafts.length + 1} trắc nghiệm cần câu hỏi, đúng 4 đáp án và đáp án đúng.`)
    }

    const answerLetter = answerRaw.toUpperCase()
    const letterIndex = ['A', 'B', 'C', 'D', 'Đ', 'E'].indexOf(answerLetter)
    const answer = letterIndex >= 0 ? options[letterIndex] ?? answerRaw : answerRaw

    drafts.push({
      title: `Bài tập ${drafts.length + 1}`,
      questionType: 'choice',
      prompt,
      options,
      answer,
      topic: 'custom',
    })
  }

  return drafts
}

function parseExerciseImport(text: string, fileName: string): ExerciseDraft[] {
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

function downloadExerciseTemplate(format: 'json' | 'csv' | 'txt') {
  const content = exerciseTemplateContent(format)
  const blob = new Blob([content], { type: format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `exercise-template.${format}`
  link.click()
  URL.revokeObjectURL(url)
}

export function TeacherWorkspace({ shapeKey, onClose }: { shapeKey: string; onClose?: () => void }) {
  const [exercises, setExercises] = useState<TeacherExercise[]>([])
  const [results, setResults] = useState<StudentResult[]>([])
  const [title, setTitle] = useState('Bài tập luyện công thức')
  const [questionType, setQuestionType] = useState<'choice' | 'blank' | 'matching'>('choice')
  const [prompt, setPrompt] = useState('')
  const [options, setOptions] = useState('Đáp án A\nĐáp án B\nĐáp án C\nĐáp án D')
  const [matchingPairsText, setMatchingPairsText] = useState('Sxq => Diện tích xung quanh\nStp => Diện tích toàn phần\nSđáy => Diện tích đáy\nV => Thể tích')
  const [answer, setAnswer] = useState('')
  const [topic, setTopic] = useState('formulas')
  const [message, setMessage] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  async function load() {
    const [exerciseRes, resultRes] = await Promise.all([
      fetch(`/api/teacher/exercises?shapeKey=${encodeURIComponent(shapeKey)}`, { cache: 'no-store' }),
      fetch(`/api/teacher/results?shapeKey=${encodeURIComponent(shapeKey)}`, { cache: 'no-store' }),
    ])
    if (exerciseRes.ok) setExercises((await exerciseRes.json()).exercises ?? [])
    if (resultRes.ok) setResults((await resultRes.json()).results ?? [])
  }

  useEffect(() => {
    void load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapeKey])

  async function createExercise() {
    setMessage(null)
    setImportMessage(null)
    const optionItems = options.split('\n').map((item) => item.trim()).filter(Boolean)
    if (questionType === 'choice' && optionItems.length !== 4) {
      setMessage('Trắc nghiệm cần đúng 4 đáp án để giao diện cân đối.')
      return
    }
    let matchingPairs: MatchingPair[] | undefined
    if (questionType === 'matching') {
      try {
        matchingPairs = parseMatchingPairs(
          matchingPairsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
          'Ghép cặp',
        )
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Ghép cặp không hợp lệ.')
        return
      }
    }
    const payload = {
      shapeKey,
      title,
      questionType,
      prompt,
      options: questionType === 'choice' ? optionItems : questionType === 'matching' ? matchingPairs : undefined,
      answer: questionType === 'matching' && matchingPairs ? matchingAnswerFromPairs(matchingPairs) : answer,
      topic,
    }
    const res = await fetch('/api/teacher/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error ?? 'Không lưu được bài tập.')
      return
    }
    setExercises(data.exercises ?? [])
    setPrompt('')
    setAnswer('')
    setMessage('Đã lưu bài tập.')
  }

  async function importExercises(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImporting(true)
    setImportMessage(null)
    setMessage(null)
    try {
      const text = await file.text()
      const drafts = parseImportedExercises(text, file.name)
      let imported = 0

      for (const draft of drafts) {
        const res = await fetch('/api/teacher/exercises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...draft, shapeKey }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? `Không lưu được bài tập thứ ${imported + 1}.`)
        }
        imported++
      }

      await load()
      setImportMessage(`Đã import ${imported} bài tập từ ${file.name}.`)
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'Không đọc được file import.')
    } finally {
      setImporting(false)
    }
  }

  const weakSummary = results.flatMap((result) => result.weakTopics)
    .reduce<Record<string, number>>((acc, topic) => {
      acc[topic] = (acc[topic] ?? 0) + 1
      return acc
    }, {})

  return (
    <div className="h-full overflow-y-auto bg-slate-950/96 p-5 text-slate-100">
    <div className="mx-auto max-w-4xl space-y-3">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">Teacher/Admin</p>
          <h2 className="mt-1 text-xl font-bold text-white">Quản lý bài tập</h2>
          <p className="mt-1 text-sm text-slate-400">Soạn bài, import file và xem kết quả học sinh.</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Đóng
          </button>
        )}
      </div>

      <div className="rounded-xl border border-indigo-500/25 bg-indigo-950/20 p-3">
        <p className="text-sm font-semibold text-white">Giáo viên: soạn bài tập</p>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
        <select value={questionType} onChange={(e) => setQuestionType(e.target.value as 'choice' | 'blank' | 'matching')} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
          <option value="choice">Trắc nghiệm</option>
          <option value="blank">Điền ô trống</option>
          <option value="matching">Ghép cặp</option>
        </select>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Nội dung câu hỏi" className="mt-2 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
        {questionType === 'choice' && (
          <textarea value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Mỗi dòng một đáp án" className="mt-2 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
        )}
        {questionType === 'matching' && (
          <textarea
            value={matchingPairsText}
            onChange={(e) => setMatchingPairsText(e.target.value)}
            placeholder="Mỗi dòng một cặp: Vế trái => Vế phải"
            className="mt-2 min-h-28 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
        )}
        {questionType !== 'matching' && (
          <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Đáp án đúng" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
        )}
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
          <option value="recognition">Dấu hiệu nhận biết</option>
          <option value="objects">Đối tượng hình học</option>
          <option value="formulas">Công thức</option>
          <option value="custom">Khác</option>
        </select>
        {message && <p className="mt-2 text-xs text-indigo-200">{message}</p>}
        <button type="button" onClick={createExercise} className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
          Lưu bài tập
        </button>

        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/45 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white">Import file bài tập</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Hỗ trợ TXT, JSON hoặc CSV. TXT dùng block: [choice], [blank] hoặc [matching].
              </p>
            </div>
          </div>

          <label className="mt-3 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-900/60 px-3 py-3 text-center text-xs font-medium text-slate-300 transition hover:border-indigo-400 hover:text-white">
            {importing ? 'Đang import...' : 'Chọn file .txt, .json hoặc .csv'}
            <input
              type="file"
              accept=".txt,.json,.csv,text/plain,text/csv,application/json"
              disabled={importing}
              onChange={importExercises}
              className="hidden"
            />
          </label>

          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => downloadExerciseTemplate('txt')}
              className="rounded-lg border border-slate-700 px-2 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Mẫu TXT
            </button>
            <button
              type="button"
              onClick={() => downloadExerciseTemplate('json')}
              className="rounded-lg border border-slate-700 px-2 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Mẫu JSON
            </button>
            <button
              type="button"
              onClick={() => downloadExerciseTemplate('csv')}
              className="rounded-lg border border-slate-700 px-2 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Mẫu CSV
            </button>
          </div>

          {importMessage && (
            <p className="mt-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
              {importMessage}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
        <p className="text-sm font-semibold text-white">Kết quả học sinh</p>
        {Object.keys(weakSummary).length > 0 && (
          <p className="mt-1 text-xs text-amber-200">
            Mục yếu nổi bật: {Object.entries(weakSummary).map(([topicName, count]) => `${TOPIC_LABELS[topicName as PracticeTopic] ?? topicName} (${count})`).join(', ')}
          </p>
        )}
        <div className="mt-2 space-y-2">
          {results.length === 0 ? (
            <p className="text-xs text-slate-500">Chưa có học sinh nộp bài.</p>
          ) : results.map((result) => (
            <div key={result.id} className="rounded-lg bg-slate-900/70 p-2 text-xs text-slate-300">
              <div className="flex justify-between gap-2">
                <span className="font-medium text-slate-100">{result.studentName ?? result.studentEmail ?? 'Học sinh'}</span>
                <span>{result.score}/{result.total}</span>
              </div>
              {result.weakTopics.length > 0 && (
                <p className="mt-1 text-amber-200">Chưa nắm: {result.weakTopics.map((item) => TOPIC_LABELS[item as PracticeTopic] ?? item).join(', ')}</p>
              )}
              {result.selfAssessment && <p className="mt-1">Tự đánh giá: {result.selfAssessment}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
        <p className="text-sm font-semibold text-white">Bài đã soạn</p>
        <div className="mt-2 space-y-1.5">
          {exercises.length === 0 ? (
            <p className="text-xs text-slate-500">Chưa có bài tập giáo viên.</p>
          ) : exercises.map((exercise) => (
            <div key={exercise.id} className="rounded-lg bg-slate-900/60 p-2 text-xs text-slate-300">
              <p className="font-medium text-slate-100">{exercise.title}</p>
              <p>{exercise.prompt}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
    </div>
  )
}

export default function FormulaDiscovery({ shape }: FormulaDiscoveryProps) {
  const [openSections, setOpenSections] = useState<ReadonlySet<string>>(new Set())
  const [user, setUser] = useState<LearningUser | null>(null)
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({})
  const [practiceSubmitted, setPracticeSubmitted] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : { user: null })
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null))

    function onAuthChange(event: Event) {
      setUser((event as CustomEvent<LearningUser | null>).detail ?? null)
    }
    window.addEventListener('learning-auth-change', onAuthChange)
    return () => window.removeEventListener('learning-auth-change', onAuthChange)
  }, [])

  const shapeData = shape ? getShape(shape) : undefined
  const lesson    = shapeData?.lessonContent
  const level     = shapeData?.level
  const levelMeta = level ? LEVEL_LABEL[level] : undefined
  const practiceQuestions = useMemo(
    () => shape && lesson ? buildPracticeQuestions(shape, lesson) : [],
    [shape, lesson],
  )

  const practiceResults = useMemo(() => {
    const checked = practiceQuestions.map((question) => {
      const answer = practiceAnswers[question.id] ?? ''
      const isSelfAssessment = question.topic === 'self'
      const correct = isSelfAssessment
        ? answer === 'Đã hiểu chắc'
        : isEquivalentMathAnswer(answer, question.answer)
      return { question, answer, correct, isSelfAssessment }
    })
    const graded = checked.filter((item) => !item.isSelfAssessment)
    const correctCount = graded.filter((item) => item.correct).length
    const weakTopics = Array.from(new Set(
      checked
        .filter((item) => !item.correct)
        .map((item) => item.question.topic),
    ))
    return { checked, graded, correctCount, weakTopics }
  }, [practiceAnswers, practiceQuestions])

  function updatePracticeAnswer(id: string, value: string) {
    setPracticeAnswers((prev) => ({ ...prev, [id]: value }))
    setPracticeSubmitted(false)
    setSaveStatus(null)
  }

  async function submitPracticeScore() {
    if (!shape) return
    setPracticeSubmitted(true)
    setSaveStatus(null)

    if (user?.role !== 'student') {
      setSaveStatus(user?.role === 'teacher' || user?.role === 'admin' ? 'Giáo viên/Admin xem kết quả, không lưu bài làm.' : 'Đăng nhập Student để lưu kết quả.')
      return
    }

    const res = await fetch('/api/student/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shapeKey: shape,
        source: 'lesson_practice',
        score: practiceResults.correctCount,
        total: practiceResults.graded.length,
        weakTopics: practiceResults.weakTopics,
        answers: practiceAnswers,
        selfAssessment: practiceAnswers['self-1'],
      }),
    })
    setSaveStatus(res.ok ? 'Đã lưu kết quả cho giáo viên xem.' : 'Chưa lưu được kết quả.')
  }

  function resetPractice(topic?: PracticeTopic) {
    if (!topic) {
      setPracticeAnswers({})
      setPracticeSubmitted(false)
      setSaveStatus(null)
      return
    }
    const nextAnswers: Record<string, string> = {}
    for (const question of practiceQuestions) {
      const currentAnswer = practiceAnswers[question.id]
      if (question.topic !== topic && currentAnswer) {
        nextAnswers[question.id] = currentAnswer
      }
    }
    setPracticeAnswers(nextAnswers)
    setPracticeSubmitted(false)
    setSaveStatus(null)
  }

  if (!shape) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        Chọn một hình để xem bài học.
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        Chưa có nội dung bài học. Chạy{' '}
        <code className="mx-1 px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 text-xs">
          pnpm update-lesson
        </code>{' '}
        để tạo.
      </div>
    )
  }

  function renderSection(id: string) {
    if (!lesson) return null

    if (id === 'recognition') {
      return (
        <ul className="space-y-2">
          {lesson.recognition.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-300 leading-relaxed">
              <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    }

    if (id === 'objects') {
      return (
        <div className="space-y-2">
          {(lesson.objects as LessonObject[])
            .filter(g => !g.category.toLowerCase().includes('đặc trưng') && !g.category.toLowerCase().includes('tham số'))
            .map((group, gi) => (
            <div key={gi} className="flex gap-2 text-sm leading-relaxed">
              <span className="text-slate-400 font-medium whitespace-nowrap flex-shrink-0">
                {group.category}:
              </span>
              <span className="text-slate-300">
                {group.items.map(item => item.split(' — ')[0]?.trim() ?? item).join(', ')}
              </span>
            </div>
          ))}
        </div>
      )
    }

    if (id === 'theorems') {
      if (!lesson.theorems.length) {
        return <p className="text-sm text-slate-400">Chưa có định lý.</p>
      }
      return (
        <div className="space-y-2">
          {lesson.theorems.map((t, i) => <FormulaCard key={i} item={t} />)}
        </div>
      )
    }

    if (id === 'formulas') {
      if (!lesson.formulas.length) {
        return <p className="text-sm text-slate-400">Chưa có công thức.</p>
      }
      return (
        <div className="space-y-2">
          {lesson.formulas.map((f, i) => <FormulaCard key={i} item={f} />)}
        </div>
      )
    }

    if (id === 'practice') {
      return (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/25 p-3">
          <p className="text-sm font-semibold text-white">Mở bài tập ở khung hình</p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('geo-ai-open-practice', { detail: { shape } }))}
            className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Mở bài tập
          </button>
        </div>
      )
    }

    if (id === 'teacher-workspace') {
      return (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/25 p-3">
          <p className="text-sm font-semibold text-white">Mở quản lý bài tập</p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('geo-ai-open-teacher-workspace', { detail: { shape } }))}
            className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Mở quản lý
          </button>
        </div>
      )
    }

    if (id === 'practice') {
      const allAnswered = practiceQuestions.every((question) => practiceAnswers[question.id]?.trim())
      const scorePercent = practiceResults.graded.length > 0
        ? Math.round((practiceResults.correctCount / practiceResults.graded.length) * 100)
        : 0

      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
            <p className="text-sm font-semibold text-white">Luyện tập sau bài học</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Làm trắc nghiệm và điền ô trống. Sau khi chấm điểm, hệ thống sẽ chỉ ra phần em cần luyện tiếp.
            </p>
          </div>

          {practiceQuestions.map((question, index) => {
            const value = practiceAnswers[question.id] ?? ''
            const result = practiceResults.checked.find((item) => item.question.id === question.id)
            return (
              <div key={question.id} className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-relaxed text-slate-100">
                    {index + 1}. {question.prompt}
                  </p>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                    {question.type === 'choice' ? 'Trắc nghiệm' : 'Điền ô'}
                  </span>
                </div>

                {question.type === 'choice' && question.options ? (
                  <div className="mt-2 space-y-1.5">
                    {question.options.map((option) => (
                      <label
                        key={option}
                        className={[
                          'flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition',
                          value === option
                            ? 'border-indigo-500 bg-indigo-950/45 text-indigo-100'
                            : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-600',
                        ].join(' ')}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={value === option}
                          onChange={(event) => updatePracticeAnswer(question.id, event.target.value)}
                          className="accent-indigo-500"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <>
                    <input
                      value={value}
                      onChange={(event) => updatePracticeAnswer(question.id, event.target.value)}
                      placeholder="VD: 6a^2 hoặc 6a²"
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-500"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Có thể nhập số mũ bằng dấu ^, ví dụ: 6a^2.
                    </p>
                  </>
                )}

                {practiceSubmitted && result && (
                  <div className={[
                    'mt-2 rounded-lg px-2.5 py-2 text-xs leading-relaxed',
                    result.correct
                      ? 'border border-emerald-700/40 bg-emerald-950/30 text-emerald-200'
                      : 'border border-amber-700/40 bg-amber-950/30 text-amber-200',
                  ].join(' ')}>
                    {result.correct ? (
                      <span>Đúng rồi.</span>
                    ) : (
                      <span>
                        Cần xem lại: {question.hint}
                        {question.topic !== 'self' && <> Đáp án: <b>{question.answer}</b>.</>}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!allAnswered}
              onClick={submitPracticeScore}
              className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              Chấm điểm
            </button>
            <button
              type="button"
              onClick={() => resetPractice()}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Làm lại
            </button>
          </div>

          {saveStatus && (
            <p className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-300">
              {saveStatus}
            </p>
          )}

          {practiceSubmitted && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/25 p-3">
              <p className="text-sm font-semibold text-white">
                Kết quả: {practiceResults.correctCount}/{practiceResults.graded.length} câu kiến thức đúng ({scorePercent}%)
              </p>
              {practiceResults.weakTopics.length === 0 ? (
                <p className="mt-1 text-xs leading-relaxed text-emerald-300">
                  Tốt lắm. Em đã nắm chắc bài này, có thể chuyển sang bài nâng cao.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  <p className="text-xs leading-relaxed text-slate-300">
                    Các phần cần luyện thêm:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {practiceResults.weakTopics.map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => resetPractice(topic)}
                        className="rounded-full border border-amber-500/40 bg-amber-950/30 px-2.5 py-1 text-[11px] font-medium text-amber-200 transition hover:bg-amber-900/40"
                      >
                        Luyện tiếp: {TOPIC_LABELS[topic]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <div className="flex flex-col gap-1 mt-8">
      {/* Accordion */}
      <div className="divide-y divide-slate-800">
        {SECTIONS.filter((sec) => {
          const isTeacherLike = user?.role === 'teacher' || user?.role === 'admin'
          if (sec.id === 'practice') return !isTeacherLike
          return true
        }).concat(user?.role === 'teacher' || user?.role === 'admin'
          ? [{ id: 'teacher-workspace', label: 'Quản lý bài tập', icon: '🧑‍🏫' }]
          : []
        ).map((sec) => {
          const isOpen = openSections.has(sec.id)
          return (
            <div key={sec.id}>
              <button
                type="button"
                onClick={() => toggleSection(sec.id)}
                className="w-full flex items-center justify-between px-1 py-2.5 text-left hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm">{sec.icon}</span>
                  <span className={`text-sm font-medium ${isOpen ? 'text-indigo-300' : 'text-slate-300'}`}>
                    {sec.label}
                  </span>
                </span>
                <svg
                  viewBox="0 0 16 16"
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                >
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </button>

              {isOpen && (
                <div className="pb-3 px-1">
                  {renderSection(sec.id)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
