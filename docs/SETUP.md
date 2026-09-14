# 開発環境のセットアップと動作確認

開発は PC、動作想定はスマホ。**PC とスマホは別ネットワークにある**ため、
スマホでの確認はトンネル（外部からアクセスできる一時的な HTTPS の URL）経由で行う。

## 全体像

```
[PC]
  Vite (5173) ──┬─ 画面
                └─ /supabase/* を Supabase local (54321) へ中継
                        ├─ DB / 認証
                        └─ Edge Functions
                              ├─ search-products  → Yahoo!ショッピング API
                              └─ parse-ingredients → Gemini API
      ↑
  トンネル（1本だけ / HTTPS）
      ↑
[スマホ]  別ネットワークから接続
```

Supabase 宛てを Vite が中継するので、**公開するポートは 5173 の 1 本だけ**でよい。
同一オリジンになるため CORS も混在コンテンツも起きない。

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

`supabase/functions/.env` を作る（`.gitignore` 済み）。**必ずエディタで「ファイル」として作ること。**

> このパスが存在しない状態で `functions serve` を実行すると、Docker がマウント先として
> **同名の空ディレクトリを作ってしまう**。そうなると `node: ... invalid format` で起動できない。
> 起動より先にファイルを作っておくこと（対処法は 6 章）。

```bash
YAHOO_APP_ID=取得したClientID
GEMINI_API_KEY=取得したAPIキー
```

### 2-2. フロント用の接続先

`.env.local`（`.gitignore` 済み）。**`same-origin` と書いておけば PC でもスマホでも同じ設定で動く。**

```bash
VITE_SUPABASE_URL=same-origin
VITE_SUPABASE_ANON_KEY=（ローカル共通の公開キー。秘密ではない）
```

`same-origin` は「表示中の画面のオリジン + /supabase を使う」という指定。
トンネルの URL は起動ごとに変わるが、この書き方なら**毎回書き換える必要がない**。

> 直接 `http://127.0.0.1:54321` と書いてもよいが、その場合スマホからは繋がらない。

### 2-3. DB の準備

```bash
npx supabase start          # 起動していなければ
npx supabase migration up   # 差分のマイグレーションを適用
```

DB を作り直したいときだけ `npx supabase db reset`（**全データが消え**、`seed.sql` が再投入される）。

---

## 3. PC で動かす（ターミナル2つ）

```bash
# ターミナル1: Edge Functions（supabase/functions/.env は既定で読まれる）
npx supabase functions serve

# ターミナル2: 画面
npm run dev
```

`http://localhost:5173` を開く。メール確認は無効なので、画面から新規登録すればそのままログインできる。

### 確認チェックリスト（PC）

`localhost` は安全なコンテキスト扱いなので、**カメラを含む全機能**が確認できる。

| # | 確認内容 | 期待する結果 |
|---|---|---|
| 1 | 新規登録 → ログイン | 製品ログ画面に入れる |
| 2 | 「化粧水」で検索 | 商品画像つきの候補が並ぶ |
| 3 | 候補の「追加」 | 登録済みに移動し、リロードしても残る |
| 4 | 「バーコード」ボタン | カメラが起動する（PCにカメラがあれば） |
| 5 | 「成分を見る」→ 写真を選択 | 読み取り結果が確認画面に出る |
| 6 | 誤読を × で外して「この内容で登録」 | 成分一覧に反映される |
| 7 | 肌ログを記録 | 一覧に追加される |

スマホの見た目だけなら DevTools のデバイスエミュレーション（Ctrl+Shift+M）でも確認できる。

---

## 4. スマホ実機で動かす（トンネル経由）

### 4-1. トンネルを張る

ターミナルを 1 つ増やし、**3 つ目**で実行する。

```bash
npx untun@latest tunnel http://localhost:5173
```

表示された `https://xxxx-xxxx.trycloudflare.com` をスマホで開く。

