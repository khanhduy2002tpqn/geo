'use client'

import { useEffect, useMemo, useState } from 'react'
import type { GeometrySpec } from '@/types/geo-ai'
import type { LessonContent, LessonObject } from '@/lib/geo-ai/data/types'
import { getShape } from '@/lib/geo-ai/data'
import type { LearningUser } from '@/components/geo-ai/auth/AuthRolePanel'
import { isEquivalentMathAnswer } from '@/lib/geo-ai/practice/mathAnswer'
import {
  isMatchingCorrect,
  matchingAnswerFromPairs,
  parseMatchingAnswer,
  type MatchingPair,
} from '@/lib/geo-ai/practice/matching'

type Topic = 'recognition' | 'objects' | 'formulas' | 'self'
type Question = {
  id: string
  type: 'choice' | 'blank' | 'matching'
  topic: Topic
  prompt: string
  options?: string[] | MatchingPair[]
  answer: string
  hint: string
}

type TeacherExercise = {
  id: string
  title: string
  questionType: 'choice' | 'blank' | 'matching'
  prompt: string
  options?: string[] | MatchingPair[]
  answer: string
  topic: Topic | 'custom'
}

const TOPIC_LABELS: Record<Topic, string> = {
  recognition: 'Dấu hiệu nhận biết',
  objects: 'Đối tượng hình học',
  formulas: 'Công thức',
  self: 'Tự đánh giá',
}

function buildQuestions(shape: GeometrySpec['shape'], lesson: LessonContent): Question[] {
  const firstRecognition = lesson.recognition[0] ?? 'có các mặt, cạnh và đỉnh đặc trưng'
  const objectGroups = lesson.objects.filter((group: LessonObject) => group.items.length > 0)
  const firstObject = objectGroups[0]?.items[0]?.split(' — ')[0]?.trim() ?? 'đỉnh'
  const firstFormula = lesson.formulas[0]
  const formulaAnswer = firstFormula?.latex
    ? firstFormula.latex.replace(/\\/g, '').replace(/[{}]/g, '')
    : 'công thức đã học'

  if (shape === 'cube' || shape === 'rectangular_prism') {
    const isCube = shape === 'cube'
    const formulaMatchingPairs: MatchingPair[] = [
      { left: 'Sxq', right: 'Diện tích xung quanh' },
      { left: 'Stp', right: 'Diện tích toàn phần' },
      { left: 'Sđáy', right: 'Diện tích đáy' },
      { left: 'V', right: 'Thể tích' },
    ]
    return [
      {
        id: 'recognition-1',
        type: 'choice',
        topic: 'recognition',
        prompt: isCube ? 'Hình lập phương có đặc điểm nào đúng?' : 'Hình hộp chữ nhật có đặc điểm nào đúng?',
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
        hint: 'Xem lại mục Công thức.',
      },
      {
        id: 'matching-1',
        type: 'matching',
        topic: 'formulas',
        prompt: 'Ghép ký hiệu với ý nghĩa đúng',
        options: formulaMatchingPairs,
        answer: matchingAnswerFromPairs(formulaMatchingPairs),
        hint: 'Xem lại mục Công thức.',
      },
      {
        id: 'self-1',
        type: 'choice',
        topic: 'self',
        prompt: 'Sau bài học này, em tự đánh giá mức hiểu của mình thế nào?',
        options: ['Đã hiểu chắc', 'Hiểu nhưng cần luyện thêm', 'Còn lẫn công thức', 'Cần luyện lại từ đầu'],
        answer: 'Đã hiểu chắc',
        hint: 'Dùng để gợi ý luyện tiếp.',
      },
    ]
  }

  const generalMatchingPairs: MatchingPair[] = [
    { left: 'Đỉnh', right: 'Điểm góc của hình' },
    { left: 'Cạnh', right: 'Đoạn nối hai đỉnh' },
    { left: 'Mặt', right: 'Phần phẳng bao quanh hình' },
    { left: 'Công thức', right: 'Biểu thức tính đại lượng' },
  ]

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
      prompt: firstFormula ? `Điền công thức cho "${firstFormula.title}": ____` : 'Điền một công thức quan trọng: ____',
      answer: formulaAnswer,
      hint: 'Xem lại mục Công thức.',
    },
    {
      id: 'matching-1',
      type: 'matching',
      topic: 'objects',
      prompt: 'Ghép khái niệm với ý nghĩa đúng',
      options: generalMatchingPairs,
      answer: matchingAnswerFromPairs(generalMatchingPairs),
      hint: 'Xem lại mục Đối tượng hình học.',
    },
    {
      id: 'self-1',
      type: 'choice',
      topic: 'self',
      prompt: 'Em tự đánh giá sau bài học này như thế nào?',
      options: ['Đã hiểu chắc', 'Hiểu nhưng cần luyện thêm', 'Còn lẫn công thức', 'Cần luyện lại từ đầu'],
      answer: 'Đã hiểu chắc',
      hint: 'Dùng để gợi ý luyện tiếp.',
    },
  ]
}

