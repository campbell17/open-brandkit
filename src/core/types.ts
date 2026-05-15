export type BrandKitPreviewTone = 'light' | 'dark'

export type BrandKitBrandConfig = {
  name: string
  shortName?: string
  description?: string
  homeUrl?: string
}

export type BrandKitOutputConfig = {
  publicDir?: string
  assetBasePath?: string
  manifestFileName?: string
  siteFileName?: string
}

export type BrandKitLogoGroupConfig = {
  key: string
  label: string
  match: string[]
  description?: string
}

export type BrandKitLogoConfig = {
  sourceDir: string
  groups: BrandKitLogoGroupConfig[]
  includeUngrouped?: boolean
}

export type BrandKitColor = {
  name: string
  hex: string
  rgb?: string
  cmyk?: string
}

export type BrandKitPrintColor = {
  pantone: string
  hex: string
  rgb: string[]
  cmyk: string[]
}

export type BrandKitPrintColorGroup = {
  label: string
  items: BrandKitPrintColor[]
}

export type BrandKitColorSource =
  | {
      type: 'markdown-table'
      path: string
      sectionHeading?: string
    }
  | {
      type: 'json'
      path: string
    }
  | {
      type: 'csv'
      path: string
    }
  | {
      type: 'literal'
      colors: BrandKitColor[]
    }

export type BrandKitColorSection = {
  label: string
  columns?: 1 | 2 | 3
  rows: string[][]
}

export type BrandKitColorConfig = {
  sources: BrandKitColorSource[]
  sections?: BrandKitColorSection[]
}

export type BrandKitBannerPattern =
  | 'diagonal-sweep'
  | 'radial-glow'
  | 'split-field'
  | 'wave'

export type BrandKitBannerAlignment = 'left' | 'center' | 'right'

export type BrandKitBannerColorConfig = {
  key: string
  label: string
  hex: string
}

export type BrandKitBannerMarkVariantConfig = {
  key: string
  label: string
  assetPath: string
  colorAssets?: Record<string, string>
  colorOptions?: BrandKitBannerColorConfig[]
  scale?: number
  colorKeys?: string[]
}

export type BrandKitSocialBannerPreset = {
  key: string
  label: string
  width: number
  height: number
  description?: string
  groupKey?: string
  groupLabel?: string
  outputFileName?: string
  pattern?: BrandKitBannerPattern
  alignment?: BrandKitBannerAlignment
  backgroundColor?: string
  accentColor?: string
  secondaryColor?: string
  markVariant?: string
  markColor?: string
}

export type BrandKitSocialBannersConfig = {
  outputDir?: string
  publicPath?: string
  markVariants: BrandKitBannerMarkVariantConfig[]
  colors: BrandKitBannerColorConfig[]
  presets: BrandKitSocialBannerPreset[]
}

export type BrandKitConfig = {
  brand: BrandKitBrandConfig
  route?: string
  output?: BrandKitOutputConfig
  logos: BrandKitLogoConfig
  colors: BrandKitColorConfig
  socialBanners?: BrandKitSocialBannersConfig
}

export type BrandKitAssetDownload = {
  format: string
  fileName: string
  url: string
}

export type BrandKitAsset = {
  id: string
  title: string
  previewUrl: string
  previewTone: BrandKitPreviewTone
  downloads: BrandKitAssetDownload[]
}

export type BrandKitAssetGroup = {
  key: string
  label: string
  description?: string
  items: BrandKitAsset[]
}

export type BrandKitBannerAsset = {
  id: string
  title: string
  description: string
  width: number
  height: number
  previewUrl: string
  isCustom?: boolean
  downloads: BrandKitAssetDownload[]
}

export type BrandKitBannerGroup = {
  key: string
  label: string
  description?: string
  items: BrandKitBannerAsset[]
}

export type BrandKitManifest = {
  schemaVersion: 1
  generatedAt: string
  route: string
  assetBasePath: string
  brand: BrandKitBrandConfig
  assetGroups: BrandKitAssetGroup[]
  brandColors: BrandKitColor[]
  colorSections: BrandKitColorSection[]
  printColorGroups: BrandKitPrintColorGroup[]
  bannerGroups: BrandKitBannerGroup[]
  downloads: {
    allAssets?: string
    assetGroups?: Record<string, string>
    bannerAssets?: string
  }
}