**untun を推奨する理由**: Cloudflare の Quick Tunnel を npx から直接使えるため、
別途インストールが不要で、アカウント登録もなしに HTTPS が付く。
うまくいかない場合は localtunnel（`npx localtunnel --port 5173`）を使う。
どちらのドメインも `vite.config.ts` の `allowedHosts` に登録済みなので設定変更は要らない。

> 初回実行時に Cloudflare のライセンス・利用規約への同意が求められる点に注意。

### 4-2. Vite をトンネル用に起動する

HMR（保存したら画面が自動更新される機能）をトンネル越しでも効かせるため、
`TUNNEL=1` を付けて起動する。

```bash
TUNNEL=1 npm run dev
```

> 付けなくても画面は見られるが、自動更新が効かず手動リロードが必要になる。

### 4-3. スマホで何が動くか

トンネルは HTTPS なので、**LAN 直結では使えなかったカメラ機能も動く。**

| 機能 | PC (localhost) | スマホ (トンネル / HTTPS) |
|---|---|---|
| ログイン・検索・登録・肌ログ | ✅ | ✅ |
| 成分OCR（写真撮影） | ✅ | ✅ |
| バーコード（Android） | ✅ | ✅ |
| バーコード（iPhone） | ❌ | ❌ |

iPhone だけは `BarcodeDetector` 自体が未実装のため、HTTPS でも動かない。
対応したくなったら WASM 版を入れる:

```bash
npm i zxing-wasm
```

`src/components/BarcodeScanner.tsx` の「非対応」分岐にフォールバックを実装する。

### 4-4. 注意点

- トンネルの URL は**起動するたびに変わる**。`.env.local` を `same-origin` にしてあれば書き換え不要
- **URL を知っている人は誰でもアクセスできる。** 確認が終わったらトンネルを止める（Ctrl+C）
- `supabase functions serve` も起動していないと、検索と OCR だけが失敗する

---

## 5. 本番相当での確認（将来）

常設の URL が要る、PWA 化する、といった段階になったら:

1. クラウドの Supabase にマイグレーションを適用（`npx supabase db push`）
2. Edge Function をデプロイ（`npx supabase functions deploy`）
3. キーをクラウド側に設定（`npx supabase secrets set YAHOO_APP_ID=... GEMINI_API_KEY=...`）
4. Vercel にデプロイし、環境変数にクラウドの URL と anon キーを設定
   （このとき `VITE_SUPABASE_URL` は `same-origin` ではなくクラウドの URL にする）

---

## 6. うまくいかないとき

| 症状 | 原因と対処 |
|---|---|
| `Blocked request. This host is not allowed` | 使っているトンネルのドメインが `vite.config.ts` の `allowedHosts` に無い。そのドメインを追加する |
| スマホで画面は出るがログインできない | `supabase start` が動いていない。または `.env.local` が `same-origin` になっていない |
| `node: supabase/functions/.env: invalid format` | `.env` がファイルではなくディレクトリになっている（2-1 の注記）。`rmdir supabase/functions/.env` で消してから、エディタでファイルとして作り直す。`rmdir` は空のときしか成功しないので安全 |
| `YAHOO_APP_ID が設定されていません` | `supabase/functions/.env` が無い、キー名が違う、または起動し直していない |
| `API key not valid`（502） | `GEMINI_API_KEY` が誤っている |
| `検索が混み合っています`（429） | Yahoo! は 1クエリ/秒 制限。少し待つ |
| 検索結果が 0 件 | キーワードを短くする。JAN検索は商品が Yahoo! に無いとヒットしない |
| 保存しても画面が更新されない | `TUNNEL=1` を付けずに起動している |
| カメラが起動しない | iPhone のバーコードは未対応（4-3 の表）。それ以外はブラウザのカメラ許可を確認 |
| 成分の読み取り精度が低い | 明るい場所で、成分表示を画面いっぱいに。改善しなければ Cloud Vision へ差し替え（`OcrProvider` を実装） |
