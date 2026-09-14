// Yahoo!ショッピング 商品検索API(v3) のプロキシ。
//
// フロントから直接叩かない理由:
//   Client ID (YAHOO_APP_ID) をブラウザに出さないため。
//   キーは `supabase secrets set YAHOO_APP_ID=...` で Edge Function 側にのみ設定する。
//
// 制限: Yahoo! 側は「1クエリ/秒」。超過すると 429 が返るので、
//       呼び出し側（フロント）では入力をデバウンスすること。

const YAHOO_ENDPOINT = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

/** リクエスト: キーワード検索と JAN コード検索のどちらか */
type SearchRequest = {
  query?: string
  janCode?: string
  hits?: number
}

/** Yahoo! のレスポンス（使う項目だけ・すべて任意扱いにして防御的に読む） */
type YahooHit = {
  name?: string
  brand?: { name?: string }
  janCode?: string
  image?: { small?: string; medium?: string }
  price?: number
  url?: string
  code?: string
}

/** フロントに返す形 */
type ProductHit = {
  name: string
  brand: string | null
  janCode: string | null
  imageUrl: string | null
  price: number | null
  itemUrl: string | null
  itemCode: string | null
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return json({ error: "POST のみ対応しています" }, 405)
  }

  const appId = Deno.env.get("YAHOO_APP_ID")
  if (!appId) {
    return json({ error: "YAHOO_APP_ID が設定されていません" }, 500)
  }

  let body: SearchRequest
  try {
    body = await req.json()
  } catch {
    return json({ error: "リクエストの JSON が不正です" }, 400)
  }

  const query = body.query?.trim()
  const janCode = body.janCode?.trim()
  if (!query && !janCode) {
    return json({ error: "query または janCode のどちらかが必要です" }, 400)
  }

  const url = new URL(YAHOO_ENDPOINT)
  url.searchParams.set("appid", appId)
  url.searchParams.set("image_size", "300")
  url.searchParams.set("results", String(Math.min(body.hits ?? 20, 20)))
  if (janCode) {
    url.searchParams.set("jan_code", janCode)
  } else {
    url.searchParams.set("query", query as string)
  }
  // 在庫では絞らない。廃番品でも手元にある製品は記録したいため。

  let res: Response
  try {
    res = await fetch(url)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return json({ error: `Yahoo! API へ接続できませんでした: ${message}` }, 502)
  }

  if (res.status === 429) {
    return json({ error: "検索が混み合っています。少し待って再試行してください" }, 429)
  }
  if (!res.ok) {
    return json({ error: `Yahoo! API がエラーを返しました (${res.status})` }, 502)
  }

  const data = await res.json() as { hits?: YahooHit[] }

  const hits: ProductHit[] = (data.hits ?? [])
    .map((h): ProductHit => ({
      name: h.name ?? "",
      brand: h.brand?.name ?? null,
      janCode: h.janCode ?? null,
      imageUrl: h.image?.medium ?? h.image?.small ?? null,
      price: typeof h.price === "number" ? h.price : null,
      itemUrl: h.url ?? null,
      itemCode: h.code ?? null,
    }))
    .filter((h) => h.name !== "")

  return json({ hits })
})
