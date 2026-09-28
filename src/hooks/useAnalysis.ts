import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { analyzeIngredients, type AnalysisResult, type IngredientRef } from '../lib/analysis'
import { useAuthStore } from '../store/authStore'

/** 自分の肌ログと使用製品の成分を取得し、成分ごとの傾向を集計する */
export function useAnalysis() {
  const user = useAuthStore((s) => s.user)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data: logs, error: logError } = await supabase
        .from('skin_logs')
        .select('score, skin_log_products(product_id)')
        .eq('user_id', user.id)
      if (logError) throw logError

      const entries = (logs ?? []).map((log) => ({
        score: log.score,
        productIds: log.skin_log_products.map((p) => p.product_id),
      }))

      const productIds = [...new Set(entries.flatMap((e) => e.productIds))]
      const ingredientsByProduct = new Map<string, IngredientRef[]>()

      if (productIds.length > 0) {
        const { data: rows, error: piError } = await supabase
          .from('product_ingredients')
          .select('product_id, ingredients(id, name_ja)')
          .in('product_id', productIds)
        if (piError) throw piError

        for (const row of rows ?? []) {
          const list = ingredientsByProduct.get(row.product_id) ?? []
          list.push({ id: row.ingredients.id, name: row.ingredients.name_ja })
          ingredientsByProduct.set(row.product_id, list)
        }
      }

      setResult(analyzeIngredients(entries, ingredientsByProduct))
    } catch (e) {
      setError(e instanceof Error ? e.message : '集計に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    run()
  }, [run])

  return { result, loading, error, refetch: run }
}
