import type {
  BrandKitBannerColorConfig,
  BrandKitBannerMarkVariantConfig,
} from './types.js'

type BannerMarkColorOption = Pick<
  BrandKitBannerColorConfig,
  'hex' | 'key' | 'label'
>

function optionText(option: BannerMarkColorOption) {
  return `${option.key} ${option.label}`.toLowerCase()
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
