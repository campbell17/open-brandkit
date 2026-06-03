'use client'

import {
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartVertical,
  ArrowDown,
  ArrowLeft,
  Copy,
  Download,
  RotateCcw,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react'
import JSZip from 'jszip'
import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type MouseEvent,
} from 'react'

import type {
  BrandKitAsset,
  BrandKitAssetGroup,
  BrandKitBannerAsset,
  BrandKitBannerGroup,
  BrandKitColor,
  BrandKitColorSection,
  BrandKitManifest,
  BrandKitPrintColor,
  BrandKitPrintColorGroup,
} from '../../core/types.js'
import type { BrandKitBannerControls } from './manifest.js'
import {
  defaultBannerMarkColor,
  getBannerMarkColorOptions,
  isWhiteBannerMarkColorOption,
} from '../../core/social-banners.js'

export type BrandKitPageEndpoints = {
  bannerPresets?: string
  bannerUpload?: string
  favicon?: string
}

export type BrandKitPageProps = {
  bannerControls?: BrandKitBannerControls
  canUseDevActions?: boolean
  endpoints?: BrandKitPageEndpoints
  manifest: BrandKitManifest
}

type AvatarShape = 'square' | 'rounded' | 'round'
type AvatarBorderThickness = 'none' | 'thin' | 'medium' | 'heavy'

type BannerPresetState = {
  accentColor: string
  alignment: string
  backgroundColor: string
  markColor: string
  markVariant: string
  pattern: string
  secondaryColor: string
}

type BannerPreviewOverride = {
  assetId: string
  url: string
}

type ColorOption = {
  color: string | null
  key: string
  label: string
  previewStyle?: CSSProperties
}

type AvatarIconOption = {
  asset: BrandKitAsset
  color: string
  key: string
  label: string
}

type BannerBaseColorOption = {
  accentColor: string
  hex: string
  key: string
  label: string
  secondaryColor: string
}

type BrandColorRows = {
  columns: 1 | 2 | 3
  label: string
  rows: BrandKitColor[][]
}[]

type ToastTone = 'success' | 'error' | 'info'

type ToastMessage = {
  id: number
  message: string
  tone: ToastTone
}

type ShowToast = (message: string, tone?: ToastTone) => void

const transparentPreviewStyle = {
  backgroundColor: '#f7f7f7',
  backgroundImage: 'repeating-conic-gradient(#ececec 0% 25%, #f8f8f8 0% 50%)',
  backgroundPosition: '50%',
  backgroundSize: '20px 20px',
} satisfies CSSProperties

const avatarShapeOptions = [
  { label: 'Square', value: 'square' },
  { label: 'Round', value: 'round' },
  { label: 'Rounded', value: 'rounded' },
] as const

const avatarBorderThicknessOptions = [
  { label: 'None', value: 'none', ratio: 0 },
  { label: 'Thin', value: 'thin', ratio: 0.16 },
  { label: 'Medium', value: 'medium', ratio: 0.32 },
  { label: 'Heavy', value: 'heavy', ratio: 0.48 },
] as const

const avatarSizeOptions = [512, 1024] as const
const avatarBorderStep = 4
const avatarMaxBorderRatio = 96 / 512
const faviconPngSizes = [16, 32, 48, 180, 192, 512] as const
const faviconIcoSizes = [16, 32, 48] as const
const bannerPreviewScale = 0.5
const deterministicIntro =
  'Approved marks, avatar-ready presets, social profile assets, and the current color system.'

function getAssetDownloadHref(downloadUrl: string) {
  return downloadUrl
}

function fileNameFromUrl(url?: string) {
  const pathName = url?.split('#')[0]?.split('?')[0]
  const fileName = pathName?.split('/').filter(Boolean).pop()

  return fileName?.includes('.') ? fileName : undefined
}

function npmPackageVersionUrl(packageName: string, version: string) {
  return `https://www.npmjs.com/package/${encodeURIComponent(packageName)}/v/${encodeURIComponent(version)}`
}

function assetFileLabel(asset: BrandKitAsset) {
  return asset.downloads.map((download) => download.fileName).join(' / ')
}

function getLightboxDownload(asset: BrandKitAsset) {
  return (
    asset.downloads.find((download) => download.format === 'PNG') ??
    asset.downloads.find((download) => download.format === 'SVG') ??
    asset.downloads[0]
  )
}

function getAssetSearchText(asset: BrandKitAsset) {
  return [
    asset.id,
    asset.title,
    asset.previewUrl,
    ...asset.downloads.map((download) => download.fileName),
  ]
    .join(' ')
    .toLowerCase()
}

function isWordmarkAsset(asset: BrandKitAsset) {
  const compact = getAssetSearchText(asset).replace(/[^a-z0-9]+/g, '')

  return compact.includes('wordmark')
}

function isIconAsset(asset: BrandKitAsset) {
  const text = getAssetSearchText(asset)
  const tokens = text.split(/[^a-z0-9]+/).filter(Boolean)
  const compact = tokens.join('')

  return (
    !isWordmarkAsset(asset) &&
    (tokens.some((token) =>
      ['icon', 'icons', 'symbol', 'symbols', 'favicon'].includes(token),
    ) ||
      compact.includes('brandmark'))
  )
}

function findAvatarAssets(groups: BrandKitAssetGroup[]) {
  const iconGroup =
    groups.find((group) => /icon/i.test(group.key)) ??
    groups.find((group) => /icon/i.test(group.label))
  const iconGroupAssets =
    iconGroup?.items.filter((asset) => !isWordmarkAsset(asset)) ?? []

  if (iconGroupAssets.length) return iconGroupAssets

  return groups
    .flatMap((group) => group.items)
    .filter((asset) => isIconAsset(asset))
}

function findHeroAsset(groups: BrandKitAssetGroup[]) {
  return findAvatarAssets(groups)[0] ?? groups[0]?.items[0] ?? null
}

function findFooterAsset(groups: BrandKitAssetGroup[]) {
  const logoGroup =
    groups.find((group) => /logo|lockup|wordmark/i.test(group.key)) ??
    groups.find((group) => /logo|lockup|wordmark/i.test(group.label))

  return logoGroup?.items[0] ?? groups[0]?.items[0] ?? null
}

function normalizeOptionalHexColor(value?: string | null) {
  if (!value) return null

  const trimmed = value.trim().replace(/^#/, '')

  if (/^[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed
      .split('')
      .map((character) => character + character)
      .join('')}`
  }

  if (/^[0-9a-f]{6}$/i.test(trimmed)) return `#${trimmed}`

  return null
}

function normalizeHexColor(value: string) {
  return normalizeOptionalHexColor(value) ?? '#ffffff'
}

function hexToRgb(value: string) {
  const hex = normalizeOptionalHexColor(value)

  if (!hex) return null

  return {
    blue: Number.parseInt(hex.slice(5, 7), 16),
    green: Number.parseInt(hex.slice(3, 5), 16),
    red: Number.parseInt(hex.slice(1, 3), 16),
  }
}

function rgbToHex({ blue, green, red }: { blue: number; green: number; red: number }) {
  return `#${[red, green, blue]
    .map((channel) =>
      Math.round(Math.min(Math.max(channel, 0), 255))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

function mixHexColor(source: string, target: string, amount: number) {
  const sourceRgb = hexToRgb(source)
  const targetRgb = hexToRgb(target)

  if (!sourceRgb || !targetRgb) return normalizeHexColor(source)

  return rgbToHex({
    blue: sourceRgb.blue + (targetRgb.blue - sourceRgb.blue) * amount,
    green: sourceRgb.green + (targetRgb.green - sourceRgb.green) * amount,
    red: sourceRgb.red + (targetRgb.red - sourceRgb.red) * amount,
  })
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function findPrimaryColor(colors: BrandKitColor[]) {
  return (
    colors.find((color) => /primary/i.test(color.name)) ??
    colors[0] ?? {
      hex: '#0d2249',
      name: 'Primary',
    }
  )
}

function getBrandGradientStops(colors: BrandKitColor[]) {
  return [
    ...new Set(
      colors
        .map((color) => normalizeOptionalHexColor(color.hex))
        .filter((hex): hex is string => Boolean(hex)),
    ),
  ]
}

function getCustomColorPreviewStyle(colors: BrandKitColor[]) {
  const stops = getBrandGradientStops(colors)

  if (stops.length === 0) {
    return { backgroundColor: '#ffffff' } satisfies CSSProperties
  }

  if (stops.length === 1) {
    return { backgroundColor: stops[0] } satisfies CSSProperties
  }

  return {
    backgroundColor: stops[0],
    backgroundImage: `linear-gradient(135deg, ${stops
      .map((hex, index) => {
        const stop = (index / (stops.length - 1)) * 100
        const formattedStop = Number.isInteger(stop)
          ? String(stop)
          : stop.toFixed(2).replace(/\.?0+$/, '')

        return `${hex} ${formattedStop}%`
      })
      .join(', ')})`,
  } satisfies CSSProperties
}

function findCustomPreviewColors(
  colors: BrandKitColor[],
  colorSections: BrandKitColorSection[],
) {
  const colorByName = new Map(
    colors.map((color) => [color.name.toLowerCase(), color]),
  )
  const colorByHex = new Map(
    colors.flatMap((color) => {
      const hex = normalizeOptionalHexColor(color.hex)

      return hex ? [[hex.toLowerCase(), color] as const] : []
    }),
  )
  const selected: BrandKitColor[] = []
  const seen = new Set<string>()

  for (const section of colorSections) {
    if (!/primary|secondary/i.test(section.label)) continue

    for (const colorReference of section.rows.flat()) {
      const color =
        colorByName.get(colorReference.toLowerCase()) ??
        colorByHex.get(
          normalizeOptionalHexColor(colorReference)?.toLowerCase() ?? '',
        )

      if (!color || seen.has(color.name.toLowerCase())) continue

      seen.add(color.name.toLowerCase())
      selected.push(color)
    }
  }

  return selected.length ? selected : colors
}

function getColorPickerFallback(colors: BrandKitColor[]) {
  return getBrandGradientStops(colors)[0] ?? '#05070b'
}

function makeFixedBackgroundOptions(
  customPreviewColors: BrandKitColor[],
  customHex: string,
): ColorOption[] {
  const customColor = normalizeOptionalHexColor(customHex)

  return [
    { color: null, key: 'transparent', label: 'Transparent' },
    { color: '#05070b', key: 'black', label: 'Black' },
    { color: '#ffffff', key: 'white', label: 'White' },
    {
      color: customColor,
      key: 'custom',
      label: 'Custom',
      previewStyle: customColor
        ? undefined
        : getCustomColorPreviewStyle(customPreviewColors),
    },
  ]
}

function makeFixedBorderOptions(
  colors: BrandKitColor[],
  customPreviewColors: BrandKitColor[],
  customHex: string,
): ColorOption[] {
  const primary = findPrimaryColor(colors)
  const customColor = normalizeOptionalHexColor(customHex)

  return [
    { color: primary.hex, key: 'primary', label: 'Primary' },
    { color: '#05070b', key: 'black', label: 'Black' },
    { color: '#ffffff', key: 'white', label: 'White' },
    {
      color: customColor,
      key: 'custom',
      label: 'Custom',
      previewStyle: customColor
        ? undefined
        : getCustomColorPreviewStyle(customPreviewColors),
    },
  ]
}

const avatarVariantStopTokens = new Set([
  'brandmark',
  'favicon',
  'favicons',
  'icon',
  'icons',
  'logo',
  'logos',
  'mark',
  'marks',
  'symbol',
  'symbols',
])

function getAvatarAssetTokens(asset: BrandKitAsset) {
  const fileName =
    asset.downloads[0]?.fileName ??
    asset.previewUrl.split('/').pop() ??
    asset.id.split(':').pop() ??
    asset.title

  return tokenize(fileName.replace(/\.[^.]+$/, ''))
}

function getCommonAvatarAssetTokens(assets: BrandKitAsset[]) {
  const tokenLists = assets.map((asset) => new Set(getAvatarAssetTokens(asset)))

  if (!tokenLists.length) return new Set<string>()

  return new Set(
    Array.from(tokenLists[0] ?? []).filter((token) =>
      tokenLists.every((tokens) => tokens.has(token)),
    ),
  )
}

function titleFromAvatarVariantTokens(tokens: string[]) {
  return tokens
    .map((token) =>
      token.toUpperCase() === token
        ? token
        : token.charAt(0).toUpperCase() + token.slice(1),
    )
    .join(' ')
}

function getAvatarIconLabel(
  asset: BrandKitAsset,
  commonTokens: ReadonlySet<string>,
) {
  const variantTokens = getAvatarAssetTokens(asset).filter(
    (token) => !commonTokens.has(token) && !avatarVariantStopTokens.has(token),
  )

  return variantTokens.length
    ? titleFromAvatarVariantTokens(variantTokens)
    : 'Primary'
}

function inferAvatarIconOptions(
  assets: BrandKitAsset[],
  colors: BrandKitColor[],
): AvatarIconOption[] {
  const primary = findPrimaryColor(colors)
  const brandColorTokenCounts = colors
    .map((color) => new Set(tokenize(color.name)))
    .reduce((counts, tokens) => {
      for (const token of tokens) {
        counts.set(token, (counts.get(token) ?? 0) + 1)
      }

      return counts
    }, new Map<string, number>())
  const brandColorCandidates = colors.map((color, index) => ({
      color: color.hex,
      key: `brand-${index}-${color.hex.toLowerCase()}`,
      label: color.name,
      tokens: tokenize(color.name).filter(
        (token) =>
          token.length > 2 && (brandColorTokenCounts.get(token) ?? 0) === 1,
      ),
    }))
  const colorCandidates = [
    {
      color: '#ffffff',
      key: 'white',
      label: 'White',
      tokens: ['white', 'onblack', 'inverse', 'inverted'],
    },
    {
      color: '#05070b',
      key: 'black',
      label: 'Black',
      tokens: ['black'],
    },
    ...brandColorCandidates,
  ]
  const options: AvatarIconOption[] = []
  const seen = new Set<string>()
  const commonAssetTokens = getCommonAvatarAssetTokens(assets)

  for (const asset of assets) {
    const text = getAssetSearchText(asset)
    const candidate =
      colorCandidates.find((option) =>
        option.tokens.some((token) => token && text.includes(token)),
      ) ??
      (/\bprimary\b/.test(text)
        ? {
            color: primary.hex,
            key: 'primary',
            label: primary.name,
            tokens: ['primary'],
          }
        : null) ?? {
        color: primary.hex,
        key: `primary-${primary.hex.toLowerCase()}`,
        label: primary.name,
        tokens: ['primary'],
      }
    const key = `asset:${asset.id}`

    if (seen.has(key)) continue

    options.push({
      asset,
      color: candidate.key.startsWith('primary-') ? '#05070b' : candidate.color,
      key,
      label: getAvatarIconLabel(asset, commonAssetTokens),
    })
    seen.add(key)
  }

  return options.length
    ? options
    : assets.map((asset, index) => ({
        asset,
        color: '#05070b',
        key: `icon-${index}:${asset.id}`,
        label: getAvatarIconLabel(asset, commonAssetTokens),
      }))
}

function getColorOption(options: ColorOption[], key: string) {
  return options.find((option) => option.key === key) ?? options[0]
}

function getMaxBorderThickness(size: number) {
  return size * avatarMaxBorderRatio
}

function roundBorderThickness(thickness: number) {
  return Math.round(thickness / avatarBorderStep) * avatarBorderStep
}

function getAvatarBorderThickness(
  thickness: AvatarBorderThickness,
  size: number,
) {
  const ratio =
    avatarBorderThicknessOptions.find((option) => option.value === thickness)
      ?.ratio ?? 0

  return roundBorderThickness(getMaxBorderThickness(size) * ratio)
}

function getAvatarShapeClass(shape: AvatarShape) {
  if (shape === 'round') return 'rounded-full'
  if (shape === 'rounded') return 'rounded-[22%]'

  return 'rounded-none'
}

function selectionRing(isSelected: boolean) {
  return isSelected
    ? 'border-[#3a89c0] ring-2 ring-[#3a89c0] ring-offset-2'
    : 'border-neutral-300 hover:border-neutral-500'
}

function addAvatarShapePath(
  context: CanvasRenderingContext2D,
  size: number,
  shape: AvatarShape,
  inset = 0,
) {
  const edge = size - inset * 2
  const radius = Math.min(edge / 2, Math.max(0, size * 0.22 - inset))

  context.beginPath()

  if (shape === 'round') {
    context.arc(size / 2, size / 2, edge / 2, 0, Math.PI * 2)
    context.closePath()
    return
  }

  if (shape === 'rounded') {
    if (typeof context.roundRect === 'function') {
      context.roundRect(inset, inset, edge, edge, radius)
      context.closePath()
      return
    }

    context.moveTo(inset + radius, inset)
    context.lineTo(inset + edge - radius, inset)
    context.arcTo(inset + edge, inset, inset + edge, inset + radius, radius)
    context.lineTo(inset + edge, inset + edge - radius)
    context.arcTo(
      inset + edge,
      inset + edge,
      inset + edge - radius,
      inset + edge,
      radius,
    )
    context.lineTo(inset + radius, inset + edge)
    context.arcTo(inset, inset + edge, inset, inset + edge - radius, radius)
    context.lineTo(inset, inset + radius)
    context.arcTo(inset, inset, inset + radius, inset, radius)
    context.closePath()
    return
  }

  context.rect(inset, inset, edge, edge)
  context.closePath()
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = document.createElement('img')

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Could not load ${src}`))
    image.src = src
  })
}

