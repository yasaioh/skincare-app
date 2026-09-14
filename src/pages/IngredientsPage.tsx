import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

type Ingredient = {
  id: string
  name_ja: string
  name_inci: string | null
  order_index: number | null
}

type ProductInfo = {
  name: string
  brand: string | null
}

export function IngredientsPage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [product, setProduct] = useState<ProductInfo | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !productId) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('name, brand')
        .eq('id', productId)
        .single()

      if (productError) {
        setError(productError.message)
        setLoading(false)
        return
      }
      setProduct(productData)

      const { data: piData, error: piError } = await supabase
        .from('product_ingredients')
        .select('order_index, ingredients(id, name_ja, name_inci)')
        .eq('product_id', productId)
        .order('order_index', { ascending: true })

      if (piError) {
        setError(piError.message)
      } else {
        const mapped = (piData ?? []).map((row: any) => ({
          id: row.ingredients.id,
          name_ja: row.ingredients.name_ja,
          name_inci: row.ingredients.name_inci,
          order_index: row.order_index,
        }))
        setIngredients(mapped)
      }
      setLoading(false)
    }

    fetchData()
  }, [user, productId])

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200"
        >
          ← 戻る
        </button>
        <div className="min-w-0">
          {product ? (
            <>
              <h1 className="text-xl font-bold text-gray-800 truncate">
                {product.name}
              </h1>
              {product.brand && (
                <p className="text-sm text-gray-500">{product.brand}</p>
              )}
            </>
          ) : (
            !loading && <h1 className="text-xl font-bold text-gray-800">製品情報</h1>
          )}
        </div>
      </div>

      {/* OCRボタン */}
      <button
        onClick={() => alert('OCR成分追加機能は後日実装予定です')}
        className="w-full rounded-lg border-2 border-dashed border-teal-300 bg-teal-50 py-3 text-sm font-medium text-teal-700 hover:bg-teal-100"
      >
        OCRで成分を追加
      </button>

      {/* 成分一覧 */}
      {loading ? (
        <p className="text-sm text-gray-400">読み込み中...</p>
      ) : error ? (
        <p className="text-sm text-red-500">エラー: {error}</p>
      ) : ingredients.length === 0 ? (
        <p className="text-sm text-gray-400">
          成分が登録されていません。「OCRで成分を追加」から登録してください。
        </p>
      ) : (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 mb-3">
            成分一覧（{ingredients.length}件）
          </h2>
          <div className="flex flex-wrap gap-2">
            {ingredients.map((ing) => (
              <span
                key={ing.id}
                className="inline-flex flex-col rounded-full bg-gray-100 px-3 py-1 text-sm"
              >
                <span className="font-medium text-gray-800">{ing.name_ja}</span>
                {ing.name_inci && (
                  <span className="text-xs text-gray-500">{ing.name_inci}</span>
                )}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
