import { z } from 'zod'

import type { BrandKitConfig } from './types.js'

const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i)

const logoGroupSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  match: z.array(z.string().min(1)).min(1),
  description: z.string().optional(),
})

const colorSchema = z.object({
  name: z.string().min(1),
  hex: hexColorSchema,
  rgb: z.string().optional(),
  cmyk: z.string().optional(),
})

const colorSourceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('markdown-table'),
    path: z.string().min(1),
    sectionHeading: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('json'),
    path: z.string().min(1),
  }),
  z.object({
    type: z.literal('csv'),
    path: z.string().min(1),
  }),
  z.object({
    type: z.literal('literal'),
    colors: z.array(colorSchema).min(1),
  }),
])

const colorSectionSchema = z.object({
  label: z.string().min(1),
  columns: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  rows: z.array(z.array(z.string().min(1)).min(1)).min(1),
})

const bannerPatternSchema = z.enum([
  'diagonal-sweep',
  'corner-frame',
  'horizon-lines',
  'offset-stack',
  'radial-glow',
  'ribbon-fold',
  'split-field',
  'wave',
])

const bannerAlignmentSchema = z.enum(['left', 'center', 'right'])

const bannerColorSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  hex: hexColorSchema,
})

const bannerMarkVariantSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  assetPath: z.string().min(1),
  colorAssets: z.record(z.string().min(1), z.string().min(1)).optional(),
  colorOptions: z.array(bannerColorSchema).optional(),
  scale: z.number().positive().max(1).optional(),
  colorKeys: z.array(z.string().min(1)).optional(),
})

const socialBannerPresetSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  description: z.string().optional(),
  groupKey: z.string().min(1).optional(),
  groupLabel: z.string().min(1).optional(),
  outputFileName: z.string().min(1).optional(),
  pattern: bannerPatternSchema.optional(),
  alignment: bannerAlignmentSchema.optional(),
  backgroundColor: z.string().min(1).optional(),
  accentColor: z.string().min(1).optional(),
  secondaryColor: z.string().min(1).optional(),
  markVariant: z.string().min(1).optional(),
  markColor: z.string().min(1).optional(),
})

export const brandKitConfigSchema = z.object({
  brand: z.object({
    name: z.string().min(1),
    shortName: z.string().optional(),
    description: z.string().optional(),
    homeUrl: z.string().optional(),
  }),
  route: z.string().min(1).default('/brandkit'),
  output: z
    .object({
      publicDir: z.string().min(1).default('public'),
      assetBasePath: z.string().min(1).optional(),
      manifestFileName: z.string().min(1).default('brandkit.manifest.json'),
      printFileName: z.string().min(1).default('print.html'),
      siteFileName: z.string().min(1).default('index.html'),
    })
    .default({
      publicDir: 'public',
      manifestFileName: 'brandkit.manifest.json',
      printFileName: 'print.html',
      siteFileName: 'index.html',
    }),
  logos: z.object({
    sourceDir: z.string().min(1),
    groups: z.array(logoGroupSchema).min(1),
    includeUngrouped: z.boolean().default(true),
  }),
  colors: z.object({
    sources: z.array(colorSourceSchema).min(1),
    sections: z.array(colorSectionSchema).optional(),
  }),
  socialBanners: z
    .object({
      outputDir: z.string().min(1).default('banners'),
      publicPath: z.string().min(1).optional(),
      locked: z.boolean().default(false),
      markVariants: z.array(bannerMarkVariantSchema).min(1),
      colors: z.array(bannerColorSchema).min(1).optional(),
      presets: z.array(socialBannerPresetSchema).min(1),
    })
    .optional(),
})

export function defineBrandKitConfig(config: BrandKitConfig): BrandKitConfig {
  return brandKitConfigSchema.parse(config) as BrandKitConfig
}
