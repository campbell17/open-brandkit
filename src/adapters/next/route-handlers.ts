import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

import { NextResponse } from 'next/server.js'
import type sharp from 'sharp'

import type { BrandKitConfig, BrandKitManifest } from '../../core/types.js'
import { brandKitConfigSchema } from '../../core/config.js'
import {
  type BrandKitNextAdapterOptions,
  getBrandKitManifestPath,
  loadBrandKitManifest,
} from './manifest.js'

export type BrandKitRouteHandlerOptions = BrandKitNextAdapterOptions & {
  appDir?: string
}

export type BrandKitBannerPresetRequest = {
  accentColor?: string
  alignment?: string
  backgroundColor?: string
  markColor?: string
  markVariant?: string
  pattern?: string
  secondaryColor?: string
}

type BannerUploadResetRequest = {
  action?: unknown
  assetId?: unknown
  locked?: unknown
}

const faviconPngSizes = [16, 32, 48, 180, 192, 512] as const
const icoSizes = [16, 32, 48] as const
const acceptedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
])
const maxUploadBytes = 20 * 1024 * 1024

const requireFromHere = createRequire(import.meta.url)
const sharpPackageName = 'sha' + 'rp'

function getSharp(): typeof sharp {
  return requireFromHere(sharpPackageName) as typeof sharp
}

function stripSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, '')
}

function getCwd(options: BrandKitRouteHandlerOptions) {
  return options.cwd ?? process.cwd()
}

function getPublicDir(options: BrandKitRouteHandlerOptions) {
  return options.publicDir ?? 'public'
}

function isProduction() {
  return process.env.NODE_ENV === 'production'
}

function productionBlocked(message: string) {
  return NextResponse.json({ error: message }, { status: 403 })
}

function getPublicFilePath(
  publicUrl: string,
  options: BrandKitRouteHandlerOptions,
) {
  const cwd = getCwd(options)
  const publicDir = path.resolve(cwd, getPublicDir(options))
  const filePath = path.resolve(publicDir, ...publicUrl.split('/').filter(Boolean))

  if (!filePath.startsWith(`${publicDir}${path.sep}`)) {
    throw new Error('Brand Kit public asset path is not writable.')
  }

  return filePath
}

function getDownloadFileName(publicUrl: string, fallback: string) {
  try {
    const url = new URL(publicUrl, 'https://open-brandkit.local')
    const fileName = path.basename(url.pathname)

    return fileName || fallback
  } catch {
    return fallback
  }
}

function findBannerAsset(manifest: BrandKitManifest, assetId: string) {
  for (const group of manifest.bannerGroups) {
    const asset = group.items.find((item) => item.id === assetId)

    if (asset) return asset
  }

  return null
}

function getCustomBannerIds(manifest: BrandKitManifest) {
  return manifest.bannerGroups.flatMap((group) =>
    group.items.filter((asset) => asset.isCustom).map((asset) => asset.id),
  )
}

function setCustomBannerState(
  manifest: BrandKitManifest,
  assetId: string,
  isCustom: boolean,
): BrandKitManifest {
  return {
    ...manifest,
    bannerGroups: manifest.bannerGroups.map((group) => ({
      ...group,
      items: group.items.map((asset) => {
        if (asset.id !== assetId) return asset

        const { isCustom: _previous, ...rest } = asset

        return isCustom ? { ...rest, isCustom: true } : rest
      }),
    })),
  }
}

async function writeBrandKitManifest(
  manifest: BrandKitManifest,
  options: BrandKitRouteHandlerOptions,
) {
  const manifestPath = getBrandKitManifestPath(options)

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

function bannerWrittenFileNames(
  config: BrandKitConfig,
  files: string[],
  options: BrandKitRouteHandlerOptions,
) {
  const cwd = getCwd(options)
  const publicDir = getPublicDir(options)
  const route = config.route ?? '/brandkit'
  const assetBasePath = config.output?.assetBasePath ?? route
  const outputDir = config.socialBanners?.outputDir ?? 'banners'
  const bannerDir = path.resolve(
    cwd,
    publicDir,
    stripSlashes(assetBasePath),
    stripSlashes(outputDir),
  )

  return files
    .filter(
      (file) =>
        path.extname(file).toLowerCase() === '.png' &&
        path.resolve(file).startsWith(`${bannerDir}${path.sep}`),
    )
    .map((file) => path.basename(file))
}

function isBrandKitConfig(value: unknown): value is BrandKitConfig {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'brand' in value &&
      'logos' in value &&
      'colors' in value,
  )
}

