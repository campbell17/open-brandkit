import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import JSZip from 'jszip'

import {
  applyBrandCasing,
  compareDownloads,
  createEmptyLogoGroups,
  ensureDirectory,
  getDownloadFormat,
  getFileStem,
  getPreferredPreviewUrl,
  getPublicAssetPath,
  groupAssetByConfig,
  humanizeAssetTitle,
  inferPreviewTone,
  isSameFile,
  joinPublicUrl,
  readBrandAssetFiles,
  toPosixPath,
} from './assets.js'
import { renderBanner } from './banner-renderer.js'
import { brandKitConfigSchema } from './config.js'
import {
  loadBrandKitColorSections,
  loadBrandKitColors,
  loadBrandKitPrintColorGroups,
  normalizeHexColor,
} from './colors.js'
import { generateStaticBrandKitPage } from './static-page.js'
import type {
  BrandKitAsset,
  BrandKitAssetDownload,
  BrandKitAssetGroup,
  BrandKitBannerAsset,
  BrandKitBannerGroup,
  BrandKitColor,
  BrandKitColorSection,
  BrandKitConfig,
  BrandKitManifest,
  BrandKitPrintColorGroup,
  BrandKitSocialBannersConfig,
} from './types.js'

export type BuildBrandKitOptions = {
  cwd?: string
  customBannerIds?: readonly string[]
}

export type BuildBrandKitResult = {
  manifest: BrandKitManifest
  manifestPath: string
  sitePath: string
  writtenFiles: string[]
}

function stripSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, '')
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function outputFileNameForPreset(brandName: string, key: string) {
  const brandSlug = slugify(brandName) || 'brand'

  return `${brandSlug}-${slugify(key)}.png`
}

function resolveColor(
  value: string | undefined,
  colors: BrandKitSocialBannersConfig['colors'],
  fallback: string,
) {
  if (!value) return fallback

  const hex = normalizeHexColor(value)

  if (hex) return hex

  return colors.find((color) => color.key === value)?.hex ?? fallback
}

function createDownload(publicUrl: string): BrandKitAssetDownload {
  return {
    fileName: path.posix.basename(publicUrl),
    format: getDownloadFormat(publicUrl),
    url: publicUrl,
  }
}

function applyConfiguredBrandCasing(config: BrandKitConfig, value: string) {
  return applyBrandCasing(value, {
    brandName: config.brand.name,
    shortName: config.brand.shortName,
  })
}

function applyConfiguredBrandCasingToColors(
  config: BrandKitConfig,
  colors: BrandKitColor[],
) {
  return colors.map((color) => ({
    ...color,
    name: applyConfiguredBrandCasing(config, color.name),
  }))
}

function applyConfiguredBrandCasingToColorSections(
  config: BrandKitConfig,
  sections: BrandKitColorSection[],
) {
  return sections.map((section) => ({
    ...section,
    label: applyConfiguredBrandCasing(config, section.label),
    rows: section.rows.map((row) =>
      row.map((name) => applyConfiguredBrandCasing(config, name)),
    ),
  }))
}

function applyConfiguredBrandCasingToPrintColorGroups(
  config: BrandKitConfig,
  groups: BrandKitPrintColorGroup[],
) {
  return groups.map((group) => ({
    ...group,
    label: applyConfiguredBrandCasing(config, group.label),
    items: group.items.map((item) => ({
      ...item,
      pantone: applyConfiguredBrandCasing(config, item.pantone),
    })),
  }))
}

