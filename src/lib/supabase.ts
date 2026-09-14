import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

// トンネル経由で確認するときは URL が起動ごとに変わるため、
// .env.local に "same-origin" と書いておけば、表示中の画面のオリジン + /supabase を使う。
// /supabase は vite.config.ts のプロキシで Supabase 本体へ中継される。
const configuredUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseUrl =
  configuredUrl === 'same-origin'
    ? `${window.location.origin}/supabase`
    : configuredUrl

const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnon)
