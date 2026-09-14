import { useCallback, useEffect, useRef, useState } from 'react'
import { invokeFunction } from '../lib/functions'

/** Edge Function (search-products) が返す 1 件分 */
export type ProductHit = {
  name: string
  brand: string | null
  janCode: string | null
  imageUrl: string | null
  price: number | null
  itemUrl: string | null
  itemCode: string | null
}

type SearchResponse = { hits: ProductHit[] }

/** Yahoo! 側が「1クエリ/秒」制限なので、キーワード入力はこの間隔だけ待ってから投げる */
const DEBOUNCE_MS = 800

export function useProductSearch() {
  const [hits, setHits] = useState<ProductHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 遅い応答が新しい応答を上書きしないように、最後のリクエストだけ採用する
  const requestIdRef = useRef(0)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const run = useCallback(async (body: { query?: string; janCode?: string }) => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const data = await invokeFunction<SearchResponse>('search-products', body)
      if (requestId !== requestIdRef.current) return
      setHits(data.hits ?? [])
    } catch (e) {
      if (requestId !== requestIdRef.current) return
      setError(e instanceof Error ? e.message : '検索に失敗しました')
      setHits([])
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
        setSearched(true)
      }
    }
  }, [])

  /** キーワード検索（入力のたびに呼んでよい。デバウンスされる） */
  const searchByKeyword = useCallback(
    (query: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)

      const trimmed = query.trim()
      if (!trimmed) {
        requestIdRef.current++ // 進行中の結果を捨てる
        setHits([])
        setError(null)
        setLoading(false)
        setSearched(false)
        return
      }

      setLoading(true)
      timerRef.current = setTimeout(() => run({ query: trimmed }), DEBOUNCE_MS)
    },
    [run],
  )

  /** JAN コード検索（バーコードを読み取った直後に呼ぶ。待たせる意味がないので即時） */
  const searchByJanCode = useCallback(
    (janCode: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      return run({ janCode })
    },
    [run],
  )

  return { hits, loading, error, searched, searchByKeyword, searchByJanCode }
}