async function discoverLogoGroups({
  assetBasePath,
  config,
  outputRoot,
  projectRoot,
  customBannerIds = new Set<string>(),
}: {
  assetBasePath: string
  config: BrandKitConfig
  customBannerIds?: ReadonlySet<string>
  outputRoot: string
  projectRoot: string
}) {
  const sourceDir = path.resolve(projectRoot, config.logos.sourceDir)
  const logoOutputDir = path.join(outputRoot, 'logos')
  const files = await readBrandAssetFiles(sourceDir)
  const groups = createEmptyLogoGroups(config.logos)
  const groupsByKey = new Map(groups.map((group) => [group.key, group]))
  const assetsByGroup = new Map<string, Map<string, BrandKitAsset>>()
  const writtenFiles: string[] = []

  for (const group of groups) {
    assetsByGroup.set(group.key, new Map())
  }

  for (const sourcePath of files) {
    const relativePath = path.relative(sourceDir, sourcePath)
    const normalizedRelativePath = toPosixPath(relativePath)
    const groupConfig = groupAssetByConfig(
      normalizedRelativePath,
      config.logos.groups,
    )
    const groupKey =
      groupConfig?.key ?? (config.logos.includeUngrouped === false ? null : 'other')

    if (!groupKey) continue

    const group = groupsByKey.get(groupKey)
    const assets = assetsByGroup.get(groupKey)

    if (!group || !assets) continue

    const destinationPath = path.join(logoOutputDir, relativePath)

    await ensureDirectory(path.dirname(destinationPath))

    if (!(await isSameFile(sourcePath, destinationPath))) {
      await copyFile(sourcePath, destinationPath)
      writtenFiles.push(destinationPath)
    }

    const publicUrl = getPublicAssetPath({
      assetBasePath,
      outputSubdir: 'logos',
      relativePath,
    })
    const stem = getFileStem(relativePath)
    const existing = assets.get(stem)
    const download = createDownload(publicUrl)

    if (existing) {
      existing.downloads.push(download)
      continue
    }

    assets.set(stem, {
      id: `${group.key}:${stem}`,
      title:
        humanizeAssetTitle(stem, {
          brandName: config.brand.name,
          shortName: config.brand.shortName,
        }) || stem,
      previewTone: inferPreviewTone(relativePath),
      previewUrl: publicUrl,
      downloads: [download],
    })
  }

  for (const group of groups) {
    const assets = assetsByGroup.get(group.key)

    group.items = Array.from(assets?.values() ?? [])
      .map((asset) => {
        const downloads = asset.downloads.sort(compareDownloads)

        return {
          ...asset,
          downloads,
          previewUrl: getPreferredPreviewUrl(downloads),
        }
      })
      .sort((left, right) => left.title.localeCompare(right.title))
  }

  return {
    groups: groups.filter((group) => group.items.length > 0),
    writtenFiles,
  }
}

async function renderBannerGroups({
  assetBasePath,
  config,
  customBannerIds = new Set<string>(),
  outputRoot,
  projectRoot,
}: {
  assetBasePath: string
  config: BrandKitConfig
  customBannerIds?: ReadonlySet<string>
  outputRoot: string
  projectRoot: string
}) {
  if (!config.socialBanners) {
    return { groups: [] satisfies BrandKitBannerGroup[], writtenFiles: [] }
  }

  const bannerConfig = config.socialBanners
  const outputDir = bannerConfig.outputDir ?? 'banners'
  const publicPath = bannerConfig.publicPath ?? joinPublicUrl(assetBasePath, outputDir)
  const bannerOutputDir = path.join(outputRoot, stripSlashes(outputDir))
  const groups = new Map<string, BrandKitBannerGroup>()
  const writtenFiles: string[] = []
  const firstColor = bannerConfig.colors[0]?.hex ?? '#0d2249'
  const secondColor = bannerConfig.colors[1]?.hex ?? '#4784de'
  const thirdColor = bannerConfig.colors[2]?.hex ?? '#ffffff'

  await mkdir(bannerOutputDir, { recursive: true })

  for (const preset of bannerConfig.presets) {
    const markVariant =
      bannerConfig.markVariants.find(
        (variant) => variant.key === preset.markVariant,
      ) ?? bannerConfig.markVariants[0]

    if (!markVariant) continue

    const fileName =
      preset.outputFileName ??
      outputFileNameForPreset(config.brand.shortName ?? config.brand.name, preset.key)
    const outputPath = path.join(bannerOutputDir, fileName)
    const publicUrl = joinPublicUrl(publicPath, fileName)
    const isCustom = customBannerIds.has(preset.key)
    const backgroundColor = resolveColor(
      preset.backgroundColor,
      bannerConfig.colors,
      firstColor,
    )
    const accentColor = resolveColor(
      preset.accentColor,
      bannerConfig.colors,
      secondColor,
    )
    const secondaryColor = resolveColor(
      preset.secondaryColor,
      bannerConfig.colors,
      thirdColor,
    )
    const markAssetPath =
      (preset.markColor ? markVariant.colorAssets?.[preset.markColor] : undefined) ??
      markVariant.assetPath

    if (!isCustom) {
      const output = await renderBanner({
        alignment: preset.alignment,
        backgroundColor,
        accentColor,
        secondaryColor,
        height: preset.height,
        markAssetPath: path.resolve(projectRoot, markAssetPath),
        markScale: markVariant.scale,
        pattern: preset.pattern,
        width: preset.width,
      })

      await writeFile(outputPath, output)
      writtenFiles.push(outputPath)
    }

    const groupKey = preset.groupKey ?? preset.key
    const groupLabel = preset.groupLabel ?? preset.label
    const group =
      groups.get(groupKey) ??
      ({
        key: groupKey,
        label: groupLabel,
        items: [],
      } satisfies BrandKitBannerGroup)
    const asset = {
      id: preset.key,
      title: preset.label,
      description: preset.description ?? `${preset.width} x ${preset.height} px`,
      width: preset.width,
      height: preset.height,
      previewUrl: publicUrl,
      ...(isCustom ? { isCustom } : {}),
      downloads: [createDownload(publicUrl)],
    } satisfies BrandKitBannerAsset

    group.items.push(asset)
    groups.set(groupKey, group)
  }

  return {
    groups: Array.from(groups.values()),
    writtenFiles,
  }
}

