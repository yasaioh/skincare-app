import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const configuredUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

// 本番ビルドでの設定漏れは、そのまま動かすと supabase-js の
// "supabaseUrl is required" という原因の分かりにくい例外になる。
// 何をどこに設定すべきかが分かる形で止める。
if (import.meta.env.PROD) {
  if (!configuredUrl || !supabaseAnon) {
    throw new Error(
      'VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY が未設定です。' +
        'Vercel の Environment Variables に設定し、再デプロイしてください' +
        '（環境変数はビルド時に埋め込まれるため、追加だけでは反映されません）',
    )
  }
  // same-origin は開発サーバーのプロキシ前提の指定なので本番では成立しない
  if (configuredUrl === 'same-origin') {
    throw new Error(
      '本番ビルドでは VITE_SUPABASE_URL に Supabase の実際の URL を設定してください（same-origin は開発専用）',
    )
  }
}

// 開発時は .env.local に "same-origin" と書いておけば、表示中の画面のオリジン
// + /supabase を使う。トンネル経由で URL が毎回変わっても書き換えずに済む。
// /supabase は vite.config.ts のプロキシで Supabase 本体へ中継される。
const supabaseUrl =
  configuredUrl === 'same-origin'
    ? `${window.location.origin}/supabase`
    : configuredUrl

export const supabase = createClient<Database>(supabaseUrl, supabaseAnon)
