import { supabase } from './supabase'

/**
 * Edge Function を呼ぶ共通処理。
 *
 * supabase-js は非 2xx のとき error.message が "Edge Function returned a
 * non-2xx status code" という汎用文言になってしまうため、
 * 関数側が返した JSON の error を取り出して投げ直す。
 */
export async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })

  if (error) {
    let message = error.message
    const context = (error as { context?: Response }).context
    if (context && typeof context.json === 'function') {
      try {
        const detail = await context.json()
        if (detail && typeof detail.error === 'string') message = detail.error
      } catch {
        // JSON で返っていないときは元のメッセージのまま
      }
    }
    throw new Error(message)
  }

  if (!data) throw new Error('関数からの応答が空でした')
  return data
}