function parseBrandKitConfig(config: unknown): BrandKitConfig {
  return brandKitConfigSchema.parse(config) as BrandKitConfig
}

function decodePngDataUrl(dataUrl: unknown) {
  if (typeof dataUrl !== 'string') {
    throw new Error('Missing image data.')
  }

  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/)

  if (!match) {
    throw new Error('Expected a PNG data URL.')
  }

  return Buffer.from(match[1], 'base64')
}

async function makePng(source: Buffer, size: number) {
  const sharp = await getSharp()

  return sharp(source)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()
}

function makeIco(images: { size: number; buffer: Buffer }[]) {
  const header = Buffer.alloc(6)
  const directory = Buffer.alloc(images.length * 16)
  let offset = header.length + directory.length

  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  images.forEach((image, index) => {
    const entryOffset = index * 16

    directory.writeUInt8(image.size === 256 ? 0 : image.size, entryOffset)
    directory.writeUInt8(image.size === 256 ? 0 : image.size, entryOffset + 1)
    directory.writeUInt8(0, entryOffset + 2)
    directory.writeUInt8(0, entryOffset + 3)
    directory.writeUInt16LE(1, entryOffset + 4)
    directory.writeUInt16LE(32, entryOffset + 6)
    directory.writeUInt32LE(image.buffer.length, entryOffset + 8)
    directory.writeUInt32LE(offset, entryOffset + 12)
    offset += image.buffer.length
  })

  return Buffer.concat([
    header,
    directory,
    ...images.map((image) => image.buffer),
  ])
}

function manifestSource(config: BrandKitConfig) {
  const name = config.brand.name
  const shortName = config.brand.shortName ?? name
  const description = config.brand.description ?? `${name} brand kit.`
  const colors = config.socialBanners?.colors ?? []
  const backgroundColor =
    colors.find((color) => color.key.includes('white'))?.hex ?? '#ffffff'
  const themeColor = colors[0]?.hex ?? '#0d2249'

  return `import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: ${JSON.stringify(name)},
    short_name: ${JSON.stringify(shortName)},
    description: ${JSON.stringify(description)},
    start_url: '/',
    display: 'standalone',
    background_color: ${JSON.stringify(backgroundColor)},
    theme_color: ${JSON.stringify(themeColor)},
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
`
}

function applyBannerPresetRequest(
  config: BrandKitConfig,
  options: BrandKitBannerPresetRequest,
): BrandKitConfig {
  if (!config.socialBanners) return config

  return {
    ...config,
    socialBanners: {
      ...config.socialBanners,
      presets: config.socialBanners.presets.map((preset) => ({
        ...preset,
        accentColor: options.accentColor ?? preset.accentColor,
        alignment: options.alignment
          ? (options.alignment as typeof preset.alignment)
          : preset.alignment,
        backgroundColor: options.backgroundColor ?? preset.backgroundColor,
        markColor: options.markColor ?? options.accentColor ?? preset.markColor,
        markVariant: options.markVariant ?? preset.markVariant,
        pattern: options.pattern
          ? (options.pattern as typeof preset.pattern)
          : preset.pattern,
        secondaryColor: options.secondaryColor ?? preset.secondaryColor,
      })),
    },
  }
}

export function createBrandKitDownloadHandler(
  options: BrandKitRouteHandlerOptions = {},
) {
  return {
    async GET(
      _request: Request,
      context: { params: Promise<{ group: string }> | { group: string } },
    ) {
      const params = await context.params
      const requestedGroup = params.group
      const fallbackGroup = requestedGroup === 'all' ? 'all-assets' : requestedGroup
      const cwd = getCwd(options)
      const publicDir = getPublicDir(options)
      const assetBasePath = options.assetBasePath ?? '/brandkit'
      let filePath = path.join(
        cwd,
        publicDir,
        stripSlashes(assetBasePath),
        'downloads',
        `${fallbackGroup}.zip`,
      )
      let fileName = `${fallbackGroup}.zip`

      try {
        const manifest = await loadBrandKitManifest(options)
        const archiveUrl =
          requestedGroup === 'all'
            ? manifest.downloads.allAssets
            : requestedGroup === 'banners'
              ? manifest.downloads.bannerAssets
              : manifest.downloads.assetGroups?.[requestedGroup]

        if (archiveUrl) {
          filePath = getPublicFilePath(archiveUrl, options)
          fileName = getDownloadFileName(archiveUrl, fileName)
        }
      } catch {
        // Fall back to the original unprefixed archive paths for older manifests.
      }

      try {
        const content = await readFile(filePath)

        return new Response(content, {
          headers: {
            'Cache-Control': 'no-store',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Type': 'application/zip',
          },
        })
      } catch {
        return new Response('Brand Kit download not found', { status: 404 })
      }
    },
  }
}

