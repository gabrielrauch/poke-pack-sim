import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  SRGBColorSpace,
  TextureLoader,
  type ColorSpace,
  type Texture,
} from 'three'

const loader = new TextureLoader()
loader.crossOrigin = 'anonymous'

/**
 * Face da carta (`high.webp`, 600×825, CDN com CORS `*`). `NoColorSpace` de propósito: o shader holo
 * reproduz os blend modes do CSS no espaço sRGB e escreve direto no canvas, sem decode/encode.
 */
export function prepareCardTexture(tex: Texture, maxAnisotropy: number): Texture {
  tex.colorSpace = NoColorSpace
  tex.generateMipmaps = true
  tex.minFilter = LinearMipmapLinearFilter
  tex.magFilter = LinearFilter
  tex.anisotropy = Math.min(4, maxAnisotropy)
  tex.wrapS = ClampToEdgeWrapping
  tex.wrapT = ClampToEdgeWrapping
  return tex
}

export function loadCardTexture(url: string, maxAnisotropy: number): Promise<Texture> {
  return loader.loadAsync(url).then((tex) => prepareCardTexture(tex, maxAnisotropy))
}

/** As 5 faces em paralelo; uma falha vira placeholder com o nome, para a sequência nunca travar. */
export function loadCardTextures(
  urls: ReadonlyArray<string | null>,
  labels: readonly string[],
  maxAnisotropy: number,
): Promise<Texture[]> {
  return Promise.all(
    urls.map((url, i) => {
      const label = labels[i] ?? ''
      return url
        ? loadCardTexture(url, maxAnisotropy).catch(() => fallbackCardTexture(label, maxAnisotropy))
        : Promise.resolve(fallbackCardTexture(label, maxAnisotropy))
    }),
  )
}

export function fallbackCardTexture(label: string, maxAnisotropy: number): Texture {
  const tex = canvasTexture(
    300,
    420,
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, '#d8b8ff')
      g.addColorStop(1, '#2a145c')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#fff'
      ctx.font = `700 ${w / 10}px 'Fredoka', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, w / 2, h / 2)
    },
    NoColorSpace,
  )
  return prepareCardTexture(tex, maxAnisotropy)
}

/** Desenha uma vez num canvas e devolve a textura (sRGB por padrão, clamp nas bordas). */
export function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  colorSpace: ColorSpace = SRGBColorSpace,
): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d indisponível')
  draw(ctx, w, h)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = colorSpace
  tex.wrapS = ClampToEdgeWrapping
  tex.wrapT = ClampToEdgeWrapping
  return tex
}

/** Imagem com CORS para desenhar em canvas (logo do set). `null` em erro ou sem URL. */
export function loadImage(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}
