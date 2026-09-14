# 開発環境のセットアップと動作確認

開発は PC、動作想定はスマホ。この差によって**一部の機能は PC でしか確認できない**ため、
どこで何が確認できるかを明記する。

## 全体像

```
[ブラウザ]
   │  画面        → Vite            (PC: 5173)
   │  DB / 認証   → Supabase local  (PC: 54321)
   │  外部API     → Edge Functions  (Supabase 54321 経由)
                        ├─ search-products  → Yahoo!ショッピング API
                        └─ parse-ingredients → Gemini API
```

API キーはすべて Edge Function 側にあり、ブラウザには渡らない。

---

## 1. 必要なキー（2つ）

| キー | 取得先 | 用途 | 費用 |
|---|---|---|---|
| `YAHOO_APP_ID` | [Yahoo!デベロッパーネットワーク](https://e.developer.yahoo.co.jp/register) | 製品検索・JANコード検索 | 無料 |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) | 成分表示のOCR | 無料枠（カード登録不要） |

> Gemini の無料枠は、送信した内容が Google の製品改善に使われる。
> 成分表示の写真が対象なので個人情報ではないが、把握した上で使うこと。

---

## 2. 初回セットアップ

### 2-1. Edge Function 用のキー

`supabase/functions/.env` を作る（このファイルは `.gitignore` 済み）。

```bash
YAHOO_APP_ID=取得したClientID
GEMINI_API_KEY=取得したAPIキー
```

### 2-2. フロント用の接続先

`.env.local`（作成済み・`.gitignore` 済み）。PC で開発する間はこのままでよい。

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=（ローカル共通の公開キー。秘密ではない）
```

### 2-3. DB の準備

```bash
npx supabase start          # 起動していなければ
npx supabase migration up   # 差分のマイグレーションを適用
```

DB を作り直したいときだけ `npx supabase db reset`（**全データが消え**、`seed.sql` が再投入される）。

---

## 3. 起動（ターミナル2つ）

```bash
# ターミナル1: Edge Functions
npx supabase functions serve --env-file supabase/functions/.env

# ターミナル2: 画面
npm run dev
```

`http://localhost:5173` を開く。メール確認は無効なので、画面から新規登録すればそのままログインできる。

---

## 4. PC での動作確認

**全機能が確認できる**（`localhost` は安全なコンテキスト扱いのため、カメラも使える）。

| # | 確認内容 | 期待する結果 |
|---|---|---|
| 1 | 新規登録 → ログイン | 製品ログ画面に入れる |
| 2 | 「化粧水」で検索 | 商品画像つきの候補が並ぶ |
| 3 | 候補の「追加」 | 登録済みに移動し、リロードしても残る |
| 4 | 「バーコード」ボタン | カメラが起動する（PCにカメラがあれば） |
| 5 | 「成分を見る」→ 写真を選択 | 読み取り結果が確認画面に出る |
| 6 | 誤読を × で外して「この内容で登録」 | 成分一覧に反映される |
| 7 | 肌ログを記録 | 一覧に追加される |

スマホの見た目は DevTools のデバイスエミュレーション（Ctrl+Shift+M）で確認する。

---

## 5. スマホ実機での動作確認

### 5-1. 手順

```bash
# 1) .env.local の接続先を PC の LAN IP に変える
VITE_SUPABASE_URL=http://192.168.1.232:54321

# 2) Vite を LAN に公開して再起動（env は起動時にしか読まれない）
npm run dev -- --host
```

スマホの**同じ Wi-Fi** から `http://192.168.1.232:5173` を開く。

> IP が変わったら `ip -4 addr show scope global` で確認する（`172.x` は Docker の内部用なので除く）。
> PC 側で開けない場合はファイアウォール（`sudo ufw allow 5173`, `54321`）を確認。
> **PC に戻すときは `.env.local` を `127.0.0.1` に戻すこと。**

### 5-2. スマホで何が動くか

| 機能 | PC (localhost) | スマホ (http://192.168.x.x) | 理由 |
|---|---|---|---|
| ログイン / 検索 / 登録 / 肌ログ | ✅ | ✅ | 通常の通信のみ |
| 成分OCR（写真を撮る） | ✅ | ✅ | OS のカメラアプリを呼ぶ方式なので HTTPS 不要 |
| バーコード（カメラ映像の解析） | ✅ | ❌ | `getUserMedia` は HTTPS か localhost が必須 |
| バーコード（iPhone） | ❌ | ❌ | iOS は `BarcodeDetector` 自体が非対応 |

**つまりスマホ実機では、バーコード以外はそのまま確認できる。**

### 5-3. Android でバーコードも試したい場合

Chrome で `chrome://flags/#unsafely-treat-insecure-origin-as-secure` を開き、
`http://192.168.1.232:5173` を追加して有効化 → Chrome を再起動。

> 確認が終わったら設定を戻すこと。開発用の一時的な措置。

### 5-4. iPhone でバーコードを使いたくなったら

`BarcodeDetector` が無いため、WASM 版のライブラリを足す必要がある。

```bash
npm i zxing-wasm
```

`src/components/BarcodeScanner.tsx` の「非対応」分岐にフォールバックを実装する。

---

## 6. 本番相当での確認（将来）

HTTPS 環境でしか確認できないこと（iOS のカメラ全般、PWA化など）を試す段階になったら:

1. クラウドの Supabase プロジェクトにマイグレーションを適用（`npx supabase db push`）
2. Edge Function をデプロイ（`npx supabase functions deploy`）
3. キーをクラウド側に設定（`npx supabase secrets set YAHOO_APP_ID=... GEMINI_API_KEY=...`）
4. Vercel にデプロイし、環境変数にクラウドの URL と anon キーを設定

---

## 7. うまくいかないとき

| 症状 | 原因と対処 |
|---|---|
| `YAHOO_APP_ID が設定されていません` | `functions serve` に `--env-file` を渡していない、または起動し直していない |
| `API key not valid`（502） | `GEMINI_API_KEY` が誤っている |
| `検索が混み合っています`（429） | Yahoo! は 1クエリ/秒 制限。少し待つ |
| 検索結果が 0 件 | キーワードを短くする。JAN検索は商品が Yahoo! にない場合ヒットしない |
| スマホから画面が開けない | `--host` を付け忘れ / 別のWi-Fi / ファイアウォール |
| スマホでログインできない | `.env.local` の `VITE_SUPABASE_URL` が `127.0.0.1` のまま（スマホ自身を指してしまう） |
| カメラが起動しない | 5-2 の表を参照。HTTPS 制約によるもの |
| 成分の読み取り精度が低い | 明るい場所で、成分表示を画面いっぱいに。改善しなければ Cloud Vision へ差し替え（`OcrProvider` を実装） |
