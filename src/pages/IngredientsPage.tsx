import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { invokeFunction } from '../lib/functions'
import { fileToResizedBase64 } from '../lib/image'

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

type OcrResponse = { ingredients: string[] }

export function IngredientsPage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [product, setProduct] = useState<ProductInfo | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // OCR の読み取り結果。登録前にユーザーが誤読を取り除けるようにする
  const [ocrResult, setOcrResult] = useState<string[] | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = async () => {
    if (!productId) return
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
      setIngredients(
        (piData ?? []).map((row) => ({
          id: row.ingredients.id,
          name_ja: row.ingredients.name_ja,
          name_inci: row.ingredients.name_inci,
          order_index: row.order_index,
        })),
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!user || !productId) return
    fetchData()
    // productId が変わったときだけ読み直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, productId])

  /** 写真を選んだら縮小して Edge Function に送り、成分名の候補を受け取る */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // 同じ写真をもう一度選べるように値をリセットしておく
    e.target.value = ''
    if (!file) return

    setOcrLoading(true)
    setError(null)
    try {
      const { base64, mimeType } = await fileToResizedBase64(file)
      const data = await invokeFunction<OcrResponse>('parse-ingredients', {
        imageBase64: base64,
        mimeType,
      })
      setOcrResult(data.ingredients ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '成分の読み取りに失敗しました')
    } finally {
      setOcrLoading(false)
    }
  }

  /** 確認後の成分リストを ingredients と product_ingredients に登録する */
  const handleSave = async () => {
    if (!productId || !ocrResult || ocrResult.length === 0) return
    setSaving(true)
    setError(null)
    try {
      // 1. 既にマスタにある成分を引く
      const { data: existing, error: selectError } = await supabase
        .from('ingredients')
        .select('id, name_ja')
        .in('name_ja', ocrResult)
      if (selectError) throw selectError

      const idByName = new Map((existing ?? []).map((row) => [row.name_ja, row.id]))

      // 2. 無いものだけ追加する（ingredients に UPDATE 権限は無いので upsert は使わない）
      const missing = ocrResult.filter((name) => !idByName.has(name))
      if (missing.length > 0) {
        const { data: inserted, error: insertError } = await supabase
          .from('ingredients')
          .insert(missing.map((name_ja) => ({ name_ja })))
          .select('id, name_ja')
        if (insertError) throw insertError
        for (const row of inserted ?? []) idByName.set(row.name_ja, row.id)
      }

      // 3. 製品と成分を表示順で紐付ける（既存の組み合わせは無視）
      const links = ocrResult
        .map((name, index) => ({
          product_id: productId,
          ingredient_id: idByName.get(name),
          order_index: index + 1,
        }))
        .filter((row): row is { product_id: string; ingredient_id: string; order_index: number } =>
          Boolean(row.ingredient_id),
        )

      const { error: linkError } = await supabase
        .from('product_ingredients')
        .upsert(links, { onConflict: 'product_id,ingredient_id', ignoreDuplicates: true })
      if (linkError) throw linkError

      setOcrResult(null)
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : '成分の登録に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
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
              <h1 className="truncate text-xl font-bold text-gray-800">{product.name}</h1>
              {product.brand && <p className="text-sm text-gray-500">{product.brand}</p>}
            </>
          ) : (
            !loading && <h1 className="text-xl font-bold text-gray-800">製品情報</h1>
          )}
        </div>
      </div>

      {/* OCR 入力 */}
      <section>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={ocrLoading}
          className="w-full rounded-lg border-2 border-dashed border-teal-300 bg-teal-50 py-3 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50"
        >
          {ocrLoading ? '読み取り中...' : '全成分表示の写真から成分を追加'}
        </button>
        <p className="mt-1 text-center text-xs text-gray-400">
          パッケージの成分表示にピントを合わせて、できるだけ大きく写してください
        </p>
      </section>

      {error && <p className="text-sm text-red-500">エラー: {error}</p>}

      {/* OCR 結果の確認 */}
      {ocrResult && (
        <section className="rounded-lg border border-teal-200 bg-teal-50/50 p-4">
          <h2 className="text-sm font-semibold text-gray-700">
            読み取り結果の確認（{ocrResult.length}件）
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            誤読があれば × で取り除いてから登録してください。
          </p>

          {ocrResult.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              成分を読み取れませんでした。もう少し近づけて撮り直してください。
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {ocrResult.map((name, index) => (
                <span
                  key={`${name}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm text-gray-800 shadow-sm"
                >
                  {name}
                  <button
                    onClick={() => setOcrResult(ocrResult.filter((_, i) => i !== index))}
                    className="text-gray-400 hover:text-red-500"
                    aria-label={`${name} を除外`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || ocrResult.length === 0}
              className="rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50"
            >
              {saving ? '登録中...' : 'この内容で登録'}
            </button>
            <button
              onClick={() => setOcrResult(null)}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-600 hover:bg-gray-200"
            >
              やめる
            </button>
          </div>
        </section>
      )}

      {/* 成分一覧 */}
      {loading ? (
        <p className="text-sm text-gray-400">読み込み中...</p>
      ) : ingredients.length === 0 ? (
        <p className="text-sm text-gray-400">成分がまだ登録されていません。</p>
      ) : (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-500">
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
