'use client'

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  Copy,
  Download,
  RotateCcw,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import {
  useEffect,
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
  BrandKitManifest,
  BrandKitPrintColor,
  BrandKitPrintColorGroup,
} from '../../core/types.js'
import type { BrandKitBannerControls } from './manifest.js'

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
  alignment: string
  backgroundColor: string
  markColor: string
  markVariant: string
  pattern: string
  secondaryColor: string
}

type ColorOption = {
  color: string | null
  key: string
  label: string
}

type AvatarIconOption = {
  asset: BrandKitAsset
  color: string
  key: string
  label: string
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
const bannerPreviewScale = 0.5
const deterministicIntro =
  'Approved marks, avatar-ready presets, social profile assets, and the current color system.'

function getAssetDownloadHref(downloadUrl: string) {
  return downloadUrl
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

function normalizeHexColor(value: string) {
  const trimmed = value.trim()

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed
  if (/^[0-9a-f]{6}$/i.test(trimmed)) return `#${trimmed}`

  return '#ffffff'
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

function makeFixedBackgroundOptions(customHex: string): ColorOption[] {
  return [
    { color: null, key: 'transparent', label: 'Transparent' },
    { color: '#05070b', key: 'black', label: 'Black' },
    { color: '#ffffff', key: 'white', label: 'White' },
    { color: normalizeHexColor(customHex), key: 'custom', label: 'Custom' },
  ]
}

function makeFixedBorderOptions(
  colors: BrandKitColor[],
  customHex: string,
): ColorOption[] {
  const primary = findPrimaryColor(colors)

  return [
    { color: primary.hex, key: 'primary', label: 'Primary' },
    { color: '#05070b', key: 'black', label: 'Black' },
    { color: '#ffffff', key: 'white', label: 'White' },
    { color: normalizeHexColor(customHex), key: 'custom', label: 'Custom' },
  ]
}

function inferAvatarIconOptions(
  assets: BrandKitAsset[],
  colors: BrandKitColor[],
): AvatarIconOption[] {
  const primary = findPrimaryColor(colors)
  const colorCandidates = [
    ...colors.map((color, index) => ({
      color: color.hex,
      key: `brand-${index}-${color.hex.toLowerCase()}`,
      label: color.name,
      tokens: tokenize(color.name),
    })),
    {
      color: '#ffffff',
      key: 'white',
      label: 'White',
      tokens: ['white'],
    },
    {
      color: '#05070b',
      key: 'black',
      label: 'Black',
      tokens: ['black'],
    },
  ]
  const options: AvatarIconOption[] = []
  const seen = new Set<string>()

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
    const key = `${candidate.key}:${asset.id}`

    if (seen.has(candidate.key)) continue

    options.push({
      asset,
      color: candidate.color,
      key,
      label: candidate.label,
    })
    seen.add(candidate.key)
  }

  return options.length
    ? options
    : assets.map((asset, index) => ({
        asset,
        color: primary.hex,
        key: `icon-${index}:${asset.id}`,
        label: primary.name,
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
    addAvatarShapePath(context, size, shape, borderThickness)
    context.fillStyle = borderColor
    context.fill('evenodd')
    context.restore()
  }

  if (backgroundColor) {
    context.save()
    addAvatarShapePath(context, size, shape, borderThickness)
    context.clip()
    context.fillStyle = backgroundColor
    context.fill()
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

function DownloadIcon() {
  return <Download aria-hidden className="h-4 w-4" />
}

function UploadIcon() {
  return <Upload aria-hidden className="h-4 w-4" />
}

function ResetIcon() {
  return <RotateCcw aria-hidden className="h-4 w-4" />
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

function DownloadAllButton({ href, label = 'Download all' }: { href: string; label?: string }) {
  return (
    <a
      className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
      download
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
          className="max-h-28 w-auto max-w-full object-contain"
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
  group,
  onPreview,
}: {
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
          <DownloadAllButton href={downloadHref} />
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
        className={`block aspect-square w-16 rounded-md border transition-colors ${selectionRing(selected)}`}
        style={{ backgroundColor: normalizeHexColor(option.color) }}
      />
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
          option.color
            ? { backgroundColor: normalizeHexColor(option.color) }
            : transparentPreviewStyle
        }
      />
      <span className="w-16 text-xs leading-4 font-medium text-neutral-700">
        {option.label}
      </span>
    </button>
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
  canUseDevActions,
  colors,
  endpoints,
}: {
  assets: BrandKitAsset[]
  canUseDevActions: boolean
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
  const [backgroundCustomHex, setBackgroundCustomHex] = useState('#4784de')
  const [border, setBorder] = useState('primary')
  const [borderCustomHex, setBorderCustomHex] = useState('#4784de')
  const [borderThickness, setBorderThickness] =
    useState<AvatarBorderThickness>('none')
  const [shape, setShape] = useState<AvatarShape>('square')
  const [padding, setPadding] = useState(18)
  const [avatarSize, setAvatarSize] = useState(1024)
  const [status, setStatus] = useState('')
  const [isInstallingFavicon, setInstallingFavicon] = useState(false)
  const backgroundOptions = useMemo(
    () => makeFixedBackgroundOptions(backgroundCustomHex),
    [backgroundCustomHex],
  )
  const borderOptions = useMemo(
    () => makeFixedBorderOptions(colors, borderCustomHex),
    [borderCustomHex, colors],
  )
  const selectedIconOption =
    iconOptions.find((option) => option.key === iconKey) ?? iconOptions[0] ?? null
  const selectedAsset = selectedIconOption?.asset ?? null
  const selectedBackground = getColorOption(backgroundOptions, background)
  const selectedBorder = getColorOption(borderOptions, border)
  const backgroundColor = selectedBackground?.color ?? null
  const borderColor = selectedBorder?.color ?? '#05070b'
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
    setBackgroundCustomHex('#4784de')
    setBorder('primary')
    setBorderCustomHex('#4784de')
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
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          resolve(result)
          return
        }

        reject(new Error('Could not export PNG.'))
      }, 'image/png')
    })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = objectUrl
    link.download = fileName ?? `brand-avatar-${targetSize}px.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }

  async function downloadFavicons() {
    for (const faviconSize of [16, 32, 180, 192, 512]) {
      await downloadAvatar(
        faviconSize,
        faviconSize === 180
          ? 'apple-touch-icon.png'
          : `favicon-${faviconSize}x${faviconSize}.png`,
      )
    }

    setStatus('Downloaded favicon PNGs.')
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
              {backgroundOptions.map((option) => (
                <AvatarColorChip
                  key={option.key}
                  option={option}
                  selected={selectedBackground?.key === option.key}
                  onSelect={() => setBackground(option.key)}
                />
              ))}
            </div>
            {background === 'custom' ? (
              <label className="flex flex-col gap-2 text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                <span>Custom</span>
                <span className="flex items-center gap-2">
                  <input
                    aria-label="Custom background color"
                    className="h-10 w-10 shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                    onChange={(event) =>
                      setBackgroundCustomHex(event.currentTarget.value)
                    }
                    type="color"
                    value={normalizeHexColor(backgroundCustomHex)}
                  />
                  <input
                    aria-label="Custom background hex"
                    className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-2.5 font-mono text-sm text-slate-900"
                    onChange={(event) =>
                      setBackgroundCustomHex(event.currentTarget.value)
                    }
                    type="text"
                    value={backgroundCustomHex}
                  />
                </span>
              </label>
            ) : null}
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
              {borderOptions.map((option) => (
                <AvatarColorChip
                  key={option.key}
                  option={option}
                  selected={selectedBorder?.key === option.key}
                  onSelect={() => setBorder(option.key)}
                />
              ))}
            </div>
            {border === 'custom' ? (
              <label className="flex flex-col gap-2 text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                <span>Custom</span>
                <span className="flex items-center gap-2">
                  <input
                    aria-label="Custom border color"
                    className="h-10 w-10 shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                    onChange={(event) =>
                      setBorderCustomHex(event.currentTarget.value)
                    }
                    type="color"
                    value={normalizeHexColor(borderCustomHex)}
                  />
                  <input
                    aria-label="Custom border hex"
                    className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-2.5 font-mono text-sm text-slate-900"
                    onChange={(event) =>
                      setBorderCustomHex(event.currentTarget.value)
                    }
                    type="text"
                    value={borderCustomHex}
                  />
                </span>
              </label>
            ) : null}
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
              className="w-full cursor-pointer accent-[#3a89c0]"
              max="34"
              min="0"
              onChange={(event) => setPadding(Number(event.currentTarget.value))}
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
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50"
            onClick={() => void downloadFavicons()}
            type="button"
          >
            <DownloadIcon />
            <span>Download favicon PNGs</span>
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

function BannerPresetSelect({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean
  label: string
  onChange: (value: string) => void
  options: readonly { key: string; label: string }[]
  value: string
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold tracking-[0.16em] text-neutral-500 uppercase">
        {label}
      </legend>
      <select
        className="h-8 w-full cursor-pointer rounded-md border border-neutral-300 bg-white px-2.5 text-xs font-medium text-neutral-800 transition-colors hover:border-[#0d2249] hover:bg-slate-50 hover:text-slate-950 focus:border-[#0d2249] focus:ring-[#0d2249] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </fieldset>
  )
}

function BannerDotGroup({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean
  label: string
  onChange: (value: string) => void
  options: readonly { hex: string; key: string; label: string }[]
  value: string
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold tracking-[0.16em] text-neutral-500 uppercase">
        {label}
      </legend>
      <div className="inline-flex rounded-md border border-neutral-300 bg-white p-1">
        {options.map((option) => {
          const selected = value === option.key

          return (
            <button
              aria-label={`${label}: ${option.label}`}
              className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-all hover:bg-slate-100 hover:shadow-[inset_0_0_0_1px_#64748b] disabled:cursor-not-allowed disabled:opacity-40 ${
                selected
                  ? 'bg-slate-100 shadow-[inset_0_0_0_1px_#0d2249]'
                  : 'bg-white'
              }`}
              disabled={disabled}
              key={option.key}
              onClick={() => onChange(option.key)}
              title={option.label}
              type="button"
            >
              <span
                className="h-4 w-4 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.18)]"
                style={{ backgroundColor: option.hex }}
              />
              <span className="sr-only">{option.label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

const bannerAlignmentIcons: Record<string, LucideIcon> = {
  center: AlignCenter,
  left: AlignLeft,
  right: AlignRight,
}

function BannerAlignmentGroup({
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
        Align
      </legend>
      <div className="inline-flex rounded-md border border-neutral-300 bg-white p-1">
        {options.map((option) => {
          const Icon = bannerAlignmentIcons[option.key] ?? AlignCenter
          const selected = value === option.key

          return (
            <button
              aria-label={`Align ${option.label.toLowerCase()}`}
              className={`flex h-7 w-8 cursor-pointer items-center justify-center rounded-md transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? 'bg-[#0d2249] text-white hover:bg-slate-800'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 hover:shadow-[inset_0_0_0_1px_#64748b]'
              }`}
              disabled={disabled}
              key={option.key}
              onClick={() => onChange(option.key)}
              title={option.label}
              type="button"
            >
              <Icon aria-hidden className="h-4 w-4" />
              <span className="sr-only">{option.label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function BannerPresetControls({
  controls,
  endpoint,
  onToast,
  onUpdated,
}: {
  controls: BrandKitBannerControls
  endpoint: string
  onToast: ShowToast
  onUpdated: () => void
}) {
  function getMarkColorOptions(markVariantKey: string) {
    const markVariant = controls.markVariants.find(
      (variant) => variant.key === markVariantKey,
    )

    if (markVariant?.colorOptions?.length) return markVariant.colorOptions
    if (!markVariant?.colorKeys?.length) return controls.colors

    const filtered = controls.colors.filter((color) =>
      markVariant.colorKeys?.includes(color.key),
    )

    return filtered.length ? filtered : controls.colors
  }

  function getDefaultMarkColor(markVariantKey: string) {
    return (
      getMarkColorOptions(markVariantKey)[0]?.key ??
      ''
    )
  }

  const defaultState = useMemo<BannerPresetState>(
    () => {
      const markVariant = controls.markVariants[0]?.key ?? ''

      return {
        alignment: 'center',
        backgroundColor: controls.colors[0]?.key ?? '',
        markColor: getDefaultMarkColor(markVariant),
        markVariant,
        pattern: controls.patterns[0]?.key ?? 'diagonal-sweep',
        secondaryColor: controls.colors[2]?.key ?? controls.colors[0]?.key ?? '',
      }
    },
    [controls],
  )
  const [state, setState] = useState(defaultState)
  const [isApplying, setApplying] = useState(false)
  const markColorOptions = getMarkColorOptions(state.markVariant)

  async function apply(nextState: BannerPresetState) {
    setApplying(true)

    try {
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
    const nextState = { ...state, [key]: value }

    if (key === 'markVariant') {
      const nextMarkColorOptions = getMarkColorOptions(String(value))

      if (!nextMarkColorOptions.some((option) => option.key === nextState.markColor)) {
        nextState.markColor = nextMarkColorOptions[0]?.key ?? ''
      }
    }

    setState(nextState)
    void apply(nextState)
  }

  return (
    <div className="mt-6 w-full rounded-md border border-slate-200 bg-white p-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(9rem,1fr)_auto_auto_auto_minmax(9rem,1fr)] lg:items-start">
        <BannerPresetSelect
          disabled={isApplying}
          label="Mark"
          onChange={(value) => update('markVariant', value)}
          options={controls.markVariants}
          value={state.markVariant}
        />
        <BannerDotGroup
          disabled={isApplying}
          label="Color"
          onChange={(value) => update('markColor', value)}
          options={markColorOptions}
          value={state.markColor}
        />
        <BannerAlignmentGroup
          disabled={isApplying}
          onChange={(value) => update('alignment', value)}
          options={controls.alignments}
          value={state.alignment}
        />
        <BannerDotGroup
          disabled={isApplying}
          label="Base"
          onChange={(value) => update('backgroundColor', value)}
          options={controls.colors}
          value={state.backgroundColor}
        />
        <BannerPresetSelect
          disabled={isApplying}
          label="Pattern"
          onChange={(value) => update('pattern', value)}
          options={controls.patterns}
          value={state.pattern}
        />
      </div>
    </div>
  )
}

function BannerCard({
  asset,
  canUpload,
  endpoint,
  isCustom,
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
  previewVersion: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isReplacing, setReplacing] = useState(false)
  const [isResetting, setResetting] = useState(false)
  const previewUrl = previewVersion
    ? `${asset.previewUrl}?v=${previewVersion}`
    : asset.previewUrl
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
          {asset.downloads.map((download) => (
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
        if (event.target === event.currentTarget) onClose()
      }}
      role="dialog"
    >
      <div className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl">
          <div className="flex min-h-[60vh] items-center justify-center bg-[#f7f7f7] px-8 py-10 sm:px-12">
            <div
              className="max-w-full overflow-auto rounded-md border border-neutral-300 p-4 shadow-sm"
              style={transparentPreviewStyle}
            >
              <img
                src={lightboxDownload?.url ?? asset.previewUrl}
                alt={asset.title}
                className="block h-auto max-h-[70vh] w-auto max-w-full"
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
  const [customBannerIds, setCustomBannerIds] = useState(
    () =>
      new Set(
        manifest.bannerGroups.flatMap((group) =>
          group.items.filter((asset) => asset.isCustom).map((asset) => asset.id),
        ),
      ),
  )
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
  const allDownloadHref = `${manifest.route}/download/all`
  const bannerDownloadHref = `${manifest.route}/download/banners`
  const canInstallFavicons =
    canUseDevActions && process.env.NODE_ENV !== 'production'
  const canUseBannerActions = canUseDevActions
  const canUseCustomBannerUploads =
    canUseDevActions && process.env.NODE_ENV !== 'production'

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <a
              className="text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase transition-colors hover:text-neutral-950"
              href={homeUrl}
            >
              {brandLabel}
            </a>
            <h1 className="mt-3 font-display text-5xl font-medium text-slate-950">
              Brand Kit
            </h1>
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
                <DownloadAllButton href={allDownloadHref} />
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
                  downloadHref={`${manifest.route}/download/${group.key}`}
                  group={group}
                  key={group.key}
                  onPreview={setSelectedAsset}
                />
              ))}
              <AvatarGenerator
                assets={avatarAssets}
                canUseDevActions={canInstallFavicons}
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
                  <span className="text-sm text-slate-500">
                    {formatAssetCount(bannerAssetCount)}
                  </span>
                  {manifest.downloads.bannerAssets ? (
                    <DownloadAllButton href={bannerDownloadHref} />
                  ) : null}
                </div>
              </div>
              {canUseBannerActions && endpoints?.bannerPresets && bannerControls ? (
                <BannerPresetControls
                  controls={bannerControls}
                  endpoint={endpoints.bannerPresets}
                  onToast={showToast}
                  onUpdated={() => setBannerPreviewVersion(Date.now())}
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
                    onUpdated={() => setBannerPreviewVersion(Date.now())}
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
