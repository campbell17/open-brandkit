import type { Dirent } from 'node:fs'
import { mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

import type {
  BrandKitAsset,
  BrandKitAssetDownload,
  BrandKitAssetGroup,
  BrandKitConfig,
  BrandKitLogoGroupConfig,
  BrandKitPreviewTone,
} from './types.js'

const supportedAssetExtensions = new Set([
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
])

const downloadFormatOrder = ['SVG', 'PNG', 'WEBP', 'JPG', 'JPEG']

export function isSupportedBrandAsset(fileName: string) {
  return supportedAssetExtensions.has(path.extname(fileName).toLowerCase())
}

export function getDownloadFormat(fileName: string) {
  return path.extname(fileName).replace('.', '').toUpperCase()
}

export function makeAssetDownload(publicUrl: string): BrandKitAssetDownload {
  return {
    fileName: path.basename(publicUrl),
    format: getDownloadFormat(publicUrl),
    url: publicUrl,
  }
}

export function groupAssetByConfig(
  fileName: string,
  groups: BrandKitLogoGroupConfig[],
) {
  const normalized = fileName.toLowerCase()
  const normalizedParts = normalized.split(/[^a-z0-9]+/).filter(Boolean)
  const compact = normalizedParts.join('')
  const hasToken = (...tokens: string[]) =>
    tokens.some((token) => normalizedParts.includes(token))
  const matchesConfiguredToken = (token: string) => {
    const tokenParts = token.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
    const tokenCompact = tokenParts.join('')

    if (!tokenCompact) return false
    if (tokenCompact.length <= 4) return normalizedParts.includes(tokenCompact)

    return compact.includes(tokenCompact) || normalized.includes(token.toLowerCase())
  }
  const wordmarkGroup = groups.find((group) =>
    /word[-_\s]?marks?/i.test(`${group.key} ${group.label}`),
  )
  const iconGroup = groups.find((group) =>
    /icons?|symbols?/i.test(`${group.key} ${group.label}`),
  )
  const logoGroup = groups.find((group) =>
    /logo|lockup/i.test(`${group.key} ${group.label}`),
  )
  const isWordmark =
    compact.includes('wordmark') ||
    /\bword\s+marks?\b/.test(normalized) ||
    /\bword[-_]marks?\b/.test(normalized)
  const isIcon =
    !isWordmark &&
    (hasToken('icon', 'icons', 'symbol', 'symbols', 'favicon') ||
      compact.includes('brandmark') ||
      hasToken('mark'))
  const isLogoLockup =
    !isWordmark &&
    !isIcon &&
    (hasToken('logo', 'logos', 'lockup', 'lockups') ||
      normalized.includes('lockup'))

  if (isWordmark && wordmarkGroup) return wordmarkGroup
  if (isIcon && iconGroup) return iconGroup
  if (isLogoLockup && logoGroup) return logoGroup

  return groups.find((group) => group.match.some(matchesConfiguredToken))
}

export function makeBrandKitAsset({
  id,
  previewTone = 'light',
  previewUrl,
  title,
}: {
  id: string
  previewTone?: BrandKitPreviewTone
  previewUrl: string
  title: string
}): BrandKitAsset {
  return {
    id,
    previewTone,
    previewUrl,
    title,
    downloads: [makeAssetDownload(previewUrl)],
  }
}

export async function readBrandAssetFiles(directory: string) {
  const files: string[] = []

  async function walk(currentDirectory: string) {
    let entries: Dirent[]

    try {
      entries = await readdir(currentDirectory, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const absolutePath = path.join(currentDirectory, entry.name)

      if (entry.isDirectory()) {
        await walk(absolutePath)
        continue
      }

      if (entry.isFile() && isSupportedBrandAsset(entry.name)) {
        files.push(absolutePath)
      }
    }
  }

  await walk(directory)

  return files.sort((left, right) => left.localeCompare(right))
}

export function toPosixPath(value: string) {
  return value.split(path.sep).join(path.posix.sep)
}

export function joinPublicUrl(...parts: string[]) {
  return `/${parts
    .flatMap((part) => part.split('/'))
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/')}`
}

export function getFileStem(fileName: string) {
  return path.basename(fileName).replace(/\.[^.]+$/, '')
}

type BrandCasingOptions = {
  brandName?: string
  shortName?: string
}

function getBrandNameTokens(brandName?: string) {
  return new Set(
    (brandName ?? '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  )
}

function applyGeneratedTokenCasing(
  token: string,
  { shortName }: BrandCasingOptions,
) {
  if (shortName && token.toLowerCase() === shortName.toLowerCase()) {
    return shortName
  }

  if (/^workd?mark$/i.test(token)) return 'Wordmark'
  if (token.toUpperCase() === token) return token

  return token.charAt(0).toUpperCase() + token.slice(1)
}

export function applyBrandCasing(
  value: string,
  { shortName }: BrandCasingOptions,
) {
  if (!shortName) return value

  return value.replace(/[a-z0-9]+/gi, (token) =>
    token.toLowerCase() === shortName.toLowerCase() ? shortName : token,
  )
}

export function humanizeAssetTitle(
  fileName: string,
  brandNameOrOptions?: string | BrandCasingOptions,
  shortName?: string,
) {
  const casing =
    typeof brandNameOrOptions === 'object'
      ? brandNameOrOptions
      : { brandName: brandNameOrOptions, shortName }
  const brandTokens = new Set(
    getBrandNameTokens(casing.brandName),
  )

  return getFileStem(fileName)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .filter((token) => !brandTokens.has(token.toLowerCase()))
    .map((token) => applyGeneratedTokenCasing(token, casing))
    .join(' ')
}

export function inferPreviewTone(fileName: string): BrandKitPreviewTone {
  return /\bwhite\b|[-_]white[-_.]/i.test(fileName) ? 'dark' : 'light'
}

export function compareDownloads(
  left: BrandKitAssetDownload,
  right: BrandKitAssetDownload,
) {
  const leftOrder = downloadFormatOrder.indexOf(left.format)
  const rightOrder = downloadFormatOrder.indexOf(right.format)

  return (
    (leftOrder === -1 ? 100 : leftOrder) -
      (rightOrder === -1 ? 100 : rightOrder) ||
    left.fileName.localeCompare(right.fileName)
  )
}

export function getPreferredPreviewUrl(downloads: BrandKitAssetDownload[]) {
  return (
    downloads.find((download) => download.format === 'SVG')?.url ??
    downloads.find((download) => download.format === 'PNG')?.url ??
    downloads[0]?.url ??
    ''
  )
}

export async function ensureDirectory(directory: string) {
  await mkdir(directory, { recursive: true })
}

export async function isSameFile(left: string, right: string) {
  try {
    const [leftStat, rightStat] = await Promise.all([stat(left), stat(right)])

    return leftStat.dev === rightStat.dev && leftStat.ino === rightStat.ino
  } catch {
    return false
  }
}

export function getPublicAssetPath({
  assetBasePath,
  outputSubdir,
  relativePath,
}: {
  assetBasePath: string
  outputSubdir: string
  relativePath: string
}) {
  return joinPublicUrl(assetBasePath, outputSubdir, toPosixPath(relativePath))
}

export function createEmptyLogoGroups(config: BrandKitConfig['logos']) {
  const groups: BrandKitAssetGroup[] = config.groups.map((group) => ({
    key: group.key,
    label: group.label,
    description: group.description ?? getDefaultGroupDescription(group),
    items: [],
  }))

  if (config.includeUngrouped !== false) {
    groups.push({
      key: 'other',
      label: 'Other Assets',
      description: 'Brand assets that did not match a configured group.',
      items: [],
    })
  }

  return groups
}

function getDefaultGroupDescription(group: BrandKitLogoGroupConfig) {
  const label = `${group.key} ${group.label}`.toLowerCase()

  if (/word[-_\s]?marks?/.test(label)) {
    return 'Text-first marks for wide placements.'
  }

  if (/icons?|symbols?/.test(label)) {
    return 'Symbol-only marks for compact surfaces.'
  }

  if (/logo|lockup/.test(label)) {
    return 'Primary logo lockups in approved colorways.'
  }

  return undefined
}