export function createBrandKitFaviconHandler(
  config: unknown,
  options: BrandKitRouteHandlerOptions = {},
) {
  const brandKitConfig = parseBrandKitConfig(config)

  return {
    async POST(request: Request) {
      try {
        if (isProduction()) {
          return productionBlocked(
            'Favicon installation is only available in local development.',
          )
        }

        const body = (await request.json()) as { imageDataUrl?: unknown }
        const source = decodePngDataUrl(body.imageDataUrl)
        const cwd = getCwd(options)
        const appDir = path.resolve(cwd, options.appDir ?? 'src/app')
        const publicDir = path.resolve(cwd, getPublicDir(options))
        const pngs = new Map<number, Buffer>()

        await Promise.all(
          faviconPngSizes.map(async (size) => {
            pngs.set(size, await makePng(source, size))
          }),
        )

        const ico = makeIco(
          icoSizes.map((size) => ({
            size,
            buffer: pngs.get(size) ?? Buffer.alloc(0),
          })),
        )
        const writes = [
          { path: path.join(appDir, 'favicon.ico'), buffer: ico },
          { path: path.join(appDir, 'icon1.png'), buffer: pngs.get(32) },
          { path: path.join(appDir, 'icon2.png'), buffer: pngs.get(192) },
          { path: path.join(appDir, 'icon3.png'), buffer: pngs.get(512) },
          { path: path.join(appDir, 'apple-icon.png'), buffer: pngs.get(180) },
          { path: path.join(publicDir, 'favicon-16x16.png'), buffer: pngs.get(16) },
          { path: path.join(publicDir, 'favicon-32x32.png'), buffer: pngs.get(32) },
          {
            path: path.join(publicDir, 'apple-touch-icon.png'),
            buffer: pngs.get(180),
          },
          {
            path: path.join(publicDir, 'android-chrome-192x192.png'),
            buffer: pngs.get(192),
          },
          {
            path: path.join(publicDir, 'android-chrome-512x512.png'),
            buffer: pngs.get(512),
          },
        ]

        await Promise.all([mkdir(appDir, { recursive: true }), mkdir(publicDir, { recursive: true })])
        await Promise.all(
          writes.map(async (write) => {
            if (!write.buffer) {
              throw new Error(`Missing generated buffer for ${write.path}.`)
            }

            await writeFile(write.path, write.buffer)
          }),
        )
        await writeFile(
          path.join(appDir, 'manifest.ts'),
          manifestSource(brandKitConfig),
        )

        return NextResponse.json({
          files: [
            'src/app/favicon.ico',
            'src/app/icon1.png',
            'src/app/icon2.png',
            'src/app/icon3.png',
            'src/app/apple-icon.png',
            'src/app/manifest.ts',
            'public/favicon-16x16.png',
            'public/favicon-32x32.png',
            'public/apple-touch-icon.png',
            'public/android-chrome-192x192.png',
            'public/android-chrome-512x512.png',
          ],
        })
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'Could not install favicon files.',
          },
          { status: 400 },
        )
      }
    },
  }
}

