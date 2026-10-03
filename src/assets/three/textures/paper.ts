import * as THREE from 'three'

/** Build a small, repeatable ledger-paper texture without downloading an image. */
export function createLedgerTexture(): any {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) return null

  context.fillStyle = '#f5f2e9'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#d9dfeb'
  context.lineWidth = 1
  for (let offset = 0.5; offset < 256; offset += 32) {
    context.beginPath()
    context.moveTo(offset, 0)
    context.lineTo(offset, 256)
    context.stroke()
    context.beginPath()
    context.moveTo(0, offset)
    context.lineTo(256, offset)
    context.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
