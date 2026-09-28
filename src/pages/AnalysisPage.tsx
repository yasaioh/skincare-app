import { useAnalysis } from '../hooks/useAnalysis'
import { MIN_WITH, MIN_WITHOUT, type IngredientGroupStat } from '../lib/analysis'

function StatCard({ stat, tone }: { stat: IngredientGroupStat; tone: 'good' | 'bad' }) {
  const sign = stat.diff > 0 ? '+' : ''
  return (
    <li className="rounded-lg bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-800">
          {stat.ingredients.map((i) => i.name).join('・')}
        </p>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold ${
            tone === 'good' ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'
          }`}
        >
          {sign}
          {stat.diff.toFixed(1)}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        使ったとき 平均 {stat.avgWith.toFixed(1)}（{stat.withCount} 件） / 使わなかったとき 平均{' '}
        {stat.avgWithout.toFixed(1)}（{stat.withoutCount} 件）
      </p>
      {stat.ingredients.length > 1 && (
        <p className="mt-1 text-xs text-gray-400">
          これらはいつも一緒に使われているため、どれの影響かは区別できません。
        </p>
      )}
    </li>
  )
}

export function AnalysisPage() {
  const { result, loading, error } = useAnalysis()

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="text-xl font-bold text-gray-800">成分分析</h1>
      <p className="mt-1 text-sm text-gray-500">
        肌ログで「使った製品」を選んだ記録から、成分ごとの肌の調子の傾向を出します。
        医学的な診断ではなく、あなたの記録上の傾向です。
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-gray-400">集計中...</p>
      ) : error ? (
        <p className="mt-6 text-sm text-red-600">{error}</p>
      ) : !result || (result.good.length === 0 && result.bad.length === 0) ? (
        <div className="mt-6 rounded-lg bg-white p-4 text-sm text-gray-600 shadow-sm">
          <p>まだ傾向を判定できるほどの記録がありません。</p>
          <p className="mt-2 text-xs text-gray-400">
            集計できた記録: {result?.analyzedCount ?? 0} 件。成分ごとに「含む記録が {MIN_WITH}{' '}
            件以上」「含まない記録が {MIN_WITHOUT} 件以上」あると判定できます。
            成分が未登録の製品は、製品ログから成分を登録してください。
          </p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-xs text-gray-400">
            集計できた記録: {result.analyzedCount} 件 / 記録不足で判定しなかった成分:{' '}
            {result.insufficientCount} 種
          </p>

          <section className="mt-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">合いそうな成分</h2>
            {result.good.length === 0 ? (
              <p className="text-sm text-gray-400">該当なし</p>
            ) : (
              <ul className="space-y-3">
                {result.good.map((stat) => (
                  <StatCard key={stat.ingredients[0].id} stat={stat} tone="good" />
                ))}
              </ul>
            )}
          </section>

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">合わなさそうな成分</h2>
            {result.bad.length === 0 ? (
              <p className="text-sm text-gray-400">該当なし</p>
            ) : (
              <ul className="space-y-3">
                {result.bad.map((stat) => (
                  <StatCard key={stat.ingredients[0].id} stat={stat} tone="bad" />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
