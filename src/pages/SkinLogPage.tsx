import { useState } from 'react'
import { useSkinLog } from '../hooks/useSkinLog'
import { useProducts } from '../hooks/useProducts'
import { useAuthStore } from '../store/authStore'

const SCORES = [1, 2, 3, 4, 5] as const

export function SkinLogPage() {
  const { logs, loading, addSkinLog } = useSkinLog()
  const userId = useAuthStore((s) => s.user?.id)
  const { userProducts } = useProducts(userId)
  const [score, setScore] = useState<number | null>(null)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [memo, setMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (score === null) return
    setSubmitting(true)
    setError('')

    const result = await addSkinLog(score, memo, selectedProductIds)
    if (result.error) {
      setError(result.error)
    } else {
      setScore(null)
      setMemo('')
      setSelectedProductIds([])
    }
    setSubmitting(false)
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="text-xl font-bold text-gray-800">肌ログ</h1>
      <p className="mt-1 text-sm text-gray-500">
        記録したいときに、肌の状態と使った製品を残しましょう。
      </p>

      {/* 入力フォーム */}
      <section className="mt-6">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-4 shadow">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              肌の調子
            </label>
            <div className="flex gap-2">
              {SCORES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScore(s)}
                  className={`h-10 w-10 rounded-full text-sm font-bold transition ${
                    score === s
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-gray-700">
              使った製品<span className="ml-1 text-xs font-normal text-gray-400">（任意・成分分析に使います）</span>
            </span>
            {userProducts.length === 0 ? (
              <p className="text-xs text-gray-400">製品ログに製品を登録すると選べるようになります。</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {userProducts.map(({ products: product }) => {
                  const selected = selectedProductIds.includes(product.id)
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => toggleProduct(product.id)}
                      aria-pressed={selected}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        selected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {product.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="memo" className="mb-1 block text-sm font-medium text-gray-700">
              メモ
            </label>
            <textarea
              id="memo"
              rows={3}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="使用感や肌の状態など"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={score === null || submitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? '記録中...' : '記録する'}
          </button>
        </form>
      </section>

      {/* ログ一覧 */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">過去のログ</h2>
        {loading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-400">まだログがありません。</p>
        ) : (
          <ul className="space-y-3">
            {logs.map((log) => (
              <li key={log.id} className="rounded-lg bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{log.logged_at}</span>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-sm font-bold text-indigo-700">
                    {log.score}
                  </span>
                </div>
                {log.skin_log_products.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {log.skin_log_products.map(({ products: product }) => (
                      <span
                        key={product.id}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                      >
                        {product.name}
                      </span>
                    ))}
                  </div>
                )}
                {log.memo && (
                  <p className="mt-1 text-sm text-gray-600">{log.memo}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
