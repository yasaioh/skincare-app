import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// トンネル経由でスマホから確認するときは TUNNEL=1 を付けて起動する
//   例: TUNNEL=1 npm run dev
const viaTunnel = process.env.TUNNEL === '1'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // トンネルからの接続を受けるため 0.0.0.0 で待ち受ける
    host: true,

    // トンネルの URL は起動ごとに変わるため、ドメイン全体を許可する。
    // 先頭の "." はそのドメインのサブドメインすべてを含む指定。
    // allowedHosts: true は任意のサイトから開発サーバーを叩けてしまうため使わない。
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.app', '.loca.lt'],

    // Supabase 宛ての通信を同一オリジンで中継する。
    // これによりトンネルは 5173 の 1 本で済み、
    // CORS も混在コンテンツ（HTTPS ページから HTTP API を呼ぶ問題）も起きない。
    proxy: {
      '/supabase': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/supabase/, ''),
      },
    },

    // HMR はトンネル越しだと wss / 443 へ繋ぎにいく必要がある
    hmr: viaTunnel ? { protocol: 'wss', clientPort: 443 } : undefined,
  },
})