export function PracticePanel({ shape, onClose }: { shape: GeometrySpec['shape']; onClose?: () => void }) {
  const [user, setUser] = useState<LearningUser | null>(null)
  const [teacherExercises, setTeacherExercises] = useState<TeacherExercise[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const shapeData = getShape(shape)
  const lesson = shapeData?.lessonContent
  const questions = useMemo<Question[]>(() => {
    const builtIn = lesson ? buildQuestions(shape, lesson) : []
    const authored = teacherExercises.map((exercise): Question => ({
      id: `teacher-${exercise.id}`,
      type: exercise.questionType,
      topic: exercise.topic === 'custom' ? 'formulas' : exercise.topic,
      prompt: exercise.prompt,
      options: exercise.options,
      answer: exercise.answer,
      hint: 'Xem lại bài học hoặc hỏi giáo viên.',
    }))
    return [...builtIn, ...authored]
  }, [shape, lesson, teacherExercises])

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

  useEffect(() => {
    fetch(`/api/teacher/exercises?shapeKey=${encodeURIComponent(shape)}`, { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : { exercises: [] })
      .then((data) => setTeacherExercises(data.exercises ?? []))
      .catch(() => setTeacherExercises([]))
  }, [shape])

  const matchingRightOptions = useMemo(() => {
    const result: Record<string, string[]> = {}
    for (const question of questions) {
      if (question.type !== 'matching' || !Array.isArray(question.options)) continue
      const pairs = question.options as MatchingPair[]
      result[question.id] = [...pairs.map((pair) => pair.right)].sort((a, b) => {
        const seed = question.id.length + question.prompt.length
        return ((a.charCodeAt(0) + seed) % 7) - ((b.charCodeAt(0) + seed) % 7)
      })
    }
    return result
  }, [questions])

  const results = useMemo(() => {
    const checked = questions.map((question) => {
      const answer = answers[question.id] ?? ''
      const correct = question.type === 'matching' && Array.isArray(question.options)
        ? isMatchingCorrect(question.options as MatchingPair[], parseMatchingAnswer(answer))
        : question.topic === 'self'
        ? answer === 'Đã hiểu chắc'
        : isEquivalentMathAnswer(answer, question.answer)
      return { question, answer, correct, self: question.topic === 'self' }
    })
    const graded = checked.filter((item) => !item.self)
    const weakTopics = Array.from(new Set(checked.filter((item) => !item.correct).map((item) => item.question.topic)))
    return { checked, graded, correctCount: graded.filter((item) => item.correct).length, weakTopics }
  }, [answers, questions])

  if (!lesson) {
    return <div className="p-6 text-sm text-slate-400">Chưa có nội dung bài tập cho hình này.</div>
  }

  const allAnswered = questions.every((question) => {
    if (question.type !== 'matching') return answers[question.id]?.trim()
    if (!Array.isArray(question.options)) return false
    const current = parseMatchingAnswer(answers[question.id])
    return (question.options as MatchingPair[]).every((pair) => current[pair.left]?.trim())
  })
  const scorePercent = results.graded.length > 0 ? Math.round((results.correctCount / results.graded.length) * 100) : 0

  async function submit() {
    setSubmitted(true)
    setSaveStatus(null)
    if (user?.role !== 'student') {
      setSaveStatus(user ? 'Teacher/Admin xem bài, không lưu kết quả.' : 'Đăng nhập Student để lưu kết quả.')
      return
    }
    const res = await fetch('/api/student/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shapeKey: shape,
        source: 'lesson_practice',
        score: results.correctCount,
        total: results.graded.length,
        weakTopics: results.weakTopics,
        answers,
        selfAssessment: answers['self-1'],
      }),
    })
    setSaveStatus(res.ok ? 'Đã lưu kết quả cho giáo viên xem.' : 'Chưa lưu được kết quả.')
  }

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }))
    setSubmitted(false)
    setSaveStatus(null)
  }

  function setMatchingAnswer(questionId: string, left: string, right: string) {
    const current = parseMatchingAnswer(answers[questionId])
    setAnswer(questionId, JSON.stringify({ ...current, [left]: right }))
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950/96 p-5 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">Bài tập & tự đánh giá</p>
            <h2 className="mt-1 text-xl font-bold text-white">{shapeData?.nameVi ?? shape}</h2>
            <p className="mt-1 text-sm text-slate-400">Làm bài, chấm điểm và xem phần kiến thức cần luyện tiếp.</p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800">
              Đóng
            </button>
          )}
        </div>

        <div className="space-y-3">
          {questions.map((question, index) => {
            const value = answers[question.id] ?? ''
            const result = results.checked.find((item) => item.question.id === question.id)
            return (
              <div key={question.id} className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-relaxed">{index + 1}. {question.prompt}</p>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                    {question.type === 'choice' ? 'Trắc nghiệm' : question.type === 'matching' ? 'Ghép cặp' : 'Điền ô'}
                  </span>
                </div>

                {question.type === 'matching' && Array.isArray(question.options) ? (
                  <div className="mt-3 space-y-2">
                    {(question.options as MatchingPair[]).map((pair) => {
                      const current = parseMatchingAnswer(answers[question.id])
                      return (
                        <div key={pair.left} className="grid gap-2 rounded-xl border border-slate-700 bg-slate-950/50 p-3 sm:grid-cols-[1fr_1.2fr] sm:items-center">
                          <span className="text-sm font-medium text-slate-100">{pair.left}</span>
                          <select
                            value={current[pair.left] ?? ''}
                            onChange={(event) => setMatchingAnswer(question.id, pair.left, event.target.value)}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                          >
                            <option value="">Chọn đáp án...</option>
                            {(matchingRightOptions[question.id] ?? []).map((right) => (
                              <option key={right} value={right}>{right}</option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                ) : question.type === 'choice' && question.options ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(question.options as string[]).map((option) => (
                      <label key={option} className={`cursor-pointer rounded-xl border px-3 py-2 text-sm transition ${value === option ? 'border-indigo-500 bg-indigo-950/45 text-indigo-100' : 'border-slate-700 bg-slate-950/50 text-slate-300 hover:border-slate-500'}`}>
                        <input type="radio" name={question.id} value={option} checked={value === option} onChange={(event) => setAnswer(question.id, event.target.value)} className="mr-2 accent-indigo-500" />
                        {option}
                      </label>
                    ))}
                  </div>
                ) : (
                  <>
                    <input value={value} onChange={(event) => setAnswer(question.id, event.target.value)} placeholder="VD: 6a^2 hoặc 6a²" className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                    <p className="mt-1 text-xs text-slate-500">
                      Có thể nhập số mũ bằng dấu ^, ví dụ: 6a^2, 2(a+b)h.
                    </p>
                  </>
                )}

                {submitted && result && (
                  <div className={`mt-3 rounded-xl px-3 py-2 text-sm ${result.correct ? 'border border-emerald-700/40 bg-emerald-950/30 text-emerald-200' : 'border border-amber-700/40 bg-amber-950/30 text-amber-200'}`}>
                    {result.correct ? 'Đúng rồi.' : (
                      <>
                        Cần xem lại: {question.hint}
                        {question.type === 'matching' && Array.isArray(question.options) ? (
                          <ul className="mt-1 list-inside list-disc">
                            {(question.options as MatchingPair[]).map((pair) => (
                              <li key={pair.left}>{pair.left} → {pair.right}</li>
                            ))}
                          </ul>
                        ) : question.topic !== 'self' && <> Đáp án: <b>{question.answer}</b>.</>}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" disabled={!allAnswered} onClick={submit} className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500">
            Chấm điểm
          </button>
          <button type="button" onClick={() => { setAnswers({}); setSubmitted(false); setSaveStatus(null) }} className="rounded-xl border border-slate-700 px-4 py-3 font-medium text-slate-300 hover:bg-slate-800">
            Làm lại
          </button>
        </div>

        {saveStatus && <p className="mt-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">{saveStatus}</p>}

        {submitted && (
          <div className="mt-4 rounded-2xl border border-indigo-500/30 bg-indigo-950/25 p-4">
            <p className="font-semibold text-white">Kết quả: {results.correctCount}/{results.graded.length} câu kiến thức đúng ({scorePercent}%)</p>
            {results.weakTopics.length === 0 ? (
              <p className="mt-1 text-sm text-emerald-300">Tốt lắm. Em đã nắm chắc bài này.</p>
            ) : (
              <p className="mt-1 text-sm text-amber-200">
                Cần luyện thêm: {results.weakTopics.map((topic) => TOPIC_LABELS[topic]).join(', ')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