function filePathFromPublicUrl(projectRoot: string, publicDir: string, url: string) {
  return path.join(projectRoot, publicDir, ...url.split('/').filter(Boolean))
}

async function createZip({
  entries,
  filePath,
  projectRoot,
  publicDir,
}: {
  entries: { download: BrandKitAssetDownload; zipPath: string }[]
  filePath: string
  projectRoot: string
  publicDir: string
}) {
  const zip = new JSZip()

  for (const entry of entries) {
    const sourcePath = filePathFromPublicUrl(projectRoot, publicDir, entry.download.url)
    const file = await readFile(sourcePath)

    zip.file(entry.zipPath, file, { createFolders: false })
  }

  const content = await zip.generateAsync({ type: 'nodebuffer' })

  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, content)
}

async function createDownloadArchives({
  assetBasePath,
  assetGroups,
  bannerGroups,
  archivePrefix,
  outputRoot,
  projectRoot,
  publicDir,
}: {
  assetBasePath: string
  assetGroups: BrandKitAssetGroup[]
  archivePrefix: string
  bannerGroups: BrandKitBannerGroup[]
  outputRoot: string
  projectRoot: string
  publicDir: string
}) {
  const downloadsDir = path.join(outputRoot, 'downloads')
  const writtenFiles: string[] = []
  const allEntries: { download: BrandKitAssetDownload; zipPath: string }[] = []
  const assetGroupArchives: Record<string, string> = {}
  const archiveFileName = (name: string) =>
    archivePrefix ? `${archivePrefix}-${name}.zip` : `${name}.zip`
  const bannerEntries = bannerGroups.flatMap((group) =>
    group.items.flatMap((asset) =>
      asset.downloads.map((download) => ({
        download,
        zipPath: path.posix.join(group.key, download.fileName),
      })),
    ),
  )

  for (const group of assetGroups) {
    const groupEntries = group.items.flatMap((asset) =>
      asset.downloads.map((download) => ({
        download,
        zipPath: download.fileName,
      })),
    )

    if (!groupEntries.length) continue

    const fileName = archiveFileName(group.key)
    const zipPath = path.join(downloadsDir, fileName)

    await createZip({ entries: groupEntries, filePath: zipPath, projectRoot, publicDir })
    writtenFiles.push(zipPath)
    assetGroupArchives[group.key] = joinPublicUrl(
      assetBasePath,
      'downloads',
      fileName,
    )
    allEntries.push(
      ...groupEntries.map((entry) => ({
        ...entry,
        zipPath: path.posix.join(group.key, entry.download.fileName),
      })),
    )
  }

  for (const group of bannerGroups) {
    allEntries.push(
      ...group.items.flatMap((asset) =>
        asset.downloads.map((download) => ({
          download,
          zipPath: path.posix.join('banners', group.key, download.fileName),
        })),
      ),
    )
  }

  const bannerAssetsFileName = archiveFileName('banners')
  const allAssetsFileName = archiveFileName('all-assets')
  const bannerAssetsUrl = bannerEntries.length
    ? joinPublicUrl(assetBasePath, 'downloads', bannerAssetsFileName)
    : undefined
  const allAssetsUrl = allEntries.length
    ? joinPublicUrl(assetBasePath, 'downloads', allAssetsFileName)
    : undefined

  if (bannerEntries.length) {
    const bannerAssetsPath = path.join(downloadsDir, bannerAssetsFileName)

    await createZip({
      entries: bannerEntries,
      filePath: bannerAssetsPath,
      projectRoot,
      publicDir,
    })
    writtenFiles.push(bannerAssetsPath)
  }

  if (allEntries.length) {
    const allAssetsPath = path.join(downloadsDir, allAssetsFileName)

    await createZip({
      entries: allEntries,
      filePath: allAssetsPath,
      projectRoot,
      publicDir,
    })
    writtenFiles.push(allAssetsPath)
  }

  return { allAssetsUrl, assetGroupArchives, bannerAssetsUrl, writtenFiles }
}

