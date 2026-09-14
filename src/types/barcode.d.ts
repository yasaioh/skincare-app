// BarcodeDetector はまだ TypeScript の標準 DOM 型に含まれないため最小限の宣言を置く。
// 対応状況: Chrome / Android は対応、iOS Safari は非対応（実行時に存在確認すること）

interface DetectedBarcode {
  rawValue: string
  format: string
}

declare class BarcodeDetector {
  constructor(options?: { formats?: string[] })
  static getSupportedFormats(): Promise<string[]>
  detect(source: CanvasImageSource | Blob | ImageData): Promise<DetectedBarcode[]>
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector
}
