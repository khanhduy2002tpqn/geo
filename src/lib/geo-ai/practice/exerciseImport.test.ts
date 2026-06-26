import { describe, expect, it } from 'vitest'
import { parseTxtBlocks } from './exerciseImport'

describe('exercise TXT import', () => {
  it('parses a matching block with four pairs', () => {
    const [item] = parseTxtBlocks(`
[matching]
[Ghép ký hiệu với ý nghĩa đúng]
[Sxq => Diện tích xung quanh]
[Stp => Diện tích toàn phần]
[Sđáy => Diện tích đáy]
[V => Thể tích]
`)

    expect(item).toMatchObject({
      questionType: 'matching',
      prompt: 'Ghép ký hiệu với ý nghĩa đúng',
    })
    expect(item?.options).toEqual([
      { left: 'Sxq', right: 'Diện tích xung quanh' },
      { left: 'Stp', right: 'Diện tích toàn phần' },
      { left: 'Sđáy', right: 'Diện tích đáy' },
      { left: 'V', right: 'Thể tích' },
    ])
  })

  it('parses a mixed choice blank matching file', () => {
    const items = parseTxtBlocks(`
[choice]
[Hình lập phương có bao nhiêu mặt?]
[4 mặt]
[6 mặt]
[8 mặt]
[12 mặt]
[B]

[blank]
[Stp = ____]
[6a²]

[matching]
[Ghép ký hiệu]
[Sxq => Diện tích xung quanh]
[Stp => Diện tích toàn phần]
[Sđáy => Diện tích đáy]
[V => Thể tích]
`)

    expect(items.map((item) => item.questionType)).toEqual(['choice', 'blank', 'matching'])
    expect(items[0]?.answer).toBe('6 mặt')
    expect(items[1]?.answer).toBe('6a²')
  })

  it('reports a clear error when matching misses the separator', () => {
    expect(() => parseTxtBlocks(`
[matching]
[Ghép ký hiệu]
[Sxq - Diện tích xung quanh]
[Stp => Diện tích toàn phần]
`)).toThrow('Matching cần dùng dạng Vế trái => Vế phải.')
  })

  it('requires at least four matching pairs', () => {
    expect(() => parseTxtBlocks(`
[matching]
[Ghép ký hiệu]
[Sxq => Diện tích xung quanh]
[Stp => Diện tích toàn phần]
[Sđáy => Diện tích đáy]
`)).toThrow('Matching cần tối thiểu 4 cặp để giao diện đủ 4 đáp án.')
  })
})
