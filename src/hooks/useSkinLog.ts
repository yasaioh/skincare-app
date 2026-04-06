import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Database } from '../types/database.types'

type SkinLog = Database['public']['Tables']['skin_logs']['Row']

export function useSkinLog() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<SkinLog[]>([])
  const [loading, setLoading] = useState(true)

  const getSkinLogs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('skin_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch skin logs:', error.message)
    } else {
      setLogs(data ?? [])
    }
    setLoading(false)
  }, [user])

  const addSkinLog = async (score: number, memo: string) => {
    if (!user) return { error: 'Not authenticated' }

    const today = new Date().toISOString().split('T')[0]

    const { error } = await supabase.from('skin_logs').insert({
      user_id: user.id,
      score,
      memo,
      logged_at: today,
    })

    if (error) {
      console.error('Failed to add skin log:', error.message)
      return { error: error.message }
    }

    await getSkinLogs()
    return { error: null }
  }

  useEffect(() => {
    getSkinLogs()
  }, [getSkinLogs])

  return { logs, loading, addSkinLog, refetch: getSkinLogs }
}
