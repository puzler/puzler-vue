// Client-side avatar downscaling. The server re-processes authoritatively, so
// this is a bandwidth courtesy + lets us warn the user before upload. We match
// the server's 512px bound and WebP output.
export const MAX_AVATAR_DIMENSION = 512

export interface ImageDimensions {
  width: number
  height: number
}

export async function readImageDimensions(file: File): Promise<ImageDimensions> {
  const bitmap = await createImageBitmap(file)
  const dims = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return dims
}

export function needsDownscale(dims: ImageDimensions): boolean {
  return Math.max(dims.width, dims.height) > MAX_AVATAR_DIMENSION
}

// Downscale to MAX_AVATAR_DIMENSION on the longest side, honoring EXIF
// orientation (createImageBitmap bakes it in, which also drops the metadata),
// and encode as WebP. Returns null if the browser can't produce the blob, so
// the caller can fall back to uploading the original.
export async function downscaleImage(file: File): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_AVATAR_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return null
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.85))
}
