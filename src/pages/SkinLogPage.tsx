import { useState } from 'react'
import { useSkinLog } from '../hooks/useSkinLog'

const SCORES = [1, 2, 3, 4, 5] as const

export function SkinLogPage() {
  const { logs, loading, addSkinLog } = useSkinLog()
  const [score, setScore] = useState<number | null>(null)
  const [memo, setMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const hasLoggedToday = logs.some((log) => log.logged_at === today)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (score === null) return
    setSubmitting(true)
    setError('')

    const result = await addSkinLog(score, memo)
    if (result.error) {
      setError(result.error)
    } else {
      setScore(null)
      setMemo('')
    }
    setSubmitting(false)
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="text-xl font-bold text-gray-800">肌ログ</h1>
      <p className="mt-1 text-sm text-gray-500">今日の肌の状態を記録しましょう。</p>

      {/* 入力フォーム or 記録済み表示 */}
      <section className="mt-6">
        {hasLoggedToday ? (
          <div className="rounded-lg bg-green-50 p-4 text-center text-green-700">
            今日は記録済みです
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-4 shadow">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                今日のスコア
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
              <label htmlFor="memo" className="mb-1 block text-sm font-medium text-gray-700">
                メモ
              </label>
              <textarea
                id="memo"
                rows={3}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="肌の状態やケア内容など"
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
        )}
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
