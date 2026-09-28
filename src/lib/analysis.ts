/**
 * 肌ログと使用製品から、成分ごとの相性の傾向を集計する。
 *
 * 考え方:
 *   ある成分を含む製品を使った記録の平均スコアと、含まない記録の平均スコアを比べる。
 *   差がプラスなら「合いそう」、マイナスなら「合わなさそう」。
 *
 * 限界:
 *   記録数が少ないと偶然の影響が大きいため、件数の下限を設けて判定から外す。
 *   いつも同じ記録にだけ現れる成分同士はデータ上区別できないため、1 グループにまとめる。
 *   これは統計的な「傾向」であり、医学的な診断ではない。
 */

/** 成分を含む記録がこれ未満なら判定しない */
export const MIN_WITH = 3
/** 成分を含まない記録がこれ未満なら比較対象が無いため判定しない */
export const MIN_WITHOUT = 2
/** 平均スコアの差がこれ以上なら「合いそう / 合わなさそう」とみなす */
export const DIFF_THRESHOLD = 0.5

export type AnalysisEntry = {
  score: number | null
  productIds: string[]
}

export type IngredientRef = { id: string; name: string }

export type IngredientGroupStat = {
  /** 常に同じ記録に現れるため区別できない成分の集まり（通常は 1 つ） */
  ingredients: IngredientRef[]
  withCount: number
  withoutCount: number
  avgWith: number
  avgWithout: number
  /** avgWith - avgWithout */
  diff: number
}

export type AnalysisResult = {
  /** スコアと製品の両方がそろっていて集計に使えた記録数 */
  analyzedCount: number
  good: IngredientGroupStat[]
  bad: IngredientGroupStat[]
  /** 判定できたが差が小さいもの */
  neutral: IngredientGroupStat[]
  /** 件数不足で判定しなかった成分数 */
  insufficientCount: number
}

const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length

export function analyzeIngredients(
  entries: AnalysisEntry[],
  ingredientsByProduct: Map<string, IngredientRef[]>,
): AnalysisResult {
  // 集計に使える記録だけ残し、記録ごとの成分集合を作る（同じ成分を含む製品を併用しても 1 回と数える）
  const usable = entries
    .filter((e): e is AnalysisEntry & { score: number } => e.score !== null && e.productIds.length > 0)
    .map((e) => {
      const ingredientIds = new Set<string>()
      for (const productId of e.productIds) {
        for (const ing of ingredientsByProduct.get(productId) ?? []) ingredientIds.add(ing.id)
      }
      return { score: e.score, ingredientIds }
    })

  const refs = new Map<string, IngredientRef>()
  for (const list of ingredientsByProduct.values()) {
    for (const ing of list) refs.set(ing.id, ing)
  }

  // 成分ごとに「含む記録の番号」を集め、同じ並びの成分をまとめる
  const appearances = new Map<string, number[]>()
  usable.forEach((entry, index) => {
    for (const id of entry.ingredientIds) {
      const list = appearances.get(id) ?? []
      list.push(index)
      appearances.set(id, list)
    }
  })

  const groups = new Map<string, { ids: string[]; indices: number[] }>()
  for (const [id, indices] of appearances) {
    const key = indices.join(',')
    const group = groups.get(key) ?? { ids: [], indices }
    group.ids.push(id)
    groups.set(key, group)
  }

  const good: IngredientGroupStat[] = []
  const bad: IngredientGroupStat[] = []
  const neutral: IngredientGroupStat[] = []
  let insufficientCount = 0

  for (const { ids, indices } of groups.values()) {
    const withCount = indices.length
    const withoutCount = usable.length - withCount
    if (withCount < MIN_WITH || withoutCount < MIN_WITHOUT) {
      insufficientCount += ids.length
      continue
    }

    const included = new Set(indices)
    const avgWith = average(indices.map((i) => usable[i].score))
    const avgWithout = average(usable.filter((_, i) => !included.has(i)).map((e) => e.score))
    const stat: IngredientGroupStat = {
      ingredients: ids
        .map((id) => refs.get(id))
        .filter((v): v is IngredientRef => Boolean(v))
        .sort((a, b) => a.name.localeCompare(b.name, 'ja')),
      withCount,
      withoutCount,
      avgWith,
      avgWithout,
      diff: avgWith - avgWithout,
    }

    if (stat.diff >= DIFF_THRESHOLD) good.push(stat)
    else if (stat.diff <= -DIFF_THRESHOLD) bad.push(stat)
    else neutral.push(stat)
  }

  good.sort((a, b) => b.diff - a.diff)
  bad.sort((a, b) => a.diff - b.diff)
  neutral.sort((a, b) => b.diff - a.diff)

  return { analyzedCount: usable.length, good, bad, neutral, insufficientCount }
}
