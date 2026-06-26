import type { GeometryEdge } from '@/types/geo-ai'

function formatLength(value: number): string {
  return value.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })
}

export function edgeExplanation(edge: GeometryEdge, unit?: string): string {
  const name = `${edge.from}${edge.to}`
  if (edge.length === undefined || !Number.isFinite(edge.length)) {
    return `Đây là cạnh ${name}.`
  }

  return measuredEdgeExplanation(name, edge.length, unit)
}

export function measuredEdgeExplanation(name: string, length: number, unit?: string): string {
  return `Cạnh ${name} có độ dài là ${formatLength(length)} ${unit?.trim() || 'đơn vị'}.`
}
