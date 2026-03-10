# スキンケアアプリ

## プロジェクト概要
ユーザーがスキンケア製品をログし、AIが成分パターンを解析して
相性の良い・悪い成分を特定するパーソナルスキンケアアプリ。

## 技術スタック
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Supabase（DB / Auth / Storage / Edge Functions）
- AI: Claude API (Sonnet 4.6) ← Edge Function 経由のみ
- Hosting: Vercel
- 状態管理: Zustand / バリデーション: Zod

## 重要なルール
- ANTHROPIC_API_KEY はフロントエンドに絶対に書かない
- 全テーブルに Supabase RLS を設定する（user_id = auth.uid()）
- 環境変数は .env.local に書き、.gitignore に含める
- ブランチは feature/* → develop → main の順に流す

## ディレクトリ構成
src/
  components/  # UI コンポーネント
  hooks/       # カスタム Hook
  lib/         # Supabase クライアント等
  store/       # Zustand ストア
  types/       # TypeScript 型定義
  pages/       # ページコンポーネント
