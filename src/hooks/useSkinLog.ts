import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import type { Database } from '../types/database.types'

type SkinLog = Database['public']['Tables']['skin_logs']['Row'] & {
  skin_log_products: { products: { id: string; name: string } }[]
}

export function useSkinLog() {
  const user = useAuthStore((s) => s.user)
  const [logs, setLogs] = useState<SkinLog[]>([])
  const [loading, setLoading] = useState(true)

  const getSkinLogs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('skin_logs')
      .select('*, skin_log_products(products(id, name))')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch skin logs:', error.message)
    } else {
      setLogs(data ?? [])
    }
    setLoading(false)
  }, [user])

  /** 肌ログを記録する。productIds はそのとき使った製品（任意・複数可） */
  const addSkinLog = async (score: number, memo: string, productIds: string[] = []) => {
    if (!user) return { error: 'Not authenticated' }

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('skin_logs')
      .insert({
        user_id: user.id,
        score,
        memo,
        logged_at: today,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to add skin log:', error.message)
      return { error: error.message }
    }

    if (productIds.length > 0) {
      const { error: linkError } = await supabase
        .from('skin_log_products')
        .insert(productIds.map((product_id) => ({ skin_log_id: data.id, product_id })))

      if (linkError) {
        // 製品が結びつかない肌ログが残ると解析結果が歪むため、ログごと取り消す
        await supabase.from('skin_logs').delete().eq('id', data.id)
        console.error('Failed to link products:', linkError.message)
        return { error: linkError.message }
      }
    }

    await getSkinLogs()
    return { error: null }
  }

  useEffect(() => {
    getSkinLogs()
  }, [getSkinLogs])

  return { logs, loading, addSkinLog, refetch: getSkinLogs }
}
