import { describe, expect, it } from 'vitest'
import { analyzeIngredients, type AnalysisEntry, type IngredientRef } from './analysis'

const water = { id: 'water', name: '水' }
const bg = { id: 'bg', name: 'BG' }
const alcohol = { id: 'alcohol', name: 'エタノール' }
const niacinamide = { id: 'nia', name: 'ナイアシンアミド' }

const products = new Map<string, IngredientRef[]>([
  ['toner', [water, bg, alcohol]],
  ['serum', [water, niacinamide]],
])

const log = (score: number | null, ...productIds: string[]): AnalysisEntry => ({ score, productIds })

describe('analyzeIngredients', () => {
  it('成分を含む記録と含まない記録の平均差で判定する', () => {
    const entries = [
      log(2, 'toner'),
      log(1, 'toner'),
      log(2, 'toner'),
      log(5, 'serum'),
      log(4, 'serum'),
      log(5, 'serum'),
    ]
    const result = analyzeIngredients(entries, products)

    expect(result.analyzedCount).toBe(6)
    // toner にだけ入る BG とエタノールは区別できないので 1 グループになる
    expect(result.bad).toHaveLength(1)
    expect(result.bad[0].ingredients.map((i) => i.name)).toEqual(['BG', 'エタノール'])
    expect(result.bad[0].diff).toBeCloseTo(5 / 3 - 14 / 3)
    expect(result.good[0].ingredients.map((i) => i.name)).toEqual(['ナイアシンアミド'])
    // 水はすべての記録に入っていて比較対象が無い
    expect(result.insufficientCount).toBe(1)
  })

  it('スコアが無い記録と製品を選んでいない記録は集計から除く', () => {
    const result = analyzeIngredients([log(null, 'toner'), log(3)], products)
    expect(result.analyzedCount).toBe(0)
    expect(result.good).toEqual([])
    expect(result.bad).toEqual([])
  })

  it('同じ成分を含む製品を併用しても 1 回と数える', () => {
    const entries = [
      log(3, 'toner', 'serum'),
      log(3, 'toner', 'serum'),
      log(3, 'toner', 'serum'),
      log(3, 'serum'),
      log(3, 'serum'),
    ]
    const result = analyzeIngredients(entries, products)
    const tonerGroup = result.neutral.find((s) => s.ingredients.some((i) => i.id === 'bg'))
    expect(tonerGroup?.withCount).toBe(3)
    expect(tonerGroup?.withoutCount).toBe(2)
    expect(tonerGroup?.diff).toBe(0)
  })

  it('件数が下限に満たない成分は判定しない', () => {
    const entries = [log(1, 'toner'), log(5, 'serum'), log(5, 'serum')]
    const result = analyzeIngredients(entries, products)
    expect(result.good).toEqual([])
    expect(result.bad).toEqual([])
    expect(result.insufficientCount).toBe(4)
  })
})
