# スキンケアアプリ

## プロジェクト概要
ユーザーがスキンケア製品をログし、AIが成分パターンを解析して
相性の良い・悪い成分を特定するパーソナルスキンケアアプリ。

## 技術スタック
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Supabase（DB / Auth / Storage / Edge Functions）
- 成分OCR: Gemini API (gemini-3.8-flash / 無料枠) ← Edge Function 経由のみ
  精度不足なら Google Cloud Vision へ差し替えられるよう OcrProvider 型で抽象化してある
  注意: Gemini の無料枠は送信内容が Google の製品改善に使われる
- 商品検索: Yahoo!ショッピング API (v3) ← Edge Function 経由のみ
  JANコード検索に対応。バーコードから製品を特定する経路で使う
- Hosting: Vercel
- 状態管理: Zustand / バリデーション: Zod

## 重要なルール
- API キー（GEMINI_API_KEY / YAHOO_APP_ID 等）はフロントエンドに絶対に書かない
  外部 API は必ず Edge Function 経由で呼び、キーは supabase secrets に置く
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
