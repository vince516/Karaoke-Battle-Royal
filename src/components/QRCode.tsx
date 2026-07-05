import { useEffect, useRef } from 'react'
import QR from 'qrcode'

/* A real, scannable QR code rendered to canvas (dark modules on white). */
export function QRCode({ text, size = 220 }: { text: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current) return
    void QR.toCanvas(ref.current, text, {
      width: size,
      margin: 1,
      color: { dark: '#0E0E10', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
  }, [text, size])
  return <canvas ref={ref} width={size} height={size} style={{ width: size, height: size, borderRadius: 12, display: 'block' }} />
}
