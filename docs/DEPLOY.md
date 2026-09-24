# デプロイ手順

開発用の手順は [SETUP.md](./SETUP.md) を参照。こちらは**常時アクセスできる状態にする**ための手順。

```
[スマホ / PC]
   ↓ HTTPS
[Vercel]  … 画面（静的ファイル）
   ↓
[Supabase クラウド]  … DB / 認証 / Edge Functions
   ↓
Yahoo!ショッピング API / Gemini API
```

開発時は Vite がプロキシで Supabase を中継していたが、**本番にはプロキシが無い**。
そのため `VITE_SUPABASE_URL` には `same-origin` ではなく実際の URL を設定する
（誤って `same-origin` のままビルドした場合は、起動時に例外を投げて気付けるようにしてある）。

---

## ⚠ 先に知っておくこと: 無料プランは自動停止する

**Supabase の無料プロジェクトは、1 週間アクセスが無いと自動的に一時停止される。**
停止するとアプリは動かなくなり、ダッシュボードから手動で再開する必要がある
（再開しても数分かかる）。

「いつでも使える」を厳密に満たすには次のどれかが必要。

- 使う前にダッシュボードで再開する（無料のまま・手間あり）
- 週 1 回以上アクセスする
- Supabase を有料プラン（Pro）にする

なお**停止中のプロジェクトは無料枠のプロジェクト数を消費しない**ので、
枠を空けておきたい用途とは両立する。

---

## 方針: 既存プロジェクトをリセットして使う

無料プランはプロジェクト 2 つまで。1 枠を別アプリ用に残したいので、
新規作成ではなく**既存プロジェクト（`xosaccpkcsqxnmqnnfka`）を作り直す**。

このプロジェクトは開発前に手作業で作られた古いスキーマのままで、
マイグレーション履歴も無い。そのまま `db push` すると
「テーブルが既に存在する」で失敗するため、リセットして作り直す。

> **この操作はクラウド DB の中身を全て消す。** 開発中は一度も使っていないため
> 空のはずだが、念のため手順 1 でバックアップを取る。

---

## 手順

### 0. CLI にログイン（初回のみ）

```bash
npx supabase login
```

### 1. 念のためバックアップを取る

```bash
npx supabase db dump --linked -f backup-$(date +%Y%m%d).sql
```

中身が空なら、ほぼテーブル定義だけの短いファイルになる。
**このファイルはコミットしないこと**（`*.sql` は除外設定に入っていないため、
作業が終わったら消すか、リポジトリ外に移す）。

### 2. クラウド DB をマイグレーションで作り直す

```bash
npx supabase db reset --linked --no-seed
```

- 確認を求められる。DB パスワードを聞かれたらダッシュボードの
  Project Settings → Database から取得する
- `--no-seed` を付けるのは、`seed.sql` が開発用のダミー製品データのため。
  本番に架空の製品を入れたくない
- 適用されるのは `supabase/migrations/` の 2 ファイル
  （テーブル定義・RLS・profiles 自動作成トリガー・JAN の一意制約）

適用結果の確認:

```bash
npx supabase migration list --linked
```

### 3. API キーをクラウド側に設定する

```bash
npx supabase secrets set YAHOO_APP_ID=値 GEMINI_API_KEY=値
```

ローカルの `supabase/functions/.env` はクラウドには反映されないので、別途設定が必要。
設定済みのキー名だけ確認する場合は `npx supabase secrets list`。

### 4. Edge Functions をデプロイする

```bash
npx supabase functions deploy
```

`search-products` と `parse-ingredients` の 2 つが配信される。
`config.toml` の `verify_jwt = true` が効くので、ログイン済みユーザーのみ呼べる。

### 5. Vercel にデプロイする

```bash
npx vercel login
npx vercel link          # プロジェクトを作成・紐付け
```

環境変数を設定する。値はダッシュボードの Project Settings → API から取得する。

```bash
npx vercel env add VITE_SUPABASE_URL production
#   → https://xosaccpkcsqxnmqnnfka.supabase.co を入力

npx vercel env add VITE_SUPABASE_ANON_KEY production
#   → anon / publishable キーを入力
```

対話的に入力するので、キーがシェル履歴に残らない。
プレビュー環境でも使うなら `production` を `preview` に変えて同じ操作をする。

```bash
npx vercel --prod
```

`vercel.json` に SPA 用の書き換え規則を入れてあるので、
`/skin-log` などへ直接アクセスしても 404 にならない。

---

## デプロイ後の確認

| # | 確認内容 | 期待する結果 |
|---|---|---|
| 1 | 発行された URL をスマホで開く | ログイン画面が出る |
| 2 | 新規登録 | そのままログインできる（メール確認は無効設定） |
| 3 | 「化粧水」で検索 | 商品画像つきの候補が並ぶ（= Edge Function とキーが有効） |
| 4 | 製品を追加 → 成分を撮影 | 読み取り結果が出る（= Gemini が有効） |
| 5 | 肌ログを記録 | 一覧に残る（= RLS が正しく通っている） |

3 が失敗する場合は手順 3・4 を、2 が失敗する場合は手順 2 を見直す。

---

## うまくいかないとき

| 症状 | 原因と対処 |
|---|---|
| 画面は出るが何も動かない | `VITE_SUPABASE_URL` が未設定か `same-origin` のまま。設定し直して再デプロイ |
| コンソールに `same-origin は開発専用` の例外 | 上と同じ。Vercel の環境変数を設定する |
| 検索と OCR だけ失敗する | `supabase secrets set` を忘れている。設定後 `functions deploy` を再実行 |
| 数日ぶりに開いたら繋がらない | 無料プランの自動停止。ダッシュボードから再開する |
| `db reset --linked` が失敗する | DB パスワードが違う。Project Settings → Database で確認・再設定 |
| ページ再読み込みで 404 | `vercel.json` が反映されていない。再デプロイする |

---

## 更新するとき

```bash
git push                        # Vercel と連携済みなら自動でデプロイされる
npx supabase functions deploy   # Edge Function を変えたとき
npx supabase db push            # マイグレーションを追加したとき（reset は不要）
```

2 回目以降は `db reset` ではなく `db push` を使う（既存データを保持したまま差分だけ適用する）。
事前に `npx supabase db push --dry-run` で何が適用されるか確認できる。
