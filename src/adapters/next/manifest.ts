import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type {
  BrandKitConfig,
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
  colors: BrandKitSocialBannersConfig['colors']
  markVariants: {
    colorKeys?: string[]
    colorOptions?: BrandKitSocialBannersConfig['colors']
    key: string
    label: string
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
): BrandKitBannerControls | undefined {
  if (!config.socialBanners) return undefined

  return {
    alignments: [
      { key: 'left', label: 'Left' },
      { key: 'center', label: 'Center' },
      { key: 'right', label: 'Right' },
    ],
    colors: config.socialBanners.colors,
    markVariants: config.socialBanners.markVariants.map((variant) => ({
      colorKeys: variant.colorKeys ?? Object.keys(variant.colorAssets ?? {}),
      colorOptions: variant.colorOptions,
      key: variant.key,
      label: variant.label,
    })),
    patterns: [
      { key: 'diagonal-sweep', label: 'Sweep' },
      { key: 'radial-glow', label: 'Glow' },
      { key: 'split-field', label: 'Split' },
      { key: 'wave', label: 'Wave' },
    ],
  }
}

export async function getBrandKitNextPageProps(
  config?: BrandKitConfig,
  options: BrandKitNextAdapterOptions = {},
): Promise<BrandKitNextPageProps> {
  return {
    bannerControls: config ? createBrandKitBannerControls(config) : undefined,
    manifest: await loadBrandKitManifest(options),
  }
}
