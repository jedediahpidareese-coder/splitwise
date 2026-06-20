import type { ReceiptInput } from '../data/storeTypes'

// Reads an image File, downscales it, and returns both a compact JPEG blob
// (for uploading to Supabase Storage in cloud mode) and a data URL (for an
// instant preview and for inline storage in local mode).
export async function processReceipt(
  file: File,
  maxEdge = 1200,
  quality = 0.7,
): Promise<ReceiptInput> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    ctx.drawImage(bitmap, 0, 0, w, h)

    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        quality,
      )
    })
    return { blob, dataUrl }
  } finally {
    bitmap.close()
  }
}
