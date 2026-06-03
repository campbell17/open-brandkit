import type {
  BrandKitBannerColorConfig,
  BrandKitBannerMarkVariantConfig,
  BrandKitColor,
} from './types.js'

type BannerMarkColorOption = Pick<
  BrandKitBannerColorConfig,
  'hex' | 'key' | 'label'
>

function optionText(option: BannerMarkColorOption) {
  return `${option.key} ${option.label}`.toLowerCase()
}

function colorText(color: BrandKitColor) {
  return color.name.toLowerCase()
}

function findColor(
  colors: readonly BrandKitColor[],
  predicate: (color: BrandKitColor) => boolean,
  excluded = new Set<BrandKitColor>(),
) {
  return colors.find((color) => !excluded.has(color) && predicate(color))
}

export function deriveSocialBannerColors(
  colors: readonly BrandKitColor[] | undefined,
) {
  const available = colors ?? []
  const selected = new Set<BrandKitColor>()
  const primary =
    findColor(available, (color) => /\bprimary\b/.test(colorText(color))) ??
    available[0]

  if (primary) selected.add(primary)

  const accent =
    findColor(
      available,
      (color) => /\b(accent|secondary|deep|dark)\b/.test(colorText(color)),
      selected,
    ) ?? available.find((color) => !selected.has(color))

  if (accent) selected.add(accent)

  const light =
    findColor(
      available,
      (color) => /\b(light|white|cream|pale|soft)\b/.test(colorText(color)),
      selected,
    ) ?? available.find((color) => !selected.has(color))

  return [
    {
      key: 'primary',
      label: primary?.name ?? 'Primary',
      hex: primary?.hex ?? '#0d2249',
    },
    {
      key: 'accent',
      label: accent?.name ?? 'Accent',
      hex: accent?.hex ?? '#4784de',
    },
    {
      key: 'light',
      label: light?.name ?? 'Light',
      hex: light?.hex ?? '#ffffff',
    },
  ] satisfies BrandKitBannerColorConfig[]
}

export function resolveSocialBannerColors({
  brandColors,
  configuredColors,
}: {
  brandColors?: readonly BrandKitColor[]
  configuredColors?: readonly BrandKitBannerColorConfig[]
}) {
  return configuredColors?.length
    ? [...configuredColors]
    : deriveSocialBannerColors(brandColors)
}

export function isWhiteBannerMarkColorOption(option: BannerMarkColorOption) {
  const text = optionText(option)

  return (
    /(^|[^a-z0-9])(white|onblack|inverse|inverted)([^a-z0-9]|$)/.test(text) ||
    /^#(?:fff|ffffff)$/i.test(option.hex)
  )
}

export function isBlackBannerMarkColorOption(option: BannerMarkColorOption) {
  const text = optionText(option)

  return (
    /(^|[^a-z0-9])black([^a-z0-9]|$)/.test(text) ||
    /^#(?:000|000000|05070b)$/i.test(option.hex)
  )
}

export function isPrimaryBannerMarkColorOption(option: BannerMarkColorOption) {
  return /(^|[^a-z0-9])primary([^a-z0-9]|$)/.test(optionText(option))
}

function markColorRank(option: BannerMarkColorOption) {
  if (isWhiteBannerMarkColorOption(option)) return 0
  if (isBlackBannerMarkColorOption(option)) return 1
  if (isPrimaryBannerMarkColorOption(option)) return 2

  return 3
}

export function compareBannerMarkColorOptions(
  left: BannerMarkColorOption,
  right: BannerMarkColorOption,
) {
  return markColorRank(left) - markColorRank(right)
}

export function orderBannerMarkColorOptions<T extends BannerMarkColorOption>(
  options: readonly T[] | undefined,
) {
  return [...(options ?? [])].sort(
    (left, right) =>
      compareBannerMarkColorOptions(left, right) ||
      left.label.localeCompare(right.label) ||
      left.key.localeCompare(right.key),
  )
}

export function getBannerMarkColorOptions<T extends BrandKitBannerColorConfig>(
  markVariant: Pick<
    BrandKitBannerMarkVariantConfig,
    'colorKeys' | 'colorOptions'
  > | undefined,
  colors: readonly T[] | undefined,
) {
  if (markVariant?.colorOptions?.length) {
    return orderBannerMarkColorOptions(markVariant.colorOptions)
  }

  if (!colors?.length) return []

  if (markVariant?.colorKeys?.length) {
    const filtered = colors.filter((color) =>
      markVariant.colorKeys?.includes(color.key),
    )

    if (filtered.length) return orderBannerMarkColorOptions(filtered)
  }

  return orderBannerMarkColorOptions(colors)
}

export function defaultBannerMarkColor(
  markVariant: Pick<
    BrandKitBannerMarkVariantConfig,
    'colorKeys' | 'colorOptions'
  > | undefined,
  colors: readonly BrandKitBannerColorConfig[] | undefined,
) {
  return (
    getBannerMarkColorOptions(markVariant, colors)[0]?.key ??
    markVariant?.colorKeys?.[0] ??
    'light'
  )
}
