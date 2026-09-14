// 化粧品パッケージの「全成分表示」の写真から成分名を抽出する OCR 関数。
//
// フロントから直接叩かない理由:
//   API キーをブラウザに出さないため。
//   キーは `supabase secrets set GEMINI_API_KEY=...` で Edge Function 側にのみ設定する。
//
// プロバイダ差し替えについて:
//   精度が不足した場合に Google Cloud Vision へ移行できるよう、
//   OcrProvider 型の関数として切り出してある。
//   差し替えるときは createVisionProvider を実装して PROVIDERS に足し、
//   環境変数 OCR_PROVIDER を "vision" にするだけで済む。

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

/** base64 のまま受け取れる上限。これ以上はフロント側で縮小してから送る想定 */
const MAX_BASE64_LENGTH = 8_000_000 // 約 6MB の画像

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions"
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"

const PROMPT = [
  "これは化粧品パッケージの全成分表示を撮影した画像です。",
  "記載されている成分名を、印字されている順序のまま配列で書き出してください。",
  "規則:",
  "- 「全成分」「成分:」などの見出し語は含めない。",
  "- 成分名だけを書く。配合目的の注釈や括弧書きの補足は成分名の一部でなければ除く。",
  "- 読み取れない文字は推測で補わず、その成分ごと省く。",
  "- 同じ成分を重複させない。",
  "- 成分表示が写っていない場合は空の配列を返す。",
].join("\n")

/** 画像から成分名の配列を返す。プロバイダを差し替えてもこの型は変えない */
type OcrProvider = (imageBase64: string, mimeType: string) => Promise<string[]>

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

/** Gemini のレスポンスからテキストを取り出す。
 *  output_text が無い形式の場合に備えて steps[] も辿る */
function extractText(data: unknown): string {
  const root = data as {
    output_text?: string
    outputText?: string
    steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>
  }

  if (typeof root.output_text === "string") return root.output_text
  if (typeof root.outputText === "string") return root.outputText

  const chunks: string[] = []
  for (const step of root.steps ?? []) {
    if (step.type !== "model_output") continue
    for (const block of step.content ?? []) {
      if (block.type === "text" && typeof block.text === "string") {
        chunks.push(block.text)
      }
    }
  }
  return chunks.join("")
}

function createGeminiProvider(apiKey: string, model: string): OcrProvider {
  return async (imageBase64, mimeType) => {
    const res = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          { type: "text", text: PROMPT },
          { type: "image", data: imageBase64, mime_type: mimeType },
        ],
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: {
            type: "object",
            properties: {
              ingredients: { type: "array", items: { type: "string" } },
            },
            required: ["ingredients"],
          },
        },
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      throw new Error(`Gemini API がエラーを返しました (${res.status}): ${detail.slice(0, 200)}`)
    }

    const text = extractText(await res.json())
    if (!text) throw new Error("Gemini の応答からテキストを取得できませんでした")

    let parsed: { ingredients?: unknown }
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error("Gemini の応答が JSON として解析できませんでした")
    }

    if (!Array.isArray(parsed.ingredients)) {
      throw new Error("Gemini の応答に ingredients 配列が含まれていませんでした")
    }
    return parsed.ingredients.filter((v): v is string => typeof v === "string")
  }
}

/** 表記ゆれの一次対策。前後空白と全角空白を落とし、空文字と重複を除いて順序は保つ */
function normalize(names: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of names) {
    const name = raw.replace(/\s+/g, " ").trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    result.push(name)
  }
  return result
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return json({ error: "POST のみ対応しています" }, 405)
  }

  const provider = Deno.env.get("OCR_PROVIDER") ?? "gemini"
  if (provider !== "gemini") {
    return json({ error: `未対応の OCR_PROVIDER です: ${provider}` }, 500)
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY")
  if (!apiKey) {
    return json({ error: "GEMINI_API_KEY が設定されていません" }, 500)
  }

  let body: { imageBase64?: string; mimeType?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: "リクエストの JSON が不正です" }, 400)
  }

  const imageBase64 = body.imageBase64?.trim()
  const mimeType = body.mimeType?.trim() || "image/jpeg"
  if (!imageBase64) {
    return json({ error: "imageBase64 が必要です" }, 400)
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return json({ error: "画像が大きすぎます。縮小してから送信してください" }, 413)
  }

  const ocr = createGeminiProvider(apiKey, Deno.env.get("GEMINI_MODEL") ?? DEFAULT_GEMINI_MODEL)

  try {
    const ingredients = normalize(await ocr(imageBase64, mimeType))
    return json({ ingredients })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return json({ error: message }, 502)
  }
})