async function drawAvatarCanvas({
  backgroundColor,
  borderColor,
  borderThickness,
  canvas,
  iconSrc,
  iconWidthPercent,
  shape,
  size,
  isCurrent = () => true,
}: {
  backgroundColor: string | null
  borderColor: string
  borderThickness: number
  canvas: HTMLCanvasElement
  iconSrc: string
  iconWidthPercent: number
  isCurrent?: () => boolean
  shape: AvatarShape
  size: number
}) {
  const context = canvas.getContext('2d')

  canvas.width = size
  canvas.height = size

  if (!context) throw new Error('Canvas is unavailable.')

  context.clearRect(0, 0, size, size)

  if (borderThickness > 0) {
    context.save()
    addAvatarShapePath(context, size, shape)
    context.fillStyle = borderColor
    context.fill()
    context.restore()
  }

  if (backgroundColor || borderThickness > 0) {
    context.save()
    addAvatarShapePath(context, size, shape, borderThickness)
    context.clip()
    if (backgroundColor) {
      context.fillStyle = backgroundColor
      context.fill()
    } else {
      context.clearRect(0, 0, size, size)
    }
    context.restore()
  }

  const image = await loadCanvasImage(iconSrc)

  if (!isCurrent()) return

  const maxIconWidth = size * (iconWidthPercent / 100)
  const maxIconHeight = size * (iconWidthPercent / 100)
  const naturalWidth = image.naturalWidth || image.width
  const naturalHeight = image.naturalHeight || image.height
  const scale = Math.min(
    maxIconWidth / naturalWidth,
    maxIconHeight / naturalHeight,
  )
  const iconWidth = naturalWidth * scale
  const iconHeight = naturalHeight * scale

  context.drawImage(
    image,
    (size - iconWidth) / 2,
    (size - iconHeight) / 2,
    iconWidth,
    iconHeight,
  )
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result)
        return
      }

      reject(new Error('Could not export PNG.'))
    }, 'image/png')
  })
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

function makeIcoBlob(images: { size: number; buffer: ArrayBuffer }[]) {
  const headerLength = 6
  const directoryLength = images.length * 16
  const totalLength =
    headerLength +
    directoryLength +
    images.reduce((total, image) => total + image.buffer.byteLength, 0)
  const bytes = new Uint8Array(totalLength)
  const view = new DataView(bytes.buffer)
  let offset = headerLength + directoryLength

  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true)
  view.setUint16(4, images.length, true)

  images.forEach((image, index) => {
    const entryOffset = headerLength + index * 16
    const imageBytes = new Uint8Array(image.buffer)

    view.setUint8(entryOffset, image.size === 256 ? 0 : image.size)
    view.setUint8(entryOffset + 1, image.size === 256 ? 0 : image.size)
    view.setUint8(entryOffset + 2, 0)
    view.setUint8(entryOffset + 3, 0)
    view.setUint16(entryOffset + 4, 1, true)
    view.setUint16(entryOffset + 6, 32, true)
    view.setUint32(entryOffset + 8, imageBytes.byteLength, true)
    view.setUint32(entryOffset + 12, offset, true)
    bytes.set(imageBytes, offset)
    offset += imageBytes.byteLength
  })

  return new Blob([bytes], { type: 'image/x-icon' })
}

function createColorRows(manifest: BrandKitManifest): BrandColorRows {
  const colorMap = new Map(
    manifest.brandColors.map((color) => [color.name.toLowerCase(), color]),
  )
  const configuredRows = manifest.colorSections
    .map((section) => ({
      columns: section.columns ?? 3,
      label: getDisplayColorSectionLabel(section.label),
      rows: section.rows
        .map((row) =>
          row
            .map((name) => colorMap.get(name.toLowerCase()))
            .filter((color): color is BrandKitColor => Boolean(color)),
        )
        .filter((row) => row.length > 0),
    }))
    .filter((section) => section.rows.length > 0)

  if (configuredRows.length) return configuredRows

  const rows: BrandKitColor[][] = []

  for (let index = 0; index < manifest.brandColors.length; index += 3) {
    rows.push(manifest.brandColors.slice(index, index + 3))
  }

  return [{ columns: 3, label: 'Primary', rows }]
}

function getDisplayColorSectionLabel(label: string) {
  const trimmed = label.trim()

  if (/^brand colors?$/i.test(trimmed)) return 'Primary'

  return trimmed.replace(/\s+colors?$/i, '')
}

