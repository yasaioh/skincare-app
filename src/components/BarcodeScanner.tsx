import { useEffect, useRef, useState } from 'react'

type Props = {
  onDetected: (janCode: string) => void
  onClose: () => void
}

/** 日本の商品バーコード。JAN は EAN-13 / EAN-8 と同じ規格 */
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

/**
 * カメラでバーコードを読み取る。
 *
 * ブラウザ標準の BarcodeDetector を使うため追加パッケージは不要。
 * ただし iOS Safari は未対応なので、その場合は案内を出して閉じてもらう。
 * （対応させたい場合は zxing-wasm 等を入れてここにフォールバックを足す）
 */
export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  // 対応可否は描画時に判定する（effect 内で setState すると余計な再描画を招くため）
  const supported = typeof window !== 'undefined' && Boolean(window.BarcodeDetector)

  useEffect(() => {
    const Detector = window.BarcodeDetector
    if (!Detector) return

    let stream: MediaStream | null = null
    let frameId: number | null = null
    let stopped = false

    const detector = new Detector({ formats: FORMATS })

    const tick = async () => {
      const video = videoRef.current
      if (stopped || !video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        if (!stopped) frameId = requestAnimationFrame(tick)
        return
      }
      try {
        const codes = await detector.detect(video)
        const code = codes.find((c) => c.rawValue)
        if (code) {
          stopped = true
          onDetected(code.rawValue)
          return
        }
      } catch {
        // 1 フレームの失敗は無視して次のフレームで再挑戦する
      }
      if (!stopped) frameId = requestAnimationFrame(tick)
    }

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (stopped) return
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        frameId = requestAnimationFrame(tick)
      } catch {
        setError('カメラを起動できませんでした。ブラウザのカメラ許可をご確認ください。')
      }
    }

    start()

    return () => {
      stopped = true
      if (frameId !== null) cancelAnimationFrame(frameId)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [onDetected])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      <div className="flex items-center justify-between p-4 text-white">
        <span className="text-sm font-medium">バーコードを枠内に写してください</span>
        <button
          onClick={onClose}
          className="rounded-md bg-white/20 px-3 py-1.5 text-sm hover:bg-white/30"
        >
          閉じる
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        {!supported ? (
          <p className="max-w-xs text-center text-sm text-white">
            このブラウザはバーコード読み取りに対応していません（iPhone の Safari など）。
            お手数ですが、キーワード検索をご利用ください。
          </p>
        ) : error ? (
          <p className="max-w-xs text-center text-sm text-red-300">{error}</p>
        ) : (
          <div className="relative w-full max-w-md">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full rounded-lg bg-black"
            />
            <div className="pointer-events-none absolute inset-x-6 top-1/2 h-24 -translate-y-1/2 rounded-lg border-2 border-teal-400" />
          </div>
        )}
      </div>
    </div>
  )
}