export function createBrandKitBannerUploadHandler(
  configOrOptions: unknown = {},
  maybeOptions: BrandKitRouteHandlerOptions = {},
) {
  const config = isBrandKitConfig(configOrOptions)
    ? parseBrandKitConfig(configOrOptions)
    : null
  const options = isBrandKitConfig(configOrOptions)
    ? maybeOptions
    : (configOrOptions as BrandKitRouteHandlerOptions)

  return {
    async POST(request: Request) {
      try {
        if (isProduction()) {
          return productionBlocked(
            'Custom banner uploads are only available in local development.',
          )
        }

        if (request.headers.get('content-type')?.includes('application/json')) {
          const body = (await request.json()) as BannerUploadResetRequest
          const manifest = await loadBrandKitManifest(options)

          if (body.action === 'set-lock') {
            if (typeof body.locked !== 'boolean') {
              throw new Error('Missing banner lock state.')
            }

            await writeBrandKitManifest(
              {
                ...manifest,
                bannerControlsLocked: body.locked,
              },
              options,
            )

            return NextResponse.json({ locked: body.locked })
          }

          if (!config) {
            throw new Error('Banner reset requires the Brand Kit config.')
          }

          if (manifest.bannerControlsLocked) {
            return productionBlocked('Banner assets are locked.')
          }

          if (body.action !== 'reset') {
            throw new Error('Unsupported banner action.')
          }

          if (typeof body.assetId !== 'string') {
            throw new Error('Missing banner asset.')
          }

          const asset = findBannerAsset(manifest, body.assetId)

          if (!asset) {
            throw new Error('Banner asset not found.')
          }

          const customBannerIds = getCustomBannerIds(manifest).filter(
            (assetId) => assetId !== body.assetId,
          )
          const { buildBrandKit } = await import('../../core/build.js')
          const result = await buildBrandKit(config, {
            cwd: getCwd(options),
            customBannerIds,
          })
          const resetAsset = findBannerAsset(result.manifest, body.assetId)

          return NextResponse.json({
            assetId: body.assetId,
            files: bannerWrittenFileNames(config, result.writtenFiles, options),
            height: resetAsset?.height ?? asset.height,
            isCustom: false,
            url: resetAsset?.previewUrl ?? asset.previewUrl,
            width: resetAsset?.width ?? asset.width,
          })
        }

        const formData = await request.formData()
        const assetId = formData.get('assetId')
        const file = formData.get('file')

        if (typeof assetId !== 'string') {
          throw new Error('Missing banner asset.')
        }

        if (!file || typeof file === 'string') {
          throw new Error('Missing image file.')
        }

        if (file.size > maxUploadBytes) {
          throw new Error('Image must be smaller than 20 MB.')
        }

        if (file.type && !acceptedImageTypes.has(file.type)) {
          throw new Error('Upload a PNG, JPG, SVG, or WebP image.')
        }

        const manifest = await loadBrandKitManifest(options)

        if (manifest.bannerControlsLocked) {
          return productionBlocked('Banner assets are locked.')
        }

        const asset = findBannerAsset(manifest, assetId)
        const download = asset?.downloads.find((item) => item.format === 'PNG')

        if (!asset || !download) {
          throw new Error('Banner asset not found.')
        }

        const source = Buffer.from(await file.arrayBuffer())
        const sharp = await getSharp()
        const output = await sharp(source)
          .resize(asset.width, asset.height, {
            fit: 'cover',
            position: 'center',
          })
          .png()
          .toBuffer()
        const filePath = getPublicFilePath(download.url, options)

        await mkdir(path.dirname(filePath), { recursive: true })
        await writeFile(filePath, output)
        await writeBrandKitManifest(
          setCustomBannerState(manifest, asset.id, true),
          options,
        )

        return NextResponse.json({
          assetId: asset.id,
          fileName: download.fileName,
          height: asset.height,
          isCustom: true,
          url: download.url,
          width: asset.width,
        })
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'Could not replace banner image.',
          },
          { status: 400 },
        )
      }
    },
  }
}

export function createBrandKitBannerPresetHandler(
  config: unknown,
  options: BrandKitRouteHandlerOptions = {},
) {
  const brandKitConfig = parseBrandKitConfig(config)

  return {
    async POST(request: Request) {
      try {
        if (isProduction()) {
          return productionBlocked(
            'Banner preset file updates are only available in local development.',
          )
        }

        const body = (await request.json()) as BrandKitBannerPresetRequest
        const currentManifest = await loadBrandKitManifest(options)

        if (currentManifest.bannerControlsLocked) {
          return productionBlocked('Banner assets are locked.')
        }

        const customBannerIds = getCustomBannerIds(currentManifest)
        const { buildBrandKit } = await import('../../core/build.js')
        const result = await buildBrandKit(
          applyBannerPresetRequest(brandKitConfig, body),
          {
            cwd: getCwd(options),
            customBannerIds,
          },
        )
        const files = bannerWrittenFileNames(
          brandKitConfig,
          result.writtenFiles,
          options,
        )

        return NextResponse.json({ files })
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'Could not update banner presets.',
          },
          { status: 400 },
        )
      }
    },
  }
}

export function createBrandKitNextHandlers(
  config: unknown,
  options: BrandKitRouteHandlerOptions = {},
) {
  const brandKitConfig = parseBrandKitConfig(config)

  return {
    bannerPresets: createBrandKitBannerPresetHandler(brandKitConfig, options),
    bannerUpload: createBrandKitBannerUploadHandler(brandKitConfig, options),
    downloads: createBrandKitDownloadHandler(options),
    favicon: createBrandKitFaviconHandler(brandKitConfig, options),
  }
}
