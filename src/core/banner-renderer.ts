import type {
  BrandKitBannerAlignment,
  BrandKitBannerPattern,
} from './types.js'
import { createRequire } from 'node:module'
import type sharp from 'sharp'

export type BannerRenderOptions = {
  alignment?: BrandKitBannerAlignment
  backgroundColor: string
  accentColor: string
  secondaryColor: string
  markAssetPath: string
  markScale?: number
  markX?: number
  markY?: number
  pattern?: BrandKitBannerPattern
  width: number
  height: number
}

const requireFromHere = createRequire(import.meta.url)
const sharpPackageName = 'sha' + 'rp'

function getSharp(): typeof sharp {
  return requireFromHere(sharpPackageName) as typeof sharp
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min

  return Math.min(max, Math.max(min, value))
}

function safeHex(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

export function getEdgeAlignedLeft({
  alignment,
  canvasWidth,
  markWidth,
}: {
  alignment: BrandKitBannerAlignment
  canvasWidth: number
  markWidth: number
}) {
  const edgeInset = Math.max(80, Math.round(canvasWidth * 0.027))

  if (alignment === 'left') return edgeInset
  if (alignment === 'right') return canvasWidth - markWidth - edgeInset

  return Math.round(canvasWidth * 0.5 - markWidth / 2)
}

function patternMarkup({
  accentColor,
  height,
  pattern,
  secondaryColor,
  width,
}: {
  accentColor: string
  height: number
  pattern: BrandKitBannerPattern
  secondaryColor: string
  width: number
}) {
  const overscan = Math.max(width, height)

  if (pattern === 'radial-glow') {
    return `
      <circle cx="${width * 0.74}" cy="${height * 0.5}" r="${overscan * 0.42}" fill="${accentColor}" opacity="0.72" />
      <circle cx="${width * 0.12}" cy="${height * 0.2}" r="${overscan * 0.24}" fill="${secondaryColor}" opacity="0.18" />
      <path d="M ${width * 0.02} ${height} C ${width * 0.28} ${height * 0.35}, ${width * 0.54} ${height * 0.82}, ${width} ${height * 0.22} L ${width} ${height} Z" fill="${accentColor}" opacity="0.2" />
    `
  }

  if (pattern === 'split-field') {
    return `
      <path d="M ${width * 0.52} 0 L ${width} 0 L ${width} ${height} L ${width * 0.36} ${height} Z" fill="${accentColor}" opacity="0.92" />
      <path d="M ${width * 0.7} 0 L ${width} 0 L ${width} ${height} L ${width * 0.88} ${height} Z" fill="${secondaryColor}" opacity="0.18" />
      <circle cx="${width * 0.82}" cy="${height * 0.5}" r="${overscan * 0.22}" fill="${secondaryColor}" opacity="0.14" />
    `
  }

  if (pattern === 'wave') {
    return `
      <path d="M 0 ${height * 0.66} C ${width * 0.24} ${height * 0.28}, ${width * 0.46} ${height * 0.96}, ${width * 0.72} ${height * 0.4} S ${width * 0.92} ${height * 0.22}, ${width} ${height * 0.34} L ${width} ${height} L 0 ${height} Z" fill="${accentColor}" opacity="0.72" />
      <path d="M 0 ${height * 0.78} C ${width * 0.28} ${height * 0.42}, ${width * 0.42} ${height * 1.05}, ${width * 0.76} ${height * 0.56} S ${width * 0.95} ${height * 0.44}, ${width} ${height * 0.5} L ${width} ${height} L 0 ${height} Z" fill="${secondaryColor}" opacity="0.16" />
    `
  }

  return `
    <path d="M ${width * 0.58} 0 L ${width} 0 L ${width * 0.78} ${height} L ${width * 0.28} ${height} Z" fill="${accentColor}" opacity="0.78" />
    <path d="M ${width * 0.86} 0 L ${width} 0 L ${width} ${height} L ${width * 0.68} ${height} Z" fill="${secondaryColor}" opacity="0.16" />
    <circle cx="${width * 0.16}" cy="${height * 0.18}" r="${overscan * 0.18}" fill="${accentColor}" opacity="0.18" />
  `
}

function backgroundSvg(options: {
  accentColor: string
  backgroundColor: string
  height: number
  pattern: BrandKitBannerPattern
  secondaryColor: string
  width: number
}) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}">
      <defs>
        <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${options.backgroundColor}" />
          <stop offset="1" stop-color="${options.accentColor}" stop-opacity="0.72" />
        </linearGradient>
      </defs>
      <rect width="${options.width}" height="${options.height}" fill="url(#base)" />
      ${patternMarkup(options)}
      <rect width="${options.width}" height="${options.height}" fill="${options.backgroundColor}" opacity="0.08" />
    </svg>
  `
}

export async function renderBanner(options: BannerRenderOptions) {
  const sharp = await getSharp()
  const width = Math.round(options.width)
  const height = Math.round(options.height)
  const alignment = options.alignment ?? 'center'
  const markScale = clamp(options.markScale ?? 0.34, 0.08, 0.72)
  const markX = clamp(options.markX ?? 0.5, 0.1, 0.9)
  const markY = clamp(options.markY ?? 0.5, 0.15, 0.85)
  const pattern = options.pattern ?? 'diagonal-sweep'
  const backgroundColor = safeHex(options.backgroundColor, '#0d2249')
  const accentColor = safeHex(options.accentColor, '#4784de')
  const secondaryColor = safeHex(options.secondaryColor, '#ffffff')
  const background = await sharp(
    Buffer.from(
      backgroundSvg({
        accentColor,
        backgroundColor,
        height,
        pattern,
        secondaryColor,
        width,
      }),
    ),
  )
    .png()
    .toBuffer()
  const mark = await sharp(options.markAssetPath)
    .resize({
      width: Math.round(width * markScale),
      height: Math.round(height * 0.68),
      fit: 'inside',
      withoutEnlargement: false,
    })
    .png()
    .toBuffer()
  const metadata = await sharp(mark).metadata()
  const markWidth = metadata.width ?? Math.round(width * markScale)
  const markHeight = metadata.height ?? Math.round(height * 0.4)
  const left =
    alignment === 'center'
      ? Math.round(width * markX - markWidth / 2)
      : getEdgeAlignedLeft({
          alignment,
          canvasWidth: width,
          markWidth,
        })
  const top = Math.round(height * markY - markHeight / 2)

  return sharp(background)
    .composite([
      {
        input: mark,
        left: clamp(left, 0, width - markWidth),
        top: clamp(top, 0, height - markHeight),
      },
    ])
    .png()
    .toBuffer()
}
