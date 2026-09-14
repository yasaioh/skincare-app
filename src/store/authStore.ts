import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthState = {
  user: User | null
  /** 初回のセッション取得が終わるまで true */
  loading: boolean
  /** アプリ起動時に一度だけ呼ぶ。2 回目以降は何もしない */
  initialize: () => void
  signUp: (email: string, password: string) => ReturnType<typeof supabase.auth.signUp>
  signIn: (email: string, password: string) => ReturnType<typeof supabase.auth.signInWithPassword>
  signOut: () => ReturnType<typeof supabase.auth.signOut>
}

// 二重購読を防ぐためのフラグ（StrictMode の二重実行対策も兼ねる）
let initialized = false

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  initialize: () => {
    if (initialized) return
    initialized = true

    // 現在のセッションを取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ user: session?.user ?? null, loading: false })
    })

    // ログイン・ログアウトの変化を監視（アプリ全体で 1 本だけ）
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, loading: false })
    })
  },

  signUp: (email, password) => supabase.auth.signUp({ email, password }),
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
}))
