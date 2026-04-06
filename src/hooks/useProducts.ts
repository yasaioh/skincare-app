import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database.types'

type Product = Tables<'products'>
type UserProduct = Tables<'user_products'> & { products: Product }

export function useProducts(userId: string | undefined) {
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [userProducts, setUserProducts] = useState<UserProduct[]>([])
  const [loading, setLoading] = useState(false)
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

  const searchProducts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    setLoading(true)
    setError(null)

    const pattern = `%${query}%`
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`name.ilike.${pattern},brand.ilike.${pattern}`)
      .order('name')
      .limit(20)

    if (error) {
      setError(error.message)
    } else {
      setSearchResults(data ?? [])
    }
    setLoading(false)
  }

  const addUserProduct = async (productId: string) => {
    if (!userId) return
    setError(null)

    const { error } = await supabase
      .from('user_products')
      .insert({ user_id: userId, product_id: productId })

    if (error) {
      setError(error.message)
    } else {
      await getUserProducts()
    }
  }

  const registeredProductIds = new Set(
    userProducts.map((up) => up.product_id)
  )

  return {
    searchResults,
    userProducts,
    loading,
    userProductsLoading,
    error,
    searchProducts,
    addUserProduct,
    registeredProductIds,
  }
}
