import { z } from 'zod'

export const uuidSchema = z.string().uuid()
export const moneySchema = z.number().finite().positive().max(Number.MAX_SAFE_INTEGER)
export const isoDateSchema = z.string().datetime({ offset: true })

export function parseSearchParams(params: URLSearchParams) {
  const pageValue = Number(params.get('page') || 1)
  const sizeValue = Number(params.get('pageSize') || 20)
  return {
    page: Number.isFinite(pageValue) ? Math.max(1, pageValue) : 1,
    pageSize: Number.isFinite(sizeValue) ? Math.min(100, Math.max(1, sizeValue)) : 20,
    query: (params.get('q') || '').trim(),
  }
}