export async function buildBrandKit(
  inputConfig: BrandKitConfig,
  options: BuildBrandKitOptions = {},
): Promise<BuildBrandKitResult> {
  const projectRoot = options.cwd ?? process.cwd()
  const config = brandKitConfigSchema.parse(inputConfig) as BrandKitConfig
  const route = config.route ?? '/brandkit'
  const output = config.output ?? {}
  const publicDir = output.publicDir ?? 'public'
  const assetBasePath = output.assetBasePath ?? route
  const outputRoot = path.resolve(projectRoot, publicDir, stripSlashes(assetBasePath))
  const writtenFiles: string[] = []

  await mkdir(outputRoot, { recursive: true })

  const logoResult = await discoverLogoGroups({
    assetBasePath,
    config,
    outputRoot,
    projectRoot,
  })
  const brandColors = applyConfiguredBrandCasingToColors(
    config,
    await loadBrandKitColors(config.colors, projectRoot),
  )
  const colorSections = applyConfiguredBrandCasingToColorSections(
    config,
    await loadBrandKitColorSections(
      config.colors,
      projectRoot,
      brandColors,
    ),
  )
  const printColorGroups = applyConfiguredBrandCasingToPrintColorGroups(
    config,
    await loadBrandKitPrintColorGroups(config.colors, projectRoot),
  )
  const bannerResult = await renderBannerGroups({
    assetBasePath,
    config,
    customBannerIds: new Set(options.customBannerIds ?? []),
    outputRoot,
    projectRoot,
  })
  const downloadResult = await createDownloadArchives({
    assetBasePath,
    assetGroups: logoResult.groups,
    archivePrefix: slugify(config.brand.shortName ?? config.brand.name),
    bannerGroups: bannerResult.groups,
    outputRoot,
    projectRoot,
    publicDir,
  })
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    route,
    assetBasePath,
    brand: config.brand,
    assetGroups: logoResult.groups,
    brandColors,
    colorSections,
    printColorGroups,
    bannerGroups: bannerResult.groups,
    downloads: {
      allAssets: downloadResult.allAssetsUrl,
      assetGroups: downloadResult.assetGroupArchives,
      bannerAssets: downloadResult.bannerAssetsUrl,
    },
  } satisfies BrandKitManifest
  const manifestPath = path.join(
    outputRoot,
    output.manifestFileName ?? 'brandkit.manifest.json',
  )
  const sitePath = path.join(outputRoot, output.siteFileName ?? 'index.html')

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  await writeFile(sitePath, generateStaticBrandKitPage(manifest))

  writtenFiles.push(
    ...logoResult.writtenFiles,
    ...bannerResult.writtenFiles,
    ...downloadResult.writtenFiles,
    manifestPath,
    sitePath,
  )

  return {
    manifest,
    manifestPath,
    sitePath,
    writtenFiles,
  }
}
