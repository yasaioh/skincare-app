import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database.types'
import type { ProductHit } from './useProductSearch'

type Product = Tables<'products'>
type UserProduct = Tables<'user_products'> & { products: Product }

/** 一意制約違反。同じ製品が同時に登録されたときに返る */
const UNIQUE_VIOLATION = '23505'

/**
 * 検索結果の製品が products に既にあればその id を、無ければ作って id を返す。
 * JAN があれば JAN を優先。無い場合は 製品名 + ブランド で突き合わせる。
 */
async function findOrCreateProduct(hit: ProductHit): Promise<string> {
  const findExisting = async () => {
    const base = supabase.from('products').select('id').limit(1)
    const query = hit.janCode
      ? base.eq('jan_code', hit.janCode)
      : hit.brand
        ? base.eq('name', hit.name).eq('brand', hit.brand)
        : base.eq('name', hit.name).is('brand', null)

    const { data, error } = await query.maybeSingle()
    if (error) throw error
    return data?.id ?? null
  }

  const existingId = await findExisting()
  if (existingId) return existingId

  const { data, error } = await supabase
    .from('products')
    .insert({
      name: hit.name,
      brand: hit.brand,
      image_url: hit.imageUrl,
      jan_code: hit.janCode,
    })
    .select('id')
    .single()

  if (error) {
    // 入れ違いで登録された場合は取り直す
    if (error.code === UNIQUE_VIOLATION) {
      const retried = await findExisting()
      if (retried) return retried
    }
    throw error
  }
  return data.id
}

export function useProducts(userId: string | undefined) {
  const [userProducts, setUserProducts] = useState<UserProduct[]>([])
  const [userProductsLoading, setUserProductsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getUserProducts = useCallback(async () => {
    if (!userId) return
    setUserProductsLoading(true)
    const { data, error } = await supabase
      .from('user_products')
      .select('*, products(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setUserProducts(data as UserProduct[])
    }
    setUserProductsLoading(false)
  }, [userId])

  useEffect(() => {
    getUserProducts()
  }, [getUserProducts])

  /** 検索結果の製品を、製品マスタと自分の製品ログの両方に登録する */
  const registerProduct = async (hit: ProductHit) => {
    if (!userId) return
    setError(null)
    try {
      const productId = await findOrCreateProduct(hit)

      const { error: linkError } = await supabase
        .from('user_products')
        .upsert(
          { user_id: userId, product_id: productId },
          { onConflict: 'user_id,product_id', ignoreDuplicates: true },
        )
      if (linkError) throw linkError

      await getUserProducts()
    } catch (e) {
      setError(e instanceof Error ? e.message : '製品の登録に失敗しました')
    }
  }

  /** 登録済み判定用。JAN が取れない製品もあるので名前でも持っておく */
  const registeredJanCodes = new Set(
    userProducts.map((up) => up.products.jan_code).filter((v): v is string => Boolean(v)),
  )
  const registeredNames = new Set(userProducts.map((up) => up.products.name))

  const isRegistered = (hit: ProductHit) =>
    (hit.janCode ? registeredJanCodes.has(hit.janCode) : false) || registeredNames.has(hit.name)

  return {
    userProducts,
    userProductsLoading,
    error,
    registerProduct,
    isRegistered,
    refetch: getUserProducts,
  }
}
