/**
 * 画像ファイルを縮小して base64（データURLのヘッダを除いた部分）にする。
 *
 * 縮小する理由:
 *   - Edge Function 側で大きすぎる画像を弾いているため
 *   - スマホの写真は数MBあり、そのまま送ると遅い
 *
 * maxSize を 1600px と大きめに取っているのは、成分表示のような小さい文字は
 * 解像度を落としすぎると OCR の精度が目に見えて下がるため。
 */
export async function fileToResizedBase64(
  file: File,
  maxSize = 1600,
  quality = 0.85,
): Promise<{ base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file)

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('画像の変換に失敗しました')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  const base64 = dataUrl.split(',')[1] ?? ''
  if (!base64) throw new Error('画像の変換に失敗しました')

  return { base64, mimeType: 'image/jpeg' }
}
