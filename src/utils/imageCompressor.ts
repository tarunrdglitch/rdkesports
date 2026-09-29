/**
 * Client-side image compression utility using HTML5 Canvas.
 * Compresses large screenshots or photos to crisp, lightweight JPEG data URLs (~60-150KB)
 * to avoid HTTP 413 Payload Too Large and speed up API submissions.
 */
export function compressImageFile(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If not an image, read directly as data URL
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
      return
    }

    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => {
        // Fallback to raw data URL if image decoding fails
        resolve(reader.result as string)
      }
      img.onload = () => {
        let width = img.width
        let height = img.height

        // Calculate aspect-ratio-preserving dimensions
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height)
          height = maxHeight
        }

        try {
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(reader.result as string)
            return
          }

          // Fill white background for transparent PNG screenshots
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(img, 0, 0, width, height)

          const compressed = canvas.toDataURL('image/jpeg', quality)
          resolve(compressed)
        } catch {
          // Fallback if canvas throws (e.g. security or memory)
          resolve(reader.result as string)
        }
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