function formatAssetCount(count: number) {
  return `${count} ${count === 1 ? 'asset' : 'assets'} available`
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function DownloadIcon() {
  return <Download aria-hidden className="h-4 w-4" />
}

function UploadIcon() {
  return <Upload aria-hidden className="h-4 w-4" />
}

function ResetIcon() {
  return <RotateCcw aria-hidden className="h-4 w-4" />
}

function CloseIcon() {
  return <X aria-hidden className="h-4 w-4" />
}

function toastToneClasses(tone: ToastTone) {
  if (tone === 'error') return 'border-red-200 text-red-950'
  if (tone === 'info') return 'border-slate-200 text-slate-950'

  return 'border-neutral-200 text-neutral-950'
}

function ToastStack({ toasts }: { toasts: ToastMessage[] }) {
  if (!toasts.length) return null

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[140] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((toast) => (
        <div
          className={`pointer-events-auto w-full rounded-md border bg-white px-4 py-3 text-left text-sm font-medium shadow-lg ${toastToneClasses(toast.tone)}`}
          key={toast.id}
          role="status"
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}

function AssetDownloadButton({
  download,
}: {
  download: BrandKitAsset['downloads'][number]
}) {
  return (
    <a
      className="inline-flex items-center gap-1 rounded-md bg-[#2b333f] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1d232b]"
      download={download.fileName}
      href={getAssetDownloadHref(download.url)}
    >
      <DownloadIcon />
      <span>{download.format}</span>
    </a>
  )
}

function DownloadAllButton({
  fileName,
  href,
  label = 'Download all',
}: {
  fileName?: string
  href: string
  label?: string
}) {
  return (
    <a
      className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
      download={fileName ?? fileNameFromUrl(href)}
      href={href}
    >
      <DownloadIcon />
      <span>{label}</span>
    </a>
  )
}

function AssetCard({
  asset,
  onPreview,
}: {
  asset: BrandKitAsset
  onPreview: (asset: BrandKitAsset) => void
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <button
        className="flex min-h-[220px] items-center justify-center border-b border-neutral-200 px-6 py-10 transition-opacity hover:opacity-90"
        onClick={() => onPreview(asset)}
        style={transparentPreviewStyle}
        type="button"
      >
        <img
          src={asset.previewUrl}
          alt={asset.title}
          className="h-28 w-full object-contain"
          loading="lazy"
        />
      </button>
      <div className="flex flex-1 flex-col justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-neutral-900">
            {asset.title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {asset.downloads.map((download) => (
            <AssetDownloadButton
              key={`${asset.id}-${download.fileName}`}
              download={download}
            />
          ))}
        </div>
      </div>
    </article>
  )
}

function AssetGroup({
  downloadHref,
  downloadFileName,
  group,
  onPreview,
}: {
  downloadFileName?: string
  downloadHref: string
  group: BrandKitAssetGroup
  onPreview: (asset: BrandKitAsset) => void
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{group.label}</h3>
          {group.description ? (
            <p className="mt-1 text-sm text-slate-600">{group.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {formatAssetCount(group.items.length)}
          </span>
          <DownloadAllButton fileName={downloadFileName} href={downloadHref} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {group.items.map((asset) => (
          <AssetCard asset={asset} key={asset.id} onPreview={onPreview} />
        ))}
      </div>
    </section>
  )
}

function CopyButton({
  label,
  onToast,
  value,
}: {
  label: string
  onToast: ShowToast
  value: string
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      onToast(`${label} copied.`)
    } catch {
      onToast('Could not copy that color value.', 'error')
    }
  }

  return (
    <button
      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
      onClick={() => void copy()}
      title={`Copy ${label}`}
      type="button"
    >
      <Copy aria-hidden className="h-3.5 w-3.5" />
      <span>{value}</span>
    </button>
  )
}

function ColorCard({
  color,
  onToast,
}: {
  color: BrandKitColor
  onToast: ShowToast
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div
        className="h-28 w-full border-b border-neutral-200"
        style={{ backgroundColor: color.hex }}
      />
      <div className="space-y-4 p-4">
        <div>
          <p className="text-sm font-semibold text-neutral-900">{color.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton
            label={`${color.name} hex`}
            onToast={onToast}
            value={color.hex}
          />
        </div>
      </div>
    </article>
  )
}

function PrintCopyButton({
  label,
  onToast,
  value,
}: {
  label: string
  onToast: ShowToast
  value: string
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      ;(document.activeElement as HTMLElement | null)?.blur()
      onToast(`${label} copied.`)
    } catch {
      onToast('Could not copy that print color value.', 'error')
    }
  }

  return (
    <button
      aria-label={`Copy ${label}`}
      className="cursor-pointer text-left font-mono text-xs leading-5 text-neutral-800 transition-colors hover:text-[#3a89c0] hover:underline"
      onClick={() => void copy()}
      type="button"
    >
      {value}
    </button>
  )
}

function PrintComponentCopyButton({
  channel,
  label,
  onToast,
  value,
}: {
  channel: string
  label: string
  onToast: ShowToast
  value: string
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      ;(document.activeElement as HTMLElement | null)?.blur()
      onToast(`${label} copied.`)
    } catch {
      onToast('Could not copy that print color value.', 'error')
    }
  }

  return (
    <button
      aria-label={`Copy ${label}`}
      className="flex cursor-pointer items-baseline gap-1.5 text-left font-mono text-xs leading-5 text-neutral-800 transition-colors hover:text-[#3a89c0] hover:underline"
      onClick={() => void copy()}
      type="button"
    >
      <span className="w-4 font-sans text-xs font-semibold text-neutral-500">
        {channel}
      </span>
      <span>{value}</span>
    </button>
  )
}

function PrintValueGroup({
  color,
  label,
  onToast,
  values,
}: {
  color: BrandKitPrintColor
  label: string
  onToast: ShowToast
  values: { channel: string; value: string }[]
}) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.12em] text-neutral-500 uppercase">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <Copy aria-hidden className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
        <div className="flex items-center gap-3">
          {values.map((item) =>
            item.value ? (
              <PrintComponentCopyButton
                channel={item.channel}
                key={item.channel}
                label={`${color.pantone} ${label} ${item.channel}`}
                onToast={onToast}
                value={item.value}
              />
            ) : null,
          )}
        </div>
      </div>
    </div>
  )
}

function PrintColorCard({
  color,
  onToast,
}: {
  color: BrandKitPrintColor
  onToast: ShowToast
}) {
  const swatchRef = useRef<HTMLElement>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [popoverPlacement, setPopoverPlacement] = useState<'top' | 'bottom'>(
    'bottom',
  )
  const [popoverAlignment, setPopoverAlignment] = useState<'left' | 'right'>(
    'left',
  )
  const rgbValues = ['R', 'G', 'B'].map((channel, index) => ({
    channel,
    value: color.rgb[index] ?? '',
  }))
  const cmykValues = ['C', 'M', 'Y', 'K'].map((channel, index) => ({
    channel,
    value: color.cmyk[index] ?? '',
  }))

  function preparePopover() {
    const swatch = swatchRef.current

    if (!swatch) {
      setPopoverOpen(true)
      return
    }

    const rect = swatch.getBoundingClientRect()
    const estimatedPopoverHeight = 220
    const estimatedPopoverWidth = 320
    const viewportPadding = 16
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top

    setPopoverPlacement(
      spaceBelow < estimatedPopoverHeight && spaceAbove > spaceBelow
        ? 'top'
        : 'bottom',
    )
    setPopoverAlignment(
      rect.left + estimatedPopoverWidth > window.innerWidth - viewportPadding
        ? 'right'
        : 'left',
    )
    setPopoverOpen(true)
  }

  useEffect(() => {
    if (!popoverOpen) return

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!swatchRef.current?.contains(event.target as Node)) {
        setPopoverOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)

    return () =>
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [popoverOpen])

  return (
    <article
      className="relative"
      onMouseEnter={preparePopover}
      onMouseLeave={() => setPopoverOpen(false)}
      ref={swatchRef}
    >
      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm">
        <button
          aria-label={`${color.pantone} color values`}
          className="aspect-square w-full border-b border-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3a89c0]"
          onClick={preparePopover}
          onFocus={preparePopover}
          style={{ backgroundColor: color.hex }}
          type="button"
        />
        <div className="bg-white px-2.5 pt-1.5 pb-2.5 text-left">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-neutral-500 uppercase">
            Pantone
          </p>
          <p className="mt-0.5 text-xs font-semibold text-neutral-900">
            {color.pantone}
          </p>
        </div>
      </div>
      <div
        className={`absolute z-40 w-max max-w-[calc(100vw-2rem)] min-w-64 ${
          popoverAlignment === 'right' ? 'right-0' : 'left-0'
        } ${
          popoverPlacement === 'top' ? 'bottom-full pb-2' : 'top-full pt-2'
        } ${
          popoverOpen ? 'block' : 'hidden'
        }`}
      >
        <div className="relative rounded-lg border border-neutral-200 bg-white p-4 text-left shadow-xl">
          <div className="absolute top-3 right-3 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-right shadow-sm">
            <p className="text-[9px] font-semibold tracking-[0.12em] text-neutral-500 uppercase">
              Pantone
            </p>
            <p className="mt-0.5 text-xs font-semibold text-neutral-900">
              {color.pantone}
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-neutral-500 uppercase">
                Hex
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Copy aria-hidden className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <PrintCopyButton
                  label={`${color.pantone} hex`}
                  onToast={onToast}
                  value={color.hex}
                />
              </div>
            </div>
            <PrintValueGroup
              color={color}
              label="RGB"
              onToast={onToast}
              values={rgbValues}
            />
            <PrintValueGroup
              color={color}
              label="CMYK"
              onToast={onToast}
              values={cmykValues}
            />
          </div>
        </div>
      </div>
    </article>
  )
}

function PrintColorGroups({
  groups,
  onToast,
}: {
  groups: BrandKitPrintColorGroup[]
  onToast: ShowToast
}) {
  if (!groups.length) return null

  return (
    <section className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">Print Colors</h3>
        <p className="text-sm text-neutral-600">
          Pantone-aligned swatches for merch, packaging, and print production.
        </p>
      </div>
      {groups.map((group) => (
        <section className="space-y-5" key={group.label}>
          <h4 className="text-base font-semibold text-neutral-900">
            {group.label}
          </h4>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
            {group.items.map((color) => (
              <PrintColorCard
                color={color}
                key={`${group.label}-${color.pantone}`}
                onToast={onToast}
              />
            ))}
          </div>
        </section>
      ))}
    </section>
  )
}

function AvatarIconColorChip({
  option,
  selected,
  onSelect,
}: {
  onSelect: () => void
  option: AvatarIconOption
  selected: boolean
}) {
  return (
    <button
      aria-pressed={selected}
      className="flex w-16 cursor-pointer flex-col items-start gap-2 text-center"
      onClick={onSelect}
      type="button"
    >
      <span
        className={`flex aspect-square w-16 items-center justify-center overflow-hidden rounded-md border p-2 transition-colors ${selectionRing(selected)}`}
        style={transparentPreviewStyle}
      >
        <img
          src={option.asset.previewUrl}
          alt=""
          className="block h-full w-full object-contain"
          loading="lazy"
        />
      </span>
      <span className="w-16 text-xs leading-4 font-medium text-neutral-700">
        {option.label}
      </span>
    </button>
  )
}

function AvatarColorChip({
  option,
  selected,
  onSelect,
}: {
  onSelect: () => void
  option: ColorOption
  selected: boolean
}) {
  return (
    <button
      aria-pressed={selected}
      className="flex w-16 cursor-pointer flex-col items-start gap-2 text-center"
      onClick={onSelect}
      type="button"
    >
      <span
        className={`block aspect-square w-16 rounded-md border transition-colors ${selectionRing(selected)}`}
        style={
          option.previewStyle ??
          (option.color
            ? { backgroundColor: normalizeHexColor(option.color) }
            : transparentPreviewStyle)
        }
      />
      <span className="w-16 text-xs leading-4 font-medium text-neutral-700">
        {option.label}
      </span>
    </button>
  )
}

function AvatarCustomColorChip({
  draftValue,
  inputLabel,
  open,
  option,
  pickerValue,
  placeholder,
  selected,
  onChange,
  onClose,
  onDraftChange,
  onOpen,
}: {
  draftValue: string
  inputLabel: string
  onChange: (value: string) => void
  onClose: () => void
  onDraftChange: (value: string) => void
  onOpen: () => void
  open: boolean
  option: ColorOption
  pickerValue: string
  placeholder: string
  selected: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        onClose()
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose, open])

  return (
    <div
      className="relative flex w-16 flex-col items-start gap-2 text-center"
      ref={containerRef}
    >
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-pressed={selected}
        className="flex w-16 cursor-pointer flex-col items-start gap-2"
        onClick={onOpen}
        type="button"
      >
        <span
          className={`block aspect-square w-16 rounded-md border transition-colors ${selectionRing(selected)}`}
          style={
            option.previewStyle ??
            (option.color
              ? { backgroundColor: normalizeHexColor(option.color) }
              : transparentPreviewStyle)
          }
        />
        <span className="w-16 text-xs leading-4 font-medium text-neutral-700">
          {option.label}
        </span>
      </button>
      {open ? (
        <div
          aria-label={inputLabel}
          className="absolute top-full left-1/2 z-30 mt-3 w-56 -translate-x-1/2 rounded-md border border-slate-200 bg-white p-3 text-left shadow-xl"
          role="dialog"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
              Custom
            </p>
            <button
              aria-label="Close custom color picker"
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={onClose}
              type="button"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-[3rem_minmax(0,1fr)] items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
              <span>Pick</span>
              <input
                aria-label={`${inputLabel} picker`}
                className="h-9 w-12 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                onChange={(event) => onChange(event.currentTarget.value)}
                type="color"
                value={pickerValue}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
              <span>Hex</span>
              <input
                aria-label={`${inputLabel} hex`}
                className="h-9 min-w-0 rounded-md border border-slate-300 bg-white px-2.5 font-mono text-sm tracking-normal text-slate-900 uppercase"
                onChange={(event) => onDraftChange(event.currentTarget.value)}
                maxLength={7}
                placeholder={placeholder}
                type="text"
                value={draftValue}
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function AvatarShapeChip({
  label,
  selected,
  shape,
  onSelect,
}: {
  label: string
  onSelect: () => void
  selected: boolean
  shape: AvatarShape
}) {
  return (
    <button
      aria-pressed={selected}
      className="flex w-16 cursor-pointer flex-col items-start gap-2 text-center"
      onClick={onSelect}
      type="button"
    >
      <span
        className={`flex aspect-square w-16 items-center justify-center rounded-md border bg-white transition-colors ${selectionRing(selected)}`}
      >
        <span className={`block h-8 w-8 bg-[#2b333f] ${getAvatarShapeClass(shape)}`} />
      </span>
      <span className="w-16 text-xs leading-4 font-medium text-neutral-700">
        {label}
      </span>
    </button>
  )
}

function AvatarBorderThicknessChip({
  label,
  selected,
  thickness,
  onSelect,
}: {
  label: string
  onSelect: () => void
  selected: boolean
  thickness: AvatarBorderThickness
}) {
  const previewThickness =
    thickness === 'none'
      ? 1
      : Math.max(
          2,
          Math.round(
            (avatarBorderThicknessOptions.find(
              (option) => option.value === thickness,
            )?.ratio ?? 0) * 14,
          ),
        )

  return (
    <button
      aria-pressed={selected}
      className="flex w-16 cursor-pointer flex-col items-start gap-2 text-center"
      onClick={onSelect}
      type="button"
    >
      <span
        className={`flex aspect-square w-16 items-center justify-center rounded-md border bg-white transition-colors ${selectionRing(selected)}`}
      >
        <span
          className="block h-8 w-8 rounded-[4px] bg-white"
          style={{
            boxShadow:
              thickness === 'none'
                ? `inset 0 0 0 ${previewThickness}px #cbd5e1`
                : `inset 0 0 0 ${previewThickness}px #0d2249`,
          }}
        />
      </span>
      <span className="w-16 text-xs leading-4 font-medium text-neutral-700">
        {label}
      </span>
    </button>
  )
}

function AvatarSizeChip({
  selected,
  size,
  onSelect,
}: {
  onSelect: () => void
  selected: boolean
  size: number
}) {
  return (
    <button
      aria-pressed={selected}
      className="flex w-16 cursor-pointer flex-col items-start gap-2 text-center"
      onClick={onSelect}
      type="button"
    >
      <span
        className={`flex aspect-square w-16 items-center justify-center rounded-md border bg-white font-mono text-sm font-semibold text-neutral-800 transition-colors ${selectionRing(selected)}`}
      >
        {size}
      </span>
      <span className="w-16 text-xs leading-4 font-medium text-neutral-700">
        {size}px
      </span>
    </button>
  )
}

function AvatarGenerator({
  assets,
  brandLabel,
  canUseDevActions,
  colorSections,
  colors,
  endpoints,
}: {
  assets: BrandKitAsset[]
  brandLabel: string
  canUseDevActions: boolean
  colorSections: BrandKitColorSection[]
  colors: BrandKitColor[]
  endpoints?: BrandKitPageEndpoints
}) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const iconOptions = useMemo(
    () => inferAvatarIconOptions(assets, colors),
    [assets, colors],
  )
  const [iconKey, setIconKey] = useState(iconOptions[0]?.key ?? '')
  const [background, setBackground] = useState('transparent')
  const [backgroundCustomDraft, setBackgroundCustomDraft] = useState('')
  const [backgroundCustomHex, setBackgroundCustomHex] = useState('')
  const [backgroundCustomOpen, setBackgroundCustomOpen] = useState(false)
  const [border, setBorder] = useState('primary')
  const [borderCustomDraft, setBorderCustomDraft] = useState('')
  const [borderCustomHex, setBorderCustomHex] = useState('')
  const [borderCustomOpen, setBorderCustomOpen] = useState(false)
  const [borderThickness, setBorderThickness] =
    useState<AvatarBorderThickness>('none')
  const [shape, setShape] = useState<AvatarShape>('square')
  const [padding, setPadding] = useState(18)
  const [avatarSize, setAvatarSize] = useState(1024)
  const [status, setStatus] = useState('')
  const [isDownloadingFavicons, setDownloadingFavicons] = useState(false)
  const [isInstallingFavicon, setInstallingFavicon] = useState(false)
  const customPreviewColors = useMemo(
    () => findCustomPreviewColors(colors, colorSections),
    [colorSections, colors],
  )
  const customPickerFallback = getColorPickerFallback(customPreviewColors)
  const backgroundOptions = useMemo(
    () => makeFixedBackgroundOptions(customPreviewColors, backgroundCustomHex),
    [backgroundCustomHex, customPreviewColors],
  )
  const borderOptions = useMemo(
    () => makeFixedBorderOptions(colors, customPreviewColors, borderCustomHex),
    [borderCustomHex, colors, customPreviewColors],
  )
  const selectedIconOption =
    iconOptions.find((option) => option.key === iconKey) ?? iconOptions[0] ?? null
  const selectedAsset = selectedIconOption?.asset ?? null
  const selectedBackground = getColorOption(backgroundOptions, background)
  const selectedBorder = getColorOption(borderOptions, border)
  const backgroundColor = selectedBackground?.color ?? null
  const borderColor = selectedBorder?.color ?? '#05070b'
  const avatarAccentColor =
    normalizeOptionalHexColor(findPrimaryColor(colors).hex) ?? '#3a89c0'
  const avatarFilePrefix = slugify(brandLabel) || 'brand'
  const borderThicknessPixels = getAvatarBorderThickness(
    borderThickness,
    avatarSize,
  )
  const iconWidthPercent = 100 - padding * 2
  const previewSurfaceStyle =
    !backgroundColor || shape !== 'square' ? transparentPreviewStyle : undefined
  const canInstallFavicon = canUseDevActions && Boolean(endpoints?.favicon)

  useEffect(() => {
    if (!selectedIconOption && iconOptions[0]) {
      setIconKey(iconOptions[0].key)
    }
  }, [iconOptions, selectedIconOption])

  useEffect(() => {
    const canvas = previewCanvasRef.current

    if (!canvas || !selectedAsset) return

    let isCurrent = true

    drawAvatarCanvas({
      backgroundColor,
      borderColor,
      borderThickness: borderThicknessPixels,
      canvas,
      iconSrc: selectedAsset.previewUrl,
      iconWidthPercent,
      shape,
      size: avatarSize,
      isCurrent: () => isCurrent,
    }).catch(() => {
      if (isCurrent) setStatus('Could not render avatar preview.')
    })

    return () => {
      isCurrent = false
    }
  }, [
    avatarSize,
    backgroundColor,
    borderColor,
    borderThicknessPixels,
    iconWidthPercent,
    selectedAsset,
    shape,
  ])

  function resetAvatarGenerator() {
    setIconKey(iconOptions[0]?.key ?? '')
    setBackground('transparent')
    setBackgroundCustomDraft('')
    setBackgroundCustomHex('')
    setBackgroundCustomOpen(false)
    setBorder('primary')
    setBorderCustomDraft('')
    setBorderCustomHex('')
    setBorderCustomOpen(false)
    setBorderThickness('none')
    setShape('square')
    setPadding(18)
    setAvatarSize(1024)
    setStatus('')
  }

  async function createAvatarCanvas(targetSize = avatarSize) {
    if (!selectedAsset) throw new Error('Choose an icon first.')

    const canvas = document.createElement('canvas')

    await drawAvatarCanvas({
      backgroundColor,
      borderColor,
      borderThickness: getAvatarBorderThickness(borderThickness, targetSize),
      canvas,
      iconSrc: selectedAsset.previewUrl,
      iconWidthPercent,
      shape,
      size: targetSize,
    })

    return canvas
  }

  async function downloadAvatar(targetSize = avatarSize, fileName?: string) {
    const canvas = await createAvatarCanvas(targetSize)
    const blob = await canvasToPngBlob(canvas)

    downloadBlob(blob, fileName ?? `${avatarFilePrefix}-avatar-${targetSize}px.png`)
  }

  async function downloadFavicons() {
    setDownloadingFavicons(true)
    setStatus('Building favicon kit...')

    try {
      const zip = new JSZip()
      const pngs = new Map<number, Blob>()

      await Promise.all(
        faviconPngSizes.map(async (faviconSize) => {
          const canvas = await createAvatarCanvas(faviconSize)
          pngs.set(faviconSize, await canvasToPngBlob(canvas))
        }),
      )

      const getPng = (size: number) => {
        const blob = pngs.get(size)

        if (!blob) throw new Error(`Could not generate ${size}px favicon.`)

        return blob
      }
      const ico = makeIcoBlob(
        await Promise.all(
          faviconIcoSizes.map(async (faviconSize) => ({
            size: faviconSize,
            buffer: await getPng(faviconSize).arrayBuffer(),
          })),
        ),
      )
      const pngEntries = [
        { fileName: 'favicon-16x16.png', size: 16 },
        { fileName: 'favicon-32x32.png', size: 32 },
        { fileName: 'favicon-48x48.png', size: 48 },
        { fileName: 'apple-touch-icon.png', size: 180 },
        { fileName: 'android-chrome-192x192.png', size: 192 },
        { fileName: 'android-chrome-512x512.png', size: 512 },
        { fileName: 'icon1.png', size: 32 },
        { fileName: 'icon2.png', size: 192 },
        { fileName: 'icon3.png', size: 512 },
        { fileName: 'apple-icon.png', size: 180 },
      ] as const

      zip.file('favicon.ico', ico)
      pngEntries.forEach((entry) => zip.file(entry.fileName, getPng(entry.size)))

      const content = await zip.generateAsync({ type: 'blob' })

      downloadBlob(content, `${avatarFilePrefix}-favicons.zip`)
      setStatus(`Downloaded ${pngEntries.length + 1} favicon files.`)
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Could not download favicon kit.',
      )
    } finally {
      setDownloadingFavicons(false)
    }
  }

  async function installFavicons() {
    if (!endpoints?.favicon) return

    setInstallingFavicon(true)
    setStatus('Installing favicon files...')

    try {
      const canvas = await createAvatarCanvas(1024)
      const response = await fetch(endpoints.favicon, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: canvas.toDataURL('image/png') }),
      })
      const result = (await response.json()) as {
        error?: string
        files?: string[]
      }

      if (!response.ok) {
        throw new Error(result.error ?? 'Could not install favicon files.')
      }

      setStatus(`Installed ${result.files?.length ?? 0} favicon files.`)
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Could not install favicon files.',
      )
    } finally {
      setInstallingFavicon(false)
    }
  }

  function applyBackgroundCustomPickerHex(value: string) {
    setBackgroundCustomOpen(true)
    setBorderCustomOpen(false)

    const normalized = normalizeOptionalHexColor(value)

    if (!normalized) return

    setBackgroundCustomDraft(normalized)
    setBackgroundCustomHex(normalized)
    setBackground('custom')
  }

  function applyBackgroundCustomTextHex(value: string) {
    setBackgroundCustomOpen(true)
    setBorderCustomOpen(false)
    setBackgroundCustomDraft(value)

    const normalized = normalizeOptionalHexColor(value)

    if (!normalized) return

    setBackgroundCustomHex(normalized)
    setBackground('custom')
  }

  function ensureBorderVisible() {
    if (borderThickness === 'none') setBorderThickness('thin')
  }

  function applyBorderCustomPickerHex(value: string) {
    setBorderCustomOpen(true)
    setBackgroundCustomOpen(false)

    const normalized = normalizeOptionalHexColor(value)

    if (!normalized) return

    setBorderCustomDraft(normalized)
    setBorderCustomHex(normalized)
    setBorder('custom')
    ensureBorderVisible()
  }

  function applyBorderCustomTextHex(value: string) {
    setBorderCustomOpen(true)
    setBackgroundCustomOpen(false)
    setBorderCustomDraft(value)

    const normalized = normalizeOptionalHexColor(value)

    if (!normalized) return

    setBorderCustomHex(normalized)
    setBorder('custom')
    ensureBorderVisible()
  }

  function selectBackgroundOption(option: ColorOption) {
    if (option.key === 'custom') {
      setBackgroundCustomOpen(true)
      setBorderCustomOpen(false)
      return
    }

    setBackground(option.key)
    setBackgroundCustomOpen(false)
  }

  function selectBorderOption(option: ColorOption) {
    if (option.key === 'custom') {
      setBorderCustomOpen(true)
      setBackgroundCustomOpen(false)
      return
    }

    setBorder(option.key)
    setBorderCustomOpen(false)
    ensureBorderVisible()
  }

  if (!assets.length) return null

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-950">Avatar Generator</h3>
        <p className="mt-1 text-sm text-slate-600">
          Make a profile-ready PNG from the approved icon.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-stretch">
        <div className="relative grid gap-y-12 rounded-md border border-slate-200 bg-white p-6 md:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
          <button
            aria-label="Reset avatar generator"
            className="absolute top-3 left-3 z-10 inline-flex h-8 w-8 cursor-pointer items-center justify-center text-slate-500 transition hover:text-blue-700"
            onClick={resetAvatarGenerator}
            title="Reset avatar generator"
            type="button"
          >
            <ResetIcon />
          </button>
          <div className="flex w-max max-w-full flex-col gap-4 justify-self-center md:col-start-1 md:row-start-1">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
              Icon
            </p>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-4">
              {iconOptions.map((option) => (
                <AvatarIconColorChip
                  key={option.key}
                  option={option}
                  selected={selectedIconOption?.key === option.key}
                  onSelect={() => setIconKey(option.key)}
                />
              ))}
            </div>
          </div>
          <div className="flex w-max max-w-full flex-col gap-4 justify-self-center md:col-start-1 md:row-start-2">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
              Background
            </p>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-4">
              {backgroundOptions.map((option) =>
                option.key === 'custom' ? (
                  <AvatarCustomColorChip
                    key={option.key}
                    draftValue={backgroundCustomDraft}
                    inputLabel="Custom background color"
                    open={backgroundCustomOpen}
                    option={option}
                    pickerValue={backgroundCustomHex || customPickerFallback}
                    placeholder={customPickerFallback}
                    selected={
                      backgroundCustomOpen || selectedBackground?.key === option.key
                    }
                    onChange={applyBackgroundCustomPickerHex}
                    onClose={() => setBackgroundCustomOpen(false)}
                    onDraftChange={applyBackgroundCustomTextHex}
                    onOpen={() => {
                      setBackgroundCustomOpen(true)
                      setBorderCustomOpen(false)
                    }}
                  />
                ) : (
                  <AvatarColorChip
                    key={option.key}
                    option={option}
                    selected={selectedBackground?.key === option.key}
                    onSelect={() => selectBackgroundOption(option)}
                  />
                ),
              )}
            </div>
          </div>
          <div className="flex w-max max-w-full flex-col gap-4 justify-self-center md:col-start-1 md:row-start-3">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
              Shape
            </p>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-4">
              {avatarShapeOptions.map((option) => (
                <AvatarShapeChip
                  key={option.value}
                  label={option.label}
                  shape={option.value}
                  selected={shape === option.value}
                  onSelect={() => setShape(option.value)}
                />
              ))}
            </div>
          </div>
          <div
            aria-hidden="true"
            className="relative hidden self-stretch md:col-start-2 md:row-span-3 md:row-start-1 md:block"
          >
            <span className="absolute -top-3 -bottom-3 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
          </div>
          <div className="flex w-max max-w-full flex-col gap-4 justify-self-center md:col-start-3 md:row-start-1">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
              Border color
            </p>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-4">
              {borderOptions.map((option) =>
                option.key === 'custom' ? (
                  <AvatarCustomColorChip
                    key={option.key}
                    draftValue={borderCustomDraft}
                    inputLabel="Custom border color"
                    open={borderCustomOpen}
                    option={option}
                    pickerValue={borderCustomHex || customPickerFallback}
                    placeholder={customPickerFallback}
                    selected={borderCustomOpen || selectedBorder?.key === option.key}
                    onChange={applyBorderCustomPickerHex}
                    onClose={() => setBorderCustomOpen(false)}
                    onDraftChange={applyBorderCustomTextHex}
                    onOpen={() => {
                      setBorderCustomOpen(true)
                      setBackgroundCustomOpen(false)
                    }}
                  />
                ) : (
                  <AvatarColorChip
                    key={option.key}
                    option={option}
                    selected={selectedBorder?.key === option.key}
                    onSelect={() => selectBorderOption(option)}
                  />
                ),
              )}
            </div>
          </div>
          <div className="flex w-max max-w-full flex-col gap-4 justify-self-center md:col-start-3 md:row-start-2">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
              Border thickness
            </p>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-4">
              {avatarBorderThicknessOptions.map((option) => (
                <AvatarBorderThicknessChip
                  key={option.value}
                  label={option.label}
                  thickness={option.value}
                  selected={borderThickness === option.value}
                  onSelect={() => setBorderThickness(option.value)}
                />
              ))}
            </div>
          </div>
          <div className="flex w-max max-w-full flex-col gap-4 justify-self-center md:col-start-3 md:row-start-3">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
              Size
            </p>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-4">
              {avatarSizeOptions.map((size) => (
                <AvatarSizeChip
                  key={size}
                  size={size}
                  selected={avatarSize === size}
                  onSelect={() => setAvatarSize(size)}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex min-h-80 flex-col items-center justify-center gap-5 rounded-md border border-slate-200 bg-white p-5 text-center shadow-sm">
          <span
            className={`flex aspect-square w-full max-w-64 items-center justify-center overflow-hidden ${getAvatarShapeClass(shape)}`}
            style={previewSurfaceStyle}
          >
            <canvas
              ref={previewCanvasRef}
              aria-label="Avatar preview"
              className="block aspect-square w-full"
            />
          </span>
          <label className="flex w-full max-w-64 flex-col gap-3">
            <span className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                Icon padding
              </span>
            </span>
            <input
              className="w-full cursor-pointer"
              max="34"
              min="0"
              onChange={(event) => setPadding(Number(event.currentTarget.value))}
              style={{ accentColor: avatarAccentColor }}
              type="range"
              value={padding}
            />
          </label>
          <button
            className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-[#2b333f] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1d232b]"
            onClick={() => void downloadAvatar()}
            type="button"
          >
            <DownloadIcon />
            <span>Download PNG ({avatarSize}px)</span>
          </button>
          <button
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDownloadingFavicons}
            onClick={() => void downloadFavicons()}
            type="button"
          >
            <DownloadIcon />
            <span>
              {isDownloadingFavicons
                ? 'Building favicon kit...'
                : 'Download favicon kit'}
            </span>
          </button>
          {canInstallFavicon ? (
            <button
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isInstallingFavicon}
              onClick={() => void installFavicons()}
              type="button"
            >
              <UploadIcon />
              <span>
                {isInstallingFavicon ? 'Installing favicon...' : 'Install as favicon'}
              </span>
            </button>
          ) : null}
          {status ? (
            <p className="max-w-64 text-sm font-medium text-slate-500">
              {status}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

type BannerMarkVariantOption = BrandKitBannerControls['markVariants'][number] & {
  previewBackgroundColor?: string
  previewUrl?: string
}

function isBannerIconVariant(option: Pick<BannerMarkVariantOption, 'key' | 'label'>) {
  return /(^|[^a-z0-9])(brandmark|icon|symbol)([^a-z0-9]|$)/i.test(
    `${option.key} ${option.label}`,
  )
}

function bannerMarkPreviewBackgroundColor(
  colorOption?: { hex: string; key: string; label: string },
) {
  return colorOption && isWhiteBannerMarkColorOption(colorOption)
    ? '#d1d5db'
    : '#ffffff'
}

function BannerMarkVariantGroup({
  disabled,
  onChange,
  options,
  value,
}: {
  disabled?: boolean
  onChange: (value: string) => void
  options: readonly BannerMarkVariantOption[]
  value: string
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold tracking-[0.16em] text-neutral-500 uppercase">
        Mark
      </legend>
      <div className="flex flex-wrap items-start gap-4">
        {options.map((option) => {
          const selected = value === option.key
          const isIcon = isBannerIconVariant(option)
          const buttonClass = isIcon ? 'w-[80px]' : 'w-auto'
          const previewClass = isIcon
            ? 'h-[80px] w-[80px] p-1.5'
            : 'h-[80px] w-auto p-1.5'
          const imageClass = isIcon
            ? 'block h-full w-full object-contain'
            : 'block h-full w-auto object-contain'

          return (
            <button
              aria-label={option.label}
              aria-pressed={selected}
              className={`group flex ${buttonClass} shrink-0 cursor-pointer items-center justify-center disabled:cursor-not-allowed disabled:opacity-50`}
              disabled={disabled}
              key={option.key}
              onClick={() => onChange(option.key)}
              title={option.label}
              type="button"
            >
              <span
                className={`flex ${previewClass} shrink-0 items-center justify-center overflow-hidden rounded-md border transition-colors group-hover:border-slate-400 ${selectionRing(selected)}`}
                style={{ backgroundColor: option.previewBackgroundColor ?? '#ffffff' }}
              >
                {option.previewUrl ? (
                  <img
                    alt=""
                    className={imageClass}
                    loading="lazy"
                    src={option.previewUrl}
                  />
                ) : (
                  <span className="text-xs font-semibold text-slate-500">
                    {option.label.slice(0, 1)}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function bannerBaseColorOptions(
  colors: BrandKitBannerControls['colors'],
): BannerBaseColorOption[] {
  const baseColors = colors.slice(0, 3)
  const tones = [
    {
      labelPrefix: 'Dark',
      mixAmount: 0.42,
      target: '#05070b',
    },
    {
      labelPrefix: 'Light',
      mixAmount: 0.7,
      target: '#ffffff',
    },
  ]

  return tones.flatMap((tone) =>
    baseColors.map((color, index) => {
      const hex = mixHexColor(color.hex, tone.target, tone.mixAmount)
      const secondaryColor =
        baseColors[(index + 1) % baseColors.length]?.hex ?? color.hex

      return {
        accentColor: color.hex,
        hex,
        key: hex,
        label: `${tone.labelPrefix} ${color.label}`,
        secondaryColor,
      }
    }),
  )
}

const bannerAlignmentIcons: Record<string, LucideIcon> = {
  center: AlignCenterVertical,
  left: AlignStartVertical,
  right: AlignEndVertical,
}

function BannerOptionsGroup({
  alignmentOptions,
  alignmentValue,
  disabled,
  markColorOptions,
  markColorValue,
  onAlignmentChange,
  onMarkColorChange,
}: {
  alignmentOptions: readonly { key: string; label: string }[]
  alignmentValue: string
  disabled?: boolean
  markColorOptions: readonly { hex: string; key: string; label: string }[]
  markColorValue: string
  onAlignmentChange: (value: string) => void
  onMarkColorChange: (value: string) => void
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold tracking-[0.16em] text-neutral-500 uppercase">
        Options
      </legend>
      <div className="inline-grid grid-cols-3 gap-1.5 rounded-md border border-neutral-300 bg-white p-1.5">
        {markColorOptions.map((option) => {
          const selected = markColorValue === option.key

          return (
            <button
              aria-label={`Logo color: ${option.label}`}
              aria-pressed={selected}
              className={`flex size-8 cursor-pointer items-center justify-center rounded-md transition-all hover:bg-slate-100 hover:shadow-[inset_0_0_0_1px_#64748b] disabled:cursor-not-allowed disabled:opacity-40 ${
                selected
                  ? 'bg-slate-100 shadow-[inset_0_0_0_1px_#0d2249]'
                  : 'bg-white'
              }`}
              disabled={disabled}
              key={`mark-color-${option.key}`}
              onClick={() => onMarkColorChange(option.key)}
              title={option.label}
              type="button"
            >
              <span
                className="size-5 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.18)]"
                style={{ backgroundColor: option.hex }}
              />
              <span className="sr-only">Logo color: {option.label}</span>
            </button>
          )
        })}
        {alignmentOptions.map((option) => {
          const Icon = bannerAlignmentIcons[option.key] ?? AlignCenterVertical
          const selected = alignmentValue === option.key

          return (
            <button
              aria-label={`Align ${option.label.toLowerCase()}`}
              aria-pressed={selected}
              className={`flex size-8 cursor-pointer items-center justify-center rounded-md transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? 'bg-[#0d2249] text-white hover:bg-slate-800'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 hover:shadow-[inset_0_0_0_1px_#64748b]'
              }`}
              disabled={disabled}
              key={`alignment-${option.key}`}
              onClick={() => onAlignmentChange(option.key)}
              title={option.label}
              type="button"
            >
              <Icon aria-hidden className="size-5" />
              <span className="sr-only">Align {option.label.toLowerCase()}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function BannerBaseColorGroup({
  disabled,
  onChange,
  options,
  value,
}: {
  disabled?: boolean
  onChange: (value: string) => void
  options: readonly BannerBaseColorOption[]
  value: string
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold tracking-[0.16em] text-neutral-500 uppercase">
        Base
      </legend>
      <div className="inline-grid grid-cols-3 gap-1.5 rounded-md border border-neutral-300 bg-white p-1.5">
        {options.map((option) => {
          const selected = value === option.key || value === option.hex

          return (
            <button
              aria-label={`Base color: ${option.label}`}
              aria-pressed={selected}
              className={`flex size-8 cursor-pointer items-center justify-center rounded-md transition-all hover:bg-slate-100 hover:shadow-[inset_0_0_0_1px_#64748b] disabled:cursor-not-allowed disabled:opacity-40 ${
                selected
                  ? 'bg-slate-100 shadow-[inset_0_0_0_1px_#0d2249]'
                  : 'bg-white'
              }`}
              disabled={disabled}
              key={`base-color-${option.key}-${option.hex}`}
              onClick={() => onChange(option.key)}
              title={option.label}
              type="button"
            >
              <span
                className="size-5 rounded-md shadow-[0_0_0_1px_rgba(0,0,0,0.18)]"
                style={{ backgroundColor: option.hex }}
              />
              <span className="sr-only">Base color: {option.label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function BannerPatternGroup({
  disabled,
  onChange,
  options,
  value,
}: {
  disabled?: boolean
  onChange: (value: string) => void
  options: readonly { key: string; label: string }[]
  value: string
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold tracking-[0.16em] text-neutral-500 uppercase">
        Pattern
      </legend>
      <div className="inline-grid grid-cols-3 gap-1.5 rounded-md border border-neutral-300 bg-white p-1.5">
        {options.map((option, index) => {
          const selected = value === option.key

          return (
            <button
              aria-label={`Pattern: ${option.label}`}
              aria-pressed={selected}
              className={`flex size-8 cursor-pointer items-center justify-center rounded-md text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? 'bg-[#0d2249] text-white hover:bg-slate-800'
                  : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 hover:shadow-[inset_0_0_0_1px_#64748b]'
              }`}
              disabled={disabled}
              key={option.key}
              onClick={() => onChange(option.key)}
              title={option.label}
              type="button"
            >
              {index + 1}
              <span className="sr-only">{option.label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function BannerLockToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      className={`inline-flex items-center gap-2 text-sm font-medium text-slate-700 ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      }`}
      title={disabled ? 'Banner lock changes are local-only.' : undefined}
    >
      <span>Lock banners</span>
      <input
        checked={checked}
        className="peer sr-only"
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
        type="checkbox"
      />
      <span className="relative h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-[#0d2249] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#3a89c0] after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  )
}

function getBannerEdgeAlignedLeft({
  alignment,
  canvasWidth,
  markWidth,
}: {
  alignment: string
  canvasWidth: number
  markWidth: number
}) {
  const edgeInset = Math.max(80, Math.round(canvasWidth * 0.027))

  if (alignment === 'left') return edgeInset
  if (alignment === 'right') return canvasWidth - markWidth - edgeInset

  return Math.round(canvasWidth * 0.5 - markWidth / 2)
}

function bannerColorValue(
  colors: BrandKitBannerControls['colors'],
  key: string,
  fallback: string,
) {
  const hex = normalizeOptionalHexColor(key)

  if (hex) return hex

  return colors.find((color) => color.key === key)?.hex ?? fallback
}

function drawBannerPath({
  accentColor,
  context,
  height,
  pattern,
  secondaryColor,
  width,
}: {
  accentColor: string
  context: CanvasRenderingContext2D
  height: number
  pattern: string
  secondaryColor: string
  width: number
}) {
  const overscan = Math.max(width, height)

  context.save()

  if (pattern === 'radial-glow') {
    context.globalAlpha = 0.72
    context.fillStyle = accentColor
    context.beginPath()
    context.arc(width * 0.74, height * 0.5, overscan * 0.42, 0, Math.PI * 2)
    context.fill()
    context.globalAlpha = 0.18
    context.fillStyle = secondaryColor
    context.beginPath()
    context.arc(width * 0.12, height * 0.2, overscan * 0.24, 0, Math.PI * 2)
    context.fill()
    context.globalAlpha = 0.2
    context.fillStyle = accentColor
    context.beginPath()
    context.moveTo(width * 0.02, height)
    context.bezierCurveTo(
      width * 0.28,
      height * 0.35,
      width * 0.54,
      height * 0.82,
      width,
      height * 0.22,
    )
    context.lineTo(width, height)
    context.closePath()
    context.fill()
    context.restore()
    return
  }

  if (pattern === 'split-field') {
    context.globalAlpha = 0.92
    context.fillStyle = accentColor
    context.beginPath()
    context.moveTo(width * 0.52, 0)
    context.lineTo(width, 0)
    context.lineTo(width, height)
    context.lineTo(width * 0.36, height)
    context.closePath()
    context.fill()
    context.globalAlpha = 0.18
    context.fillStyle = secondaryColor
    context.beginPath()
    context.moveTo(width * 0.7, 0)
    context.lineTo(width, 0)
    context.lineTo(width, height)
    context.lineTo(width * 0.88, height)
    context.closePath()
    context.fill()
    context.globalAlpha = 0.14
    context.beginPath()
    context.arc(width * 0.82, height * 0.5, overscan * 0.22, 0, Math.PI * 2)
    context.fill()
    context.restore()
    return
  }

  if (pattern === 'corner-frame') {
    context.globalAlpha = 0.62
    context.fillStyle = accentColor
    context.beginPath()
    context.moveTo(0, 0)
    context.lineTo(width * 0.44, 0)
    context.lineTo(width * 0.22, height * 0.24)
    context.lineTo(0, height * 0.24)
    context.closePath()
    context.fill()
    context.globalAlpha = 0.72
    context.beginPath()
    context.moveTo(width, height)
    context.lineTo(width * 0.52, height)
    context.lineTo(width * 0.74, height * 0.72)
    context.lineTo(width, height * 0.72)
    context.closePath()
    context.fill()
    context.globalAlpha = 0.16
    context.fillStyle = secondaryColor
    context.beginPath()
    context.moveTo(width * 0.84, 0)
    context.lineTo(width, 0)
    context.lineTo(width, height * 0.42)
    context.lineTo(width * 0.7, height * 0.2)
    context.closePath()
    context.fill()
    context.globalAlpha = 0.2
    context.beginPath()
    context.moveTo(0, height * 0.7)
    context.lineTo(width * 0.18, height)
    context.lineTo(0, height)
    context.closePath()
    context.fill()
    context.restore()
    return
  }

  if (pattern === 'horizon-lines') {
    context.globalAlpha = 0.5
    context.fillStyle = accentColor
    context.fillRect(0, height * 0.58, width, height * 0.17)
    context.globalAlpha = 0.16
    context.fillStyle = secondaryColor
    context.fillRect(0, height * 0.42, width, height * 0.06)
    context.globalAlpha = 0.18
    context.fillRect(0, height * 0.82, width, height * 0.06)
    context.globalAlpha = 0.16
    context.fillStyle = accentColor
    context.fillRect(width * 0.58, 0, width * 0.14, height)
    context.restore()
    return
  }

  if (pattern === 'offset-stack') {
    context.globalAlpha = 0.54
    context.fillStyle = accentColor
    context.beginPath()
    context.moveTo(width * 0.48, 0)
    context.lineTo(width, 0)
    context.lineTo(width, height * 0.28)
    context.lineTo(width * 0.4, height * 0.28)
    context.closePath()
    context.fill()
    context.globalAlpha = 0.16
    context.fillStyle = secondaryColor
    context.beginPath()
    context.moveTo(width * 0.58, height * 0.34)
    context.lineTo(width, height * 0.34)
    context.lineTo(width, height * 0.56)
    context.lineTo(width * 0.5, height * 0.56)
    context.closePath()
    context.fill()
    context.globalAlpha = 0.62
    context.fillStyle = accentColor
    context.beginPath()
    context.moveTo(width * 0.38, height * 0.62)
    context.lineTo(width, height * 0.62)
    context.lineTo(width, height)
    context.lineTo(width * 0.28, height)
    context.closePath()
    context.fill()
    context.globalAlpha = 0.14
    context.fillStyle = secondaryColor
    context.fillRect(0, height * 0.12, width * 0.24, height * 0.3)
    context.restore()
    return
  }

  if (pattern === 'ribbon-fold') {
    context.globalAlpha = 0.48
    context.fillStyle = accentColor
    context.beginPath()
    context.moveTo(width * 0.18, 0)
    context.lineTo(width * 0.52, 0)
    context.lineTo(width * 0.38, height)
    context.lineTo(width * 0.02, height)
    context.closePath()
    context.fill()
    context.globalAlpha = 0.34
    context.beginPath()
    context.moveTo(width * 0.58, 0)
    context.lineTo(width * 0.86, 0)
    context.lineTo(width * 0.7, height)
    context.lineTo(width * 0.42, height)
    context.closePath()
    context.fill()
    context.globalAlpha = 0.16
    context.fillStyle = secondaryColor
    context.beginPath()
    context.moveTo(width * 0.82, 0)
    context.lineTo(width, 0)
    context.lineTo(width, height)
    context.lineTo(width * 0.72, height)
    context.closePath()
    context.fill()
    context.globalAlpha = 0.12
    context.beginPath()
    context.moveTo(0, height * 0.76)
    context.lineTo(width, height * 0.48)
    context.lineTo(width, height)
    context.lineTo(0, height)
    context.closePath()
    context.fill()
    context.restore()
    return
  }

  if (pattern === 'wave') {
    context.globalAlpha = 0.72
    context.fillStyle = accentColor
    context.beginPath()
    context.moveTo(0, height * 0.66)
    context.bezierCurveTo(
      width * 0.24,
      height * 0.28,
      width * 0.46,
      height * 0.96,
      width * 0.72,
      height * 0.4,
    )
    context.bezierCurveTo(
      width * 0.98,
      height * -0.16,
      width * 0.92,
      height * 0.22,
      width,
      height * 0.34,
    )
    context.lineTo(width, height)
    context.lineTo(0, height)
    context.closePath()
    context.fill()
    context.globalAlpha = 0.16
    context.fillStyle = secondaryColor
    context.beginPath()
    context.moveTo(0, height * 0.78)
    context.bezierCurveTo(
      width * 0.28,
      height * 0.42,
      width * 0.42,
      height * 1.05,
      width * 0.76,
      height * 0.56,
    )
    context.bezierCurveTo(
      width * 1.1,
      height * 0.07,
      width * 0.95,
      height * 0.44,
      width,
      height * 0.5,
    )
    context.lineTo(width, height)
    context.lineTo(0, height)
    context.closePath()
    context.fill()
    context.restore()
    return
  }
  context.globalAlpha = 0.78
  context.fillStyle = accentColor
  context.beginPath()
  context.moveTo(width * 0.58, 0)
  context.lineTo(width, 0)
  context.lineTo(width * 0.78, height)
  context.lineTo(width * 0.28, height)
  context.closePath()
  context.fill()
  context.globalAlpha = 0.16
  context.fillStyle = secondaryColor
  context.beginPath()
  context.moveTo(width * 0.86, 0)
  context.lineTo(width, 0)
  context.lineTo(width, height)
  context.lineTo(width * 0.68, height)
  context.closePath()
  context.fill()
  context.globalAlpha = 0.18
  context.fillStyle = accentColor
  context.beginPath()
  context.arc(width * 0.16, height * 0.18, overscan * 0.18, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

async function renderBannerPreviewOverride({
  asset,
  controls,
  state,
}: {
  asset: BrandKitBannerAsset
  controls: BrandKitBannerControls
  state: BannerPresetState
}): Promise<BannerPreviewOverride> {
  const variant =
    controls.markVariants.find((item) => item.key === state.markVariant) ??
    controls.markVariants[0]
  const markUrl =
    variant?.colorAssetUrls?.[state.markColor] ?? variant?.assetUrl ?? ''

  if (!markUrl) throw new Error('Could not find the selected banner mark.')

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  canvas.width = asset.width
  canvas.height = asset.height

  if (!context) throw new Error('Canvas is unavailable.')

  const backgroundColor = bannerColorValue(
    controls.colors,
    state.backgroundColor,
    '#0d2249',
  )
  const accentColor = bannerColorValue(controls.colors, state.accentColor, '#4784de')
  const secondaryColor = bannerColorValue(
    controls.colors,
    state.secondaryColor,
    '#ffffff',
  )
  const gradient = context.createLinearGradient(0, 0, asset.width, asset.height)
  const gradientAccentColor = mixHexColor(backgroundColor, accentColor, 0.22)
  const patternAccentColor = mixHexColor(backgroundColor, accentColor, 0.36)
  const patternSecondaryColor = mixHexColor(backgroundColor, secondaryColor, 0.28)

  gradient.addColorStop(0, backgroundColor)
  gradient.addColorStop(0.62, backgroundColor)
  gradient.addColorStop(1, gradientAccentColor)
  context.fillStyle = gradient
  context.globalAlpha = 1
  context.fillRect(0, 0, asset.width, asset.height)
  drawBannerPath({
    accentColor: patternAccentColor,
    context,
    height: asset.height,
    pattern: state.pattern,
    secondaryColor: patternSecondaryColor,
    width: asset.width,
  })
  context.globalAlpha = 0.18
  context.fillStyle = backgroundColor
  context.fillRect(0, 0, asset.width, asset.height)
  context.globalAlpha = 1

  const mark = await loadCanvasImage(markUrl)
  const markScale = Math.min(Math.max(variant?.scale ?? 0.34, 0.08), 0.72)
  const maxMarkWidth = asset.width * markScale
  const maxMarkHeight = asset.height * 0.68
  const naturalWidth = mark.naturalWidth || mark.width
  const naturalHeight = mark.naturalHeight || mark.height
  const scale = Math.min(maxMarkWidth / naturalWidth, maxMarkHeight / naturalHeight)
  const markWidth = naturalWidth * scale
  const markHeight = naturalHeight * scale
  const left =
    state.alignment === 'center'
      ? Math.round(asset.width * 0.5 - markWidth / 2)
      : getBannerEdgeAlignedLeft({
          alignment: state.alignment,
          canvasWidth: asset.width,
          markWidth,
        })
  const top = Math.round(asset.height * 0.5 - markHeight / 2)

  context.drawImage(
    mark,
    Math.min(Math.max(left, 0), asset.width - markWidth),
    Math.min(Math.max(top, 0), asset.height - markHeight),
    markWidth,
    markHeight,
  )

  return {
    assetId: asset.id,
    url: canvas.toDataURL('image/png'),
  }
}

async function renderBannerPreviewOverrides({
  banners,
  controls,
  state,
}: {
  banners: BrandKitBannerAsset[]
  controls: BrandKitBannerControls
  state: BannerPresetState
}) {
  return Promise.all(
    banners.map((asset) =>
      renderBannerPreviewOverride({
        asset,
        controls,
        state,
      }),
    ),
  )
}

function BannerPresetControls({
  banners,
  controls,
  endpoint,
  onToast,
  onUpdated,
}: {
  banners: BrandKitBannerAsset[]
  controls: BrandKitBannerControls
  endpoint: string
  onToast: ShowToast
  onUpdated: (overrides?: BannerPreviewOverride[]) => void
}) {
  const canRenderInBrowser = controls.markVariants.some(
    (variant) => variant.assetUrl || Object.keys(variant.colorAssetUrls ?? {}).length,
  )

  function getMarkColorOptions(markVariantKey: string) {
    const markVariant = controls.markVariants.find(
      (variant) => variant.key === markVariantKey,
    )

    return getBannerMarkColorOptions(markVariant, controls.colors)
  }

  function getDefaultMarkColor(markVariantKey: string) {
    const markVariant = controls.markVariants.find(
      (variant) => variant.key === markVariantKey,
    )

    return defaultBannerMarkColor(markVariant, controls.colors)
  }

  const defaultState = useMemo<BannerPresetState>(
    () => {
      const markVariant = controls.markVariants[0]?.key ?? ''
      const backgroundOptions = bannerBaseColorOptions(controls.colors)
      const backgroundOption = backgroundOptions[0]

      return {
        accentColor: backgroundOption?.accentColor ?? controls.colors[0]?.hex ?? '',
        alignment: 'center',
        backgroundColor: backgroundOption?.key ?? controls.colors[0]?.key ?? '',
        markColor: getDefaultMarkColor(markVariant),
        markVariant,
        pattern: controls.patterns[0]?.key ?? 'diagonal-sweep',
        secondaryColor:
          backgroundOption?.secondaryColor ??
          controls.colors[1]?.hex ??
          controls.colors[0]?.hex ??
          '',
      }
    },
    [controls],
  )
  const [state, setState] = useState(defaultState)
  const [isApplying, setApplying] = useState(false)
  const markColorOptions = getMarkColorOptions(state.markVariant)
  const baseColorOptions = useMemo(
    () => bannerBaseColorOptions(controls.colors),
    [controls.colors],
  )
  const patternOptions = useMemo(
    () =>
      controls.patterns
        .filter((pattern) => !['horizon-lines', 'wave'].includes(pattern.key))
        .slice(0, 6),
    [controls.patterns],
  )
  const markVariantOptions = controls.markVariants.map((variant) => {
    const fallbackColor = getDefaultMarkColor(variant.key)
    const variantColorOptions = getMarkColorOptions(variant.key)
    const requestedColorOption = variantColorOptions.find(
      (option) => option.key === state.markColor,
    )
    const fallbackColorOption = variantColorOptions.find(
      (option) => option.key === fallbackColor,
    )
    const previewColorOption = variant.colorAssetUrls?.[state.markColor]
      ? requestedColorOption
      : fallbackColorOption

    return {
      ...variant,
      previewBackgroundColor: bannerMarkPreviewBackgroundColor(previewColorOption),
      previewUrl:
        variant.colorAssetUrls?.[state.markColor] ??
        variant.colorAssetUrls?.[fallbackColor] ??
        variant.assetUrl,
    }
  })

  useEffect(() => {
    if (!canRenderInBrowser || !banners.length) return

    let isCurrent = true

    void renderBannerPreviewOverrides({
      banners,
      controls,
      state: defaultState,
    })
      .then((overrides) => {
        if (isCurrent) onUpdated(overrides)
      })
      .catch(() => {
        // Keep the generated assets visible if an in-browser preview cannot render.
      })

    return () => {
      isCurrent = false
    }
  }, [banners, canRenderInBrowser, controls, defaultState, onUpdated])

  async function apply(nextState: BannerPresetState) {
    setApplying(true)

    try {
      if (process.env.NODE_ENV === 'production' && canRenderInBrowser) {
        onUpdated(
          await renderBannerPreviewOverrides({
            banners,
            controls,
            state: nextState,
          }),
        )
        return
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextState),
      })
      const result = (await response.json()) as {
        error?: string
        files?: string[]
      }

      if (!response.ok) {
        throw new Error(result.error ?? 'Could not update banner presets.')
      }

      onUpdated()
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : 'Could not update banner presets.',
        'error',
      )
    } finally {
      setApplying(false)
    }
  }

  function update<Key extends keyof BannerPresetState>(
    key: Key,
    value: BannerPresetState[Key],
  ) {
    if (state[key] === value) return

    const nextState = { ...state, [key]: value }

    if (key === 'markVariant') {
      const nextMarkColorOptions = getMarkColorOptions(String(value))

      if (!nextMarkColorOptions.some((option) => option.key === nextState.markColor)) {
        nextState.markColor = getDefaultMarkColor(String(value))
      }
    }

    if (key === 'backgroundColor') {
      const selectedBaseColor = baseColorOptions.find(
        (option) => option.key === value || option.hex === value,
      )

      if (selectedBaseColor) {
        nextState.accentColor = selectedBaseColor.accentColor
        nextState.secondaryColor = selectedBaseColor.secondaryColor
      }
    }

    setState(nextState)
    void apply(nextState)
  }

  return (
    <div className="mt-6 w-full rounded-md border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-center gap-5 min-[1180px]:justify-between">
        <BannerMarkVariantGroup
          disabled={isApplying}
          onChange={(value) => update('markVariant', value)}
          options={markVariantOptions}
          value={state.markVariant}
        />
        <div className="flex w-full flex-wrap items-start justify-center gap-4 min-[520px]:w-auto min-[520px]:flex-nowrap min-[1180px]:ml-auto min-[1180px]:justify-end">
          <BannerOptionsGroup
            alignmentOptions={controls.alignments}
            alignmentValue={state.alignment}
            disabled={isApplying}
            markColorOptions={markColorOptions}
            markColorValue={state.markColor}
            onAlignmentChange={(value) => update('alignment', value)}
            onMarkColorChange={(value) => update('markColor', value)}
          />
          <BannerBaseColorGroup
            disabled={isApplying}
            onChange={(value) => update('backgroundColor', value)}
            options={baseColorOptions}
            value={state.backgroundColor}
          />
          <BannerPatternGroup
            disabled={isApplying}
            onChange={(value) => update('pattern', value)}
            options={patternOptions}
            value={state.pattern}
          />
        </div>
      </div>
    </div>
  )
}

function BannerCard({
  asset,
  canUpload,
  endpoint,
  isCustom,
  previewOverride,
  previewVersion,
  onCustomStateChange,
  onToast,
  onUpdated,
}: {
  asset: BrandKitBannerAsset
  canUpload: boolean
  endpoint?: string
  isCustom: boolean
  onCustomStateChange: (assetId: string, isCustom: boolean) => void
  onToast: ShowToast
  onUpdated: () => void
  previewOverride?: string
  previewVersion: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isReplacing, setReplacing] = useState(false)
  const [isResetting, setResetting] = useState(false)
  const previewUrl =
    previewOverride ??
    (previewVersion ? `${asset.previewUrl}?v=${previewVersion}` : asset.previewUrl)
  const downloads = asset.downloads.map((download) =>
    previewOverride && download.format === 'PNG'
      ? { ...download, url: previewOverride }
      : download,
  )
  const previewWidth = Math.round(asset.width * bannerPreviewScale)

  async function replaceBanner(file: File) {
    if (!endpoint) return

    const formData = new FormData()

    formData.append('assetId', asset.id)
    formData.append('file', file)
    setReplacing(true)
    onToast('Uploading custom banner...', 'info')

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })
      const result = (await response.json()) as {
        error?: string
        isCustom?: boolean
      }

      if (!response.ok) {
        throw new Error(result.error ?? 'Could not replace banner image.')
      }

      onCustomStateChange(asset.id, result.isCustom ?? true)
      onToast('Custom banner uploaded.')
      onUpdated()
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : 'Could not replace banner image.',
        'error',
      )
    } finally {
      setReplacing(false)
    }
  }

  async function resetBanner() {
    if (!endpoint) return

    setResetting(true)
    onToast('Resetting banner...', 'info')

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', assetId: asset.id }),
      })
      const result = (await response.json()) as {
        error?: string
        isCustom?: boolean
      }

      if (!response.ok) {
        throw new Error(result.error ?? 'Could not reset banner image.')
      }

      onCustomStateChange(asset.id, result.isCustom ?? false)
      onToast('Banner reset to default.')
      onUpdated()
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : 'Could not reset banner image.',
        'error',
      )
    } finally {
      setResetting(false)
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]

    event.currentTarget.value = ''
    if (file) void replaceBanner(file)
  }

  return (
    <article
      className="max-w-full overflow-hidden rounded-lg border border-neutral-200 bg-white"
      style={{ width: previewWidth }}
    >
      <div
        className="relative w-full overflow-hidden border-b border-neutral-200 bg-slate-100"
        style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
      >
        <img
          src={previewUrl}
          alt={asset.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="space-y-4 p-4">
        <div>
          <p className="text-sm font-semibold text-neutral-900">
            {asset.title}
          </p>
          <p className="mt-1 font-mono text-xs text-neutral-500">
            {asset.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {downloads.map((download) => (
            <AssetDownloadButton
              key={`${asset.id}-${download.fileName}`}
              download={download}
            />
          ))}
          {canUpload ? (
            <>
              <input
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="sr-only"
                onChange={handleFileChange}
                ref={inputRef}
                type="file"
              />
              <button
                className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isReplacing}
                onClick={() => inputRef.current?.click()}
                type="button"
              >
                <UploadIcon />
                <span>{isReplacing ? 'Uploading...' : 'Upload Custom'}</span>
              </button>
              {isCustom ? (
                <button
                  aria-label="Reset to default"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 bg-white text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isReplacing || isResetting}
                  onClick={() => void resetBanner()}
                  title="Reset to default"
                  type="button"
                >
                  <ResetIcon />
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function BannerGroup({
  canUseDevActions,
  customBannerIds,
  endpoints,
  group,
  previewOverrides,
  previewVersion,
  onCustomStateChange,
  onToast,
  onUpdated,
}: {
  canUseDevActions: boolean
  customBannerIds: ReadonlySet<string>
  endpoints?: BrandKitPageEndpoints
  group: BrandKitBannerGroup
  onCustomStateChange: (assetId: string, isCustom: boolean) => void
  onToast: ShowToast
  onUpdated: () => void
  previewOverrides: Record<string, string>
  previewVersion: number
}) {
  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold tracking-[0.12em] text-neutral-500 uppercase">
          {group.label}
        </h3>
        {group.description ? (
          <p className="mt-1 text-sm text-slate-600">{group.description}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-4">
        {group.items.map((asset) => (
          <BannerCard
            asset={asset}
            canUpload={canUseDevActions && Boolean(endpoints?.bannerUpload)}
            endpoint={endpoints?.bannerUpload}
            isCustom={customBannerIds.has(asset.id)}
            key={asset.id}
            onCustomStateChange={onCustomStateChange}
            onToast={onToast}
            onUpdated={onUpdated}
            previewOverride={previewOverrides[asset.id]}
            previewVersion={previewVersion}
          />
        ))}
      </div>
    </section>
  )
}

function Lightbox({
  asset,
  onClose,
}: {
  asset: BrandKitAsset | null
  onClose: () => void
}) {
  const lightboxDownload = asset ? getLightboxDownload(asset) : null
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!asset) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', closeOnEscape)

    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [asset, onClose])

  if (!asset) return null

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[120] bg-black/70 p-4 sm:p-8"
      onMouseDown={(event) => {
        if (
          event.target instanceof Node &&
          !panelRef.current?.contains(event.target)
        ) {
          onClose()
        }
      }}
      role="dialog"
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          className="w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl"
          ref={panelRef}
        >
          <div className="flex min-h-[60vh] items-center justify-center bg-[#f7f7f7] px-8 py-10 sm:px-12">
            <div
              className="flex h-[min(60vh,36rem)] w-full max-w-4xl items-center justify-center overflow-hidden rounded-md border border-neutral-300 p-6 shadow-sm"
              style={transparentPreviewStyle}
            >
              <img
                src={lightboxDownload?.url ?? asset.previewUrl}
                alt={asset.title}
                className="block h-full w-full object-contain"
              />
            </div>
          </div>
          <div className="flex flex-col gap-4 border-t border-neutral-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                {asset.title}
              </h2>
              <p className="mt-1 font-mono text-xs text-neutral-500">
                {lightboxDownload?.fileName ?? assetFileLabel(asset)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
                onClick={onClose}
                type="button"
              >
                Close
              </button>
              {asset.downloads.map((download) => (
                <AssetDownloadButton
                  key={`${asset.id}-${download.fileName}`}
                  download={download}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function BrandKitPage({
  bannerControls,
  canUseDevActions = true,
  endpoints,
  manifest,
}: BrandKitPageProps) {
  const [selectedAsset, setSelectedAsset] = useState<BrandKitAsset | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const toastSequence = useRef(0)
  const [bannerPreviewVersion, setBannerPreviewVersion] = useState(0)
  const [bannerPreviewOverrides, setBannerPreviewOverrides] = useState<
    Record<string, string>
  >({})
  const [customBannerIds, setCustomBannerIds] = useState(
    () =>
      new Set(
        manifest.bannerGroups.flatMap((group) =>
          group.items.filter((asset) => asset.isCustom).map((asset) => asset.id),
        ),
      ),
  )
  const [bannerControlsLocked, setBannerControlsLocked] = useState(
    () => Boolean(manifest.bannerControlsLocked) || Boolean(bannerControls?.locked),
  )
  const [isUpdatingBannerLock, setUpdatingBannerLock] = useState(false)
  const avatarAssets = useMemo(
    () => findAvatarAssets(manifest.assetGroups),
    [manifest.assetGroups],
  )
  const brandColorRows = useMemo(() => createColorRows(manifest), [manifest])
  const assetCount = useMemo(
    () =>
      manifest.assetGroups.reduce((total, group) => total + group.items.length, 0),
    [manifest.assetGroups],
  )
  const bannerAssetCount = useMemo(
    () =>
      manifest.bannerGroups.reduce(
        (total, group) => total + group.items.length,
        0,
      ),
    [manifest.bannerGroups],
  )
  const bannerAssets = useMemo(
    () => manifest.bannerGroups.flatMap((group) => group.items),
    [manifest.bannerGroups],
  )
  const totalAssetCount = assetCount + bannerAssetCount
  const heroAsset = useMemo(
    () => findHeroAsset(manifest.assetGroups),
    [manifest.assetGroups],
  )
  const footerAsset = useMemo(
    () => findFooterAsset(manifest.assetGroups),
    [manifest.assetGroups],
  )
  const currentYear = new Date().getFullYear()
  const brandLabel = manifest.brand.shortName ?? manifest.brand.name
  const homeUrl = manifest.brand.homeUrl ?? '/'
  const generatorVersion = manifest.generator?.version
  const generatorPackageName = manifest.generator?.name || 'open-brandkit'
  const generatorVersionLabel = generatorVersion ? `v${generatorVersion}` : null
  const generatorVersionHref = generatorVersion
    ? npmPackageVersionUrl(generatorPackageName, generatorVersion)
    : null
  const allDownloadHref = `${manifest.route}/download/all`
  const bannerDownloadHref = `${manifest.route}/download/banners`
  const allDownloadFileName = fileNameFromUrl(manifest.downloads.allAssets)
  const bannerDownloadFileName = fileNameFromUrl(manifest.downloads.bannerAssets)
  const canInstallFavicons =
    canUseDevActions && process.env.NODE_ENV !== 'production'
  const canToggleBannerLock =
    canUseDevActions && Boolean(endpoints?.bannerUpload)
  const canUseBannerActions = canUseDevActions && !bannerControlsLocked
  const canUseCustomBannerUploads =
    canUseDevActions && !bannerControlsLocked && process.env.NODE_ENV !== 'production'

  useEffect(() => {
    setBannerControlsLocked(
      Boolean(manifest.bannerControlsLocked) || Boolean(bannerControls?.locked),
    )
  }, [bannerControls?.locked, manifest.bannerControlsLocked])

  function showToast(message: string, tone: ToastTone = 'success') {
    const id = Date.now() + toastSequence.current

    toastSequence.current += 1
    setToasts((current) => [...current, { id, message, tone }].slice(-4))
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3200)
  }

  function updateCustomBannerState(assetId: string, isCustom: boolean) {
    setCustomBannerIds((current) => {
      const next = new Set(current)

      if (isCustom) {
        next.add(assetId)
      } else {
        next.delete(assetId)
      }

      return next
    })
  }

  const updateBannerPreviews = useCallback((overrides?: BannerPreviewOverride[]) => {
    if (overrides?.length) {
      setBannerPreviewOverrides((current) => ({
        ...current,
        ...Object.fromEntries(
          overrides.map((override) => [override.assetId, override.url]),
        ),
      }))
      return
    }

    setBannerPreviewOverrides({})
    setBannerPreviewVersion(Date.now())
  }, [])

  async function updateBannerLock(locked: boolean) {
    if (!endpoints?.bannerUpload) return

    setUpdatingBannerLock(true)

    try {
      const response = await fetch(endpoints.bannerUpload, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-lock', locked }),
      })
      const result = (await response.json()) as {
        error?: string
        locked?: boolean
      }

      if (!response.ok) {
        throw new Error(result.error ?? 'Could not update banner lock.')
      }

      setBannerControlsLocked(result.locked ?? locked)
      showToast(locked ? 'Banner controls locked.' : 'Banner controls unlocked.')
    } catch (error) {
      onBannerLockError(error)
    } finally {
      setUpdatingBannerLock(false)
    }
  }

  function onBannerLockError(error: unknown) {
    showToast(
      error instanceof Error ? error.message : 'Could not update banner lock.',
      'error',
    )
  }

  function scrollToSection(
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) {
    event.preventDefault()

    const target = document.getElementById(sectionId)

    if (!target) return

    window.history.pushState(null, '', `#${sectionId}`)
    target.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
    }
  }, [])

  return (
    <div
      className="fixed inset-0 min-h-screen overflow-y-auto overscroll-contain bg-slate-50 text-slate-950"
      style={{ zIndex: 2147483647 }}
    >
      <style>
        {`
body > header,
body > nav,
body > footer {
  display: none !important;
}
`}
      </style>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <a
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase transition-colors hover:text-neutral-950"
              href={homeUrl}
            >
              <ArrowLeft aria-hidden className="h-3.5 w-3.5 shrink-0" />
              <span>{manifest.brand.name}</span>
            </a>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-display text-5xl font-medium text-slate-950">
                Brand Kit
              </h1>
              {generatorVersionLabel && generatorVersionHref ? (
                <a
                  className="text-sm font-semibold text-slate-500 underline-offset-4 transition-colors hover:text-slate-950 hover:underline"
                  href={generatorVersionHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  {generatorVersionLabel}
                </a>
              ) : null}
            </div>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              {deterministicIntro}
            </p>
            <nav
              className="mt-8 flex flex-wrap items-center gap-3"
              aria-label="Brand Kit sections"
            >
              <a
                className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 underline-offset-4 transition-colors hover:text-neutral-950 hover:underline"
                href="#logos"
                onClick={(event) => scrollToSection(event, 'logos')}
              >
                <ArrowDown aria-hidden className="h-3.5 w-3.5" />
                <span>Logos</span>
              </a>
              <a
                className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 underline-offset-4 transition-colors hover:text-neutral-950 hover:underline"
                href="#colors"
                onClick={(event) => scrollToSection(event, 'colors')}
              >
                <ArrowDown aria-hidden className="h-3.5 w-3.5" />
                <span>Colors</span>
              </a>
              {manifest.bannerGroups.length ? (
                <a
                  className="inline-flex items-center gap-1.5 pr-2 text-sm font-medium text-neutral-700 underline-offset-4 transition-colors hover:text-neutral-950 hover:underline sm:pr-4"
                  href="#banners"
                  onClick={(event) => scrollToSection(event, 'banners')}
                >
                  <ArrowDown aria-hidden className="h-3.5 w-3.5" />
                  <span>Banners</span>
                </a>
              ) : null}
              <span className="text-sm text-slate-500">
                {formatAssetCount(totalAssetCount)}
              </span>
              {manifest.downloads.allAssets ? (
                <DownloadAllButton
                  fileName={allDownloadFileName}
                  href={allDownloadHref}
                />
              ) : null}
            </nav>
          </div>
          {heroAsset ? (
            <div className="flex items-center justify-start lg:justify-end">
              <div className="relative flex aspect-[673/489] w-full max-w-xs items-center justify-center">
                <img
                  src={heroAsset.previewUrl}
                  alt={heroAsset.title}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          ) : null}
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-slate-200 bg-slate-50" id="logos">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase">
                Logos
              </p>
              <h2 className="mt-3 font-display text-4xl font-medium text-slate-950">
                Approved marks
              </h2>
            </div>
            <div className="mt-10 space-y-12">
              {manifest.assetGroups.map((group) => (
                <AssetGroup
                  downloadFileName={fileNameFromUrl(
                    manifest.downloads.assetGroups?.[group.key],
                  )}
                  downloadHref={`${manifest.route}/download/${group.key}`}
                  group={group}
                  key={group.key}
                  onPreview={setSelectedAsset}
                />
              ))}
              <AvatarGenerator
                assets={avatarAssets}
                brandLabel={brandLabel}
                canUseDevActions={canInstallFavicons}
                colorSections={manifest.colorSections}
                colors={manifest.brandColors}
                endpoints={endpoints}
              />
            </div>
          </div>
        </section>

        <section className="bg-white" id="colors">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase">
                Colors
              </p>
              <h2 className="mt-3 font-display text-4xl font-medium text-slate-950">
                Color system
              </h2>
            </div>
            <div className="mt-12 space-y-14">
              <section className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">
                    Brand Colors
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Core digital colors for product and web work.
                  </p>
                </div>
                <div className="space-y-4">
                  {brandColorRows.map((section) => (
                    <section className="space-y-3" key={section.label}>
                      <h4 className="text-sm font-semibold tracking-[0.12em] text-neutral-500 uppercase">
                        {section.label}
                      </h4>
                      <div className="space-y-4">
                        {section.rows.map((row, index) => (
                          <div
                            className={`grid gap-4 ${
                              section.columns === 2
                                ? 'sm:grid-cols-2'
                                : 'sm:grid-cols-2 lg:grid-cols-3'
                            }`}
                            key={`${section.label}-${index}`}
                          >
                            {row.map((color) => (
                              <ColorCard
                                color={color}
                                key={color.name}
                                onToast={showToast}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
              <PrintColorGroups
                groups={manifest.printColorGroups ?? []}
                onToast={showToast}
              />
            </div>
          </div>
        </section>

        {manifest.bannerGroups.length ? (
          <section className="border-y border-slate-200 bg-slate-50" id="banners">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase">
                    Banners
                  </p>
                  <h2 className="mt-3 font-display text-4xl font-medium text-slate-950">
                    Social profile assets
                  </h2>
                  <p className="mt-4 text-base leading-7 text-slate-600">
                    Ready-to-use PNG cover images sized for each platform.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {canToggleBannerLock ? (
                    <BannerLockToggle
                      checked={bannerControlsLocked}
                      disabled={
                        isUpdatingBannerLock || process.env.NODE_ENV === 'production'
                      }
                      onChange={(locked) => void updateBannerLock(locked)}
                    />
                  ) : null}
                  <span className="text-sm text-slate-500">
                    {formatAssetCount(bannerAssetCount)}
                  </span>
                  {manifest.downloads.bannerAssets ? (
                    <DownloadAllButton
                      fileName={bannerDownloadFileName}
                      href={bannerDownloadHref}
                    />
                  ) : null}
                </div>
              </div>
              {canUseBannerActions && endpoints?.bannerPresets && bannerControls ? (
                <BannerPresetControls
                  banners={bannerAssets}
                  controls={bannerControls}
                  endpoint={endpoints.bannerPresets}
                  onToast={showToast}
                  onUpdated={updateBannerPreviews}
                />
              ) : null}
              <div className="mt-12 space-y-10">
                {manifest.bannerGroups.map((group) => (
                  <BannerGroup
                    canUseDevActions={canUseCustomBannerUploads}
                    customBannerIds={customBannerIds}
                    endpoints={endpoints}
                    group={group}
                    key={group.key}
                    onCustomStateChange={updateCustomBannerState}
                    onToast={showToast}
                    onUpdated={() => updateBannerPreviews()}
                    previewOverrides={bannerPreviewOverrides}
                    previewVersion={bannerPreviewVersion}
                  />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          {footerAsset ? (
            <div className="relative h-12 w-40">
              <img
                src={footerAsset.previewUrl}
                alt={footerAsset.title}
                className="h-full w-full object-contain"
              />
            </div>
          ) : null}
          <p className="text-sm text-slate-500 md:text-right">
            &copy; {currentYear} {manifest.brand.name}. All rights reserved.
          </p>
        </div>
      </footer>
      <Lightbox asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
      <ToastStack toasts={toasts} />
    </div>
  )
}
