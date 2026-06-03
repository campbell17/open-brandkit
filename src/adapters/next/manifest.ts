import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { applyBrandCasing } from '../../core/assets.js'
import { resolveSocialBannerColors } from '../../core/social-banners.js'
import type {
  BrandKitBannerColorConfig,
  BrandKitConfig,
  BrandKitColor,
  BrandKitManifest,
  BrandKitSocialBannersConfig,
} from '../../core/types.js'

export type BrandKitNextAdapterOptions = {
  cwd?: string
  publicDir?: string
  assetBasePath?: string
  manifestFileName?: string
}

export type BrandKitBannerControls = {
  alignments: { key: string; label: string }[]
  colors: BrandKitBannerColorConfig[]
  locked?: boolean
  markVariants: {
    assetUrl?: string
    colorKeys?: string[]
    colorAssetUrls?: Record<string, string>
    colorOptions?: BrandKitSocialBannersConfig['colors']
    key: string
    label: string
    scale?: number
  }[]
  patterns: { key: string; label: string }[]
}

export type BrandKitNextPageProps = {
  bannerControls?: BrandKitBannerControls
  manifest: BrandKitManifest
}

function stripSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, '')
}

function publicUrlFromAssetPath(assetPath: string) {
  const normalized = assetPath.replace(/\\/g, '/')

  if (normalized.startsWith('/')) return normalized
  if (normalized.startsWith('public/')) return `/${normalized.slice('public/'.length)}`

  return normalized
}

export function getBrandKitManifestPath(options: BrandKitNextAdapterOptions = {}) {
  const cwd = options.cwd ?? process.cwd()
  const publicDir = options.publicDir ?? 'public'
  const assetBasePath = options.assetBasePath ?? '/brandkit'
  const manifestFileName = options.manifestFileName ?? 'brandkit.manifest.json'

  return path.join(cwd, publicDir, stripSlashes(assetBasePath), manifestFileName)
}

export async function loadBrandKitManifest(
  options: BrandKitNextAdapterOptions = {},
) {
  const manifestPath = getBrandKitManifestPath(options)
  const source = await readFile(manifestPath, 'utf8')

  return JSON.parse(source) as BrandKitManifest
}

export function createBrandKitBannerControls(
  config: BrandKitConfig,
  brandColors: BrandKitColor[] = [],
): BrandKitBannerControls | undefined {
  if (!config.socialBanners) return undefined

  const applyConfiguredCasing = (value: string) =>
    applyBrandCasing(value, {
      brandName: config.brand.name,
      shortName: config.brand.shortName,
    })
  const normalizeColorLabels = (
    colors: BrandKitSocialBannersConfig['colors'] | undefined,
  ) =>
    colors?.map((color) => ({
      ...color,
      label: applyConfiguredCasing(color.label),
    }))
  const bannerColors = resolveSocialBannerColors({
    brandColors,
    configuredColors: config.socialBanners.colors,
  })

  return {
    alignments: [
      { key: 'left', label: 'Left' },
      { key: 'center', label: 'Center' },
      { key: 'right', label: 'Right' },
    ],
    colors: normalizeColorLabels(bannerColors) ?? [],
    locked: config.socialBanners.locked,
    markVariants: config.socialBanners.markVariants.map((variant) => ({
      assetUrl: publicUrlFromAssetPath(variant.assetPath),
      colorKeys: variant.colorKeys ?? Object.keys(variant.colorAssets ?? {}),
      colorAssetUrls: Object.fromEntries(
        Object.entries(variant.colorAssets ?? {}).map(([key, assetPath]) => [
          key,
          publicUrlFromAssetPath(assetPath),
        ]),
      ),
      colorOptions: normalizeColorLabels(variant.colorOptions),
      key: variant.key,
      label: applyConfiguredCasing(variant.label),
      scale: variant.scale,
    })),
    patterns: [
      { key: 'diagonal-sweep', label: 'Sweep' },
      { key: 'corner-frame', label: 'Corner' },
      { key: 'offset-stack', label: 'Stack' },
      { key: 'radial-glow', label: 'Glow' },
      { key: 'ribbon-fold', label: 'Ribbon' },
      { key: 'split-field', label: 'Split' },
    ],
  }
}

export async function getBrandKitNextPageProps(
  config?: BrandKitConfig,
  options: BrandKitNextAdapterOptions = {},
): Promise<BrandKitNextPageProps> {
  const manifest = await loadBrandKitManifest(options)

  return {
    bannerControls: config
      ? createBrandKitBannerControls(config, manifest.brandColors)
      : undefined,
    manifest,
  }
}
