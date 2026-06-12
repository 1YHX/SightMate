export type CaptureOptions = {
  maxSize?: number
  quality?: number
}

const DEFAULT_MAX_SIZE = 1024
const DEFAULT_JPEG_QUALITY = 0.8

export function captureVideoFrame(
  video: HTMLVideoElement,
  options: CaptureOptions = {}
) {
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error('摄像头画面尚未准备好，请稍后再试。')
  }

  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE
  const quality = options.quality ?? DEFAULT_JPEG_QUALITY
  const { width, height } = getScaledSize(video.videoWidth, video.videoHeight, maxSize)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('当前浏览器无法处理截图，请更换浏览器后重试。')
  }

  context.drawImage(video, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', quality)
}

function getScaledSize(sourceWidth: number, sourceHeight: number, maxSize: number) {
  const longestSide = Math.max(sourceWidth, sourceHeight)

  if (longestSide <= maxSize) {
    return {
      width: sourceWidth,
      height: sourceHeight
    }
  }

  const scale = maxSize / longestSide

  return {
    width: Math.round(sourceWidth * scale),
    height: Math.round(sourceHeight * scale)
  }
}
