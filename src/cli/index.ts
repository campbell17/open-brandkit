#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { createJiti } from 'jiti'

import { readBrandAssetFiles } from '../core/assets.js'
import { buildBrandKit } from '../core/build.js'
import { loadBrandKitColors } from '../core/colors.js'
import type {
  BrandKitColor,
  BrandKitColorSource,
  BrandKitConfig,
  BrandKitSocialBannersConfig,
} from '../core/types.js'

const defaultConfigNames = [
  'brandkit.config.ts',
  'brandkit.config.mts',
  'brandkit.config.js',
  'brandkit.config.mjs',
]

type InitAnswers = {
  appDir: string
  brandName: string
  colorPath: string
  configPath: string
  logoDir: string
  route: string
  shortName: string
  shouldBuild: boolean
}

type InitResult = {
  config: BrandKitConfig
  configPath: string
  created: string[]
  skipped: string[]
}

function printHelp() {
  console.log(`Open BrandKit

Usage:
  open-brandkit init [options]
  open-brandkit build [--config brandkit.config.ts]

Commands:
  init    Run the Next.js App Router installer wizard and create the Brand Kit.
  build   Generate public/brandkit assets, manifest, downloads, and page.

Init options:
  --yes                 Use detected/default answers.
  --force               Overwrite generated files if they already exist.
  --build               Run the Brand Kit build after installing.
  --install             Run the package-manager install after writing package.json.
  --brand "Name"        Brand name.
  --short-name "Name"   Short brand name.
  --logos path          Logo source directory.
  --colors path         Color source file.
  --route /brandkit     Website route.
  --app-dir src/app     Next.js app directory.
`)
}

function hasFlag(args: string[], flag: string) {
  return args.includes(flag)
}

function hasOption(args: string[], option: string) {
  return args.some((arg) => arg === option || arg.startsWith(`${option}=`))
}

function getFlagValue(args: string[], flag: string) {
  const index = args.indexOf(flag)

  if (index === -1) return null

  return args[index + 1] ?? null
}

function toPosixPath(value: string) {
  return value.split(path.sep).join(path.posix.sep)
}

function stripSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, '')
}

function titleFromPackageName(value: string) {
  return value
    .replace(/^@[^/]+\//, '')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

function removeExtension(filePath: string) {
  return filePath.replace(/\.[cm]?[tj]sx?$/, '')
}

function routeToSegments(route: string) {
  const stripped = stripSlashes(route)

  return stripped ? stripped.split('/').filter(Boolean) : ['brandkit']
}

function importPath(fromFile: string, toFile: string) {
  let relative = toPosixPath(
    path.relative(path.dirname(fromFile), removeExtension(toFile)),
  )

  if (!relative.startsWith('.')) {
    relative = `./${relative}`
  }

  return relative
}

async function pathExists(filePath: string) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function readPackageJson(cwd: string) {
  const packagePath = path.join(cwd, 'package.json')

  try {
    const source = await readFile(packagePath, 'utf8')

    return {
      path: packagePath,
      value: JSON.parse(source) as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
        name?: string
        scripts?: Record<string, string>
      },
    }
  } catch {
    return null
  }
}

async function readOwnPackageJson() {
  const packagePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'package.json',
  )

  try {
    const source = await readFile(packagePath, 'utf8')

    return JSON.parse(source) as { name?: string; version?: string }
  } catch {
    return { name: 'open-brandkit', version: 'latest' }
  }
}

async function findConfigPath(cwd: string, explicitPath: string | null) {
  if (explicitPath) return path.resolve(cwd, explicitPath)

  for (const configName of defaultConfigNames) {
    const candidate = path.join(cwd, configName)

    if (await pathExists(candidate)) return candidate
  }

  throw new Error(
    `Could not find ${defaultConfigNames.join(', ')}. Run open-brandkit init first.`,
  )
}

async function loadConfig(configPath: string) {
  const jiti = createJiti(pathToFileURL(configPath).href)
  const loaded = (await jiti.import(configPath, {
    default: true,
  })) as BrandKitConfig | { default?: BrandKitConfig }

  if (loaded && typeof loaded === 'object' && 'default' in loaded) {
    return loaded.default as BrandKitConfig
  }

  return loaded as BrandKitConfig
}

async function prompt(
  question: string,
  defaultValue: string,
  options: {
    enabled: boolean
    rl: ReturnType<typeof createInterface> | null
  },
) {
  if (!options.enabled || !options.rl) return defaultValue

  const answer = await options.rl.question(`${question} (${defaultValue}): `)

  return answer.trim() || defaultValue
}

async function promptBoolean(
  question: string,
  defaultValue: boolean,
  options: {
    enabled: boolean
    rl: ReturnType<typeof createInterface> | null
  },
) {
  if (!options.enabled || !options.rl) return defaultValue

  const suffix = defaultValue ? 'Y/n' : 'y/N'
  const answer = (await options.rl.question(`${question} (${suffix}): `))
    .trim()
    .toLowerCase()

  if (!answer) return defaultValue

  return answer === 'y' || answer === 'yes'
}

async function detectLogoDir(cwd: string) {
  const candidates = [
    'public/brandkit-source/logos',
    'public/brandkit/logos',
    'public/logos',
    'public/logo',
    'assets/logos',
    'src/assets/logos',
  ]

  for (const candidate of candidates) {
    if (await pathExists(path.join(cwd, candidate))) {
      return candidate
    }
  }

  return 'public/brandkit-source/logos'
}

async function detectColorPath(cwd: string) {
  const candidates = [
    'docs/brand-colors.md',
    'docs/colors.md',
    'brand-colors.md',
    'colors.md',
    'brand-colors.json',
    'colors.json',
    'brand-colors.csv',
    'colors.csv',
  ]

  for (const candidate of candidates) {
    if (await pathExists(path.join(cwd, candidate))) {
      return candidate
    }
  }

  return 'docs/brand-colors.md'
}

async function detectAppDir(cwd: string, packageName?: string) {
  if (await pathExists(path.join(cwd, 'src/app'))) return 'src/app'
  if (await pathExists(path.join(cwd, 'app'))) return 'app'
  if (await pathExists(path.join(cwd, 'src'))) return 'src/app'
  if (packageName) return 'app'

  return 'app'
}

function colorSourceFromPath(colorPath: string): BrandKitColorSource {
  const extension = path.extname(colorPath).toLowerCase()

  if (extension === '.json') {
    return { type: 'json', path: colorPath }
  }

  if (extension === '.csv' || extension === '.tsv') {
    return { type: 'csv', path: colorPath }
  }

  return { type: 'markdown-table', path: colorPath }
}

function assetNameParts(filePath: string) {
  return path
    .basename(filePath, path.extname(filePath))
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function isWordmarkPath(filePath: string) {
  const parts = assetNameParts(filePath)
  const compact = parts.join('')

  return compact.includes('wordmark')
}

function isIconPath(filePath: string) {
  const parts = assetNameParts(filePath)
  const compact = parts.join('')

  return (
    !isWordmarkPath(filePath) &&
    (parts.some((part) =>
      ['icon', 'icons', 'symbol', 'symbols', 'favicon', 'mark'].includes(part),
    ) ||
      compact.includes('brandmark'))
  )
}

function isLogoPath(filePath: string) {
  const parts = assetNameParts(filePath)

  return (
    !isWordmarkPath(filePath) &&
    !isIconPath(filePath) &&
    parts.some((part) => ['logo', 'logos', 'lockup', 'lockups'].includes(part))
  )
}

const ignoredMarkVariantTokens = new Set([
  'brand',
  'brandkit',
  'favicon',
  'icon',
  'icons',
  'lockup',
  'lockups',
  'logo',
  'logos',
  'mark',
  'marks',
  'symbol',
  'symbols',
  'word',
  'wordmark',
  'wordmarks',
])

const namedMarkVariantColors = {
  black: { hex: '#05070b', label: 'Black' },
  white: { hex: '#ffffff', label: 'White' },
} satisfies Record<string, { hex: string; label: string }>

function titleFromTokens(tokens: string[]) {
  return tokens
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

function slugFromTokens(tokens: string[]) {
  return tokens.join('-').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim().toLowerCase()
  const short = trimmed.match(/^#([0-9a-f]{3})$/i)
  const long = trimmed.match(/^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i)

  if (short) {
    return `#${short[1]
      .split('')
      .map((character) => `${character}${character}`)
      .join('')}`
  }

  return long ? `#${long[1]}` : null
}

function colorValueToHex(value: string) {
  const normalized = normalizeHexColor(value)

  if (normalized) return normalized
  if (/^white$/i.test(value.trim())) return '#ffffff'
  if (/^black$/i.test(value.trim())) return '#05070b'

  return null
}

function addColorWeight(
  weights: Map<string, number>,
  value: string | null | undefined,
  weight: number,
) {
  if (!value || /^(none|transparent|currentcolor)$/i.test(value.trim())) return

  const hex = colorValueToHex(value)

  if (!hex) return

  weights.set(hex, (weights.get(hex) ?? 0) + weight)
}

function inferSvgSwatch(source: string) {
  const classFills = new Map<string, string>()
  const weights = new Map<string, number>()
  const classRulePattern = /\.([_a-zA-Z0-9-]+)\s*\{[^}]*?\bfill\s*:\s*([^;}]+)[^}]*\}/g
  const shapePattern = /<(path|polygon|circle|rect|ellipse|line|polyline)\b([^>]*)>/gi
  let classRule: RegExpExecArray | null
  let shape: RegExpExecArray | null

  while ((classRule = classRulePattern.exec(source))) {
    classFills.set(classRule[1], classRule[2].trim())
  }

  while ((shape = shapePattern.exec(source))) {
    const attributes = shape[2]
    const fillAttribute = attributes.match(/\bfill=["']([^"']+)["']/i)
    const styleFill = attributes.match(/\bstyle=["'][^"']*?\bfill\s*:\s*([^;"']+)/i)
    const classAttribute = attributes.match(/\bclass=["']([^"']+)["']/i)

    if (fillAttribute) {
      addColorWeight(weights, fillAttribute[1], 8)
      continue
    }

    if (styleFill) {
      addColorWeight(weights, styleFill[1], 8)
      continue
    }

    if (classAttribute) {
      for (const className of classAttribute[1].split(/\s+/).filter(Boolean)) {
        addColorWeight(weights, classFills.get(className), 8)
      }
      continue
    }

    addColorWeight(weights, 'black', 1)
  }

  source.replace(/\bfill\s*:\s*([^;}]+)/gi, (_match, color: string) => {
    addColorWeight(weights, color, 1)
    return _match
  })
  source.replace(/\bfill=["']([^"']+)["']/gi, (_match, color: string) => {
    addColorWeight(weights, color, 1)
    return _match
  })

  return Array.from(weights.entries()).sort(
    (left, right) => right[1] - left[1],
  )[0]?.[0]
}

async function inferAssetSwatch(cwd: string, assetPath: string) {
  if (path.extname(assetPath).toLowerCase() !== '.svg') return '#6b7280'

  try {
    return inferSvgSwatch(await readFile(path.resolve(cwd, assetPath), 'utf8')) ?? '#6b7280'
  } catch {
    return '#6b7280'
  }
}

function commonAssetParts(filePaths: string[]) {
  const partSets = filePaths.map((filePath) => new Set(assetNameParts(filePath)))
  const [firstParts] = partSets

  if (!firstParts) return new Set<string>()

  return new Set(
    Array.from(firstParts).filter((part) =>
      partSets.every((parts) => parts.has(part)),
    ),
  )
}

function variantPartsForAsset(filePath: string, commonParts: Set<string>) {
  return assetNameParts(filePath).filter(
    (part) => !commonParts.has(part) && !ignoredMarkVariantTokens.has(part),
  )
}

function uniqueKey(baseKey: string, usedKeys: Set<string>) {
  const fallback = baseKey || 'variant'
  let key = fallback
  let index = 2

  while (usedKeys.has(key)) {
    key = `${fallback}-${index}`
    index += 1
  }

  usedKeys.add(key)

  return key
}

async function inferBannerMarkVariants(
  cwd: string,
  logoDir: string,
  colors: BrandKitSocialBannersConfig['colors'],
): Promise<BrandKitSocialBannersConfig['markVariants']> {
  const absoluteLogoDir = path.resolve(cwd, logoDir)
  const files = await readBrandAssetFiles(absoluteLogoDir)
  const relativeFiles = files.map((file) => toPosixPath(path.relative(cwd, file)))
  const svgFiles = relativeFiles.filter(
    (file) => path.extname(file).toLowerCase() === '.svg',
  )
  const candidates = svgFiles.length ? svgFiles : relativeFiles
  const variants: BrandKitSocialBannersConfig['markVariants'] = []

  function colorAliases(color: BrandKitSocialBannersConfig['colors'][number]) {
    const parts = `${color.key} ${color.label}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .filter(
        (part) =>
          part.length >= 3 && !['brand', 'color', 'colour'].includes(part),
      )

    if (/^#(?:fff|ffffff)$/i.test(color.hex)) parts.push('white')
    if (/^#(?:000|000000|05070b)$/i.test(color.hex)) parts.push('black')

    return Array.from(new Set(parts))
  }

  function colorForParts(parts: string[]) {
    return colors.find((color) =>
      colorAliases(color).some((alias) => parts.includes(alias)),
    )
  }

  async function inferColorAssetChoices(markCandidates: string[]) {
    const commonParts = commonAssetParts(markCandidates)
    const usedKeys = new Set<string>()
    const choices = await Promise.all(
      markCandidates.map(async (candidate) => {
        const parts = variantPartsForAsset(candidate, commonParts)
        const color = colorForParts(parts)
        const namedColorToken = Object.keys(namedMarkVariantColors).find((token) =>
          parts.includes(token),
        ) as keyof typeof namedMarkVariantColors | undefined
        const namedColor = namedColorToken
          ? namedMarkVariantColors[namedColorToken]
          : null
        const variantKey = parts.length ? slugFromTokens(parts) : 'default'
        const keyBase =
          color?.key ??
          namedColorToken ??
          variantKey
        const key = uniqueKey(keyBase, usedKeys)
        const label =
          color?.label ??
          namedColor?.label ??
          (parts.length ? titleFromTokens(parts) : 'Default')
        const hex =
          color?.hex ??
          namedColor?.hex ??
          (await inferAssetSwatch(cwd, candidate))
        const colorIndex = color ? colors.indexOf(color) : -1
        const namedIndex = namedColorToken
          ? Object.keys(namedMarkVariantColors).indexOf(namedColorToken)
          : -1
        const rank =
          parts.length === 0
            ? 0
            : colorIndex >= 0
              ? 10 + colorIndex
              : namedIndex >= 0
                ? 50 + namedIndex
                : 100

        return {
          assetPath: candidate,
          option: { hex, key, label },
          rank,
        }
      }),
    )

    choices.sort(
      (left, right) =>
        left.rank - right.rank ||
        left.option.label.localeCompare(right.option.label) ||
        left.assetPath.localeCompare(right.assetPath),
    )

    const colorAssets: Record<string, string> = {}
    const colorOptions = choices.map((choice) => {
      colorAssets[choice.option.key] = choice.assetPath

      return choice.option
    })

    return {
      assetPath: choices[0]?.assetPath ?? markCandidates[0],
      colorAssets,
      colorOptions,
    }
  }

  async function addVariant({
    key,
    label,
    markCandidates,
    scale,
  }: {
    key: string
    label: string
    markCandidates: string[]
    scale: number
  }) {
    if (!markCandidates.length) return

    const { assetPath, colorAssets, colorOptions } =
      await inferColorAssetChoices(markCandidates)
    const colorKeys = colorOptions.map((option) => option.key)

    variants.push({
      key,
      label,
      assetPath,
      ...(colorKeys.length ? { colorAssets, colorKeys, colorOptions } : {}),
      scale,
    })
  }

  await addVariant({
    key: 'logo',
    label: 'Logo',
    markCandidates: candidates.filter(isLogoPath),
    scale: 0.34,
  })
  await addVariant({
    key: 'wordmark',
    label: 'Wordmark',
    markCandidates: candidates.filter(isWordmarkPath),
    scale: 0.26,
  })
  await addVariant({
    key: 'icon',
    label: 'Icon',
    markCandidates: candidates.filter(isIconPath),
    scale: 0.18,
  })

  if (!variants.length) {
    variants.push({
      assetPath: candidates[0] ?? path.posix.join(toPosixPath(logoDir), 'logo.svg'),
      key: 'logo',
      label: 'Logo',
      scale: 0.34,
    })
  }

  return variants
}

async function inferBannerColors(
  cwd: string,
  colorSource: BrandKitColorSource,
): Promise<{ key: string; label: string; hex: string }[]> {
  let colors: BrandKitColor[] = []

  try {
    colors = await loadBrandKitColors({ sources: [colorSource] }, cwd)
  } catch {
    colors = []
  }

  const [first, second, third] = colors

  return [
    {
      key: 'primary',
      label: first?.name ?? 'Primary',
      hex: first?.hex ?? '#0d2249',
    },
    {
      key: 'accent',
      label: second?.name ?? 'Accent',
      hex: second?.hex ?? '#4784de',
    },
    {
      key: 'light',
      label: third?.name ?? 'Light',
      hex: third?.hex ?? '#ffffff',
    },
  ]
}

async function collectInitAnswers(cwd: string, args: string[]) {
  const yes = hasFlag(args, '--yes') || hasFlag(args, '-y')
  const interactive = !yes && Boolean(process.stdin.isTTY && process.stdout.isTTY)
  const rl = interactive
    ? createInterface({ input: process.stdin, output: process.stdout })
    : null
  const packageJson = await readPackageJson(cwd)
  const defaultBrandName = packageJson?.value.name
    ? titleFromPackageName(packageJson.value.name)
    : 'Acme Studio'

  if (hasOption(args, '--framework')) {
    rl?.close()
    throw new Error(
      'Unknown option: --framework. Open BrandKit init currently supports Next.js App Router projects only. Additional installation paths are planned.',
    )
  }

  const brandName = await prompt(
    'Brand name',
    getFlagValue(args, '--brand') ?? defaultBrandName,
    { enabled: interactive && !getFlagValue(args, '--brand'), rl },
  )
  const shortName = await prompt(
    'Short brand name',
    getFlagValue(args, '--short-name') ?? brandName.split(/\s+/)[0] ?? brandName,
    { enabled: interactive && !getFlagValue(args, '--short-name'), rl },
  )
  const logoDir = await prompt(
    'Logo directory',
    getFlagValue(args, '--logos') ?? (await detectLogoDir(cwd)),
    { enabled: interactive && !getFlagValue(args, '--logos'), rl },
  )
  const colorPath = await prompt(
    'Colors file',
    getFlagValue(args, '--colors') ?? (await detectColorPath(cwd)),
    { enabled: interactive && !getFlagValue(args, '--colors'), rl },
  )
  const route = await prompt('Brand Kit route', getFlagValue(args, '--route') ?? '/brandkit', {
    enabled: interactive && !getFlagValue(args, '--route'),
    rl,
  })
  const appDir = await prompt(
    'Next app directory',
    getFlagValue(args, '--app-dir') ??
      (await detectAppDir(cwd, packageJson?.value.name)),
    { enabled: interactive && !getFlagValue(args, '--app-dir'), rl },
  )
  const configPath = path.resolve(
    cwd,
    getFlagValue(args, '--config') ?? 'brandkit.config.ts',
  )
  const shouldBuild =
    hasFlag(args, '--build') ||
    (yes && !hasFlag(args, '--no-build')) ||
    (await promptBoolean('Run build now', true, {
      enabled: interactive && !hasFlag(args, '--no-build'),
      rl,
    }))

  rl?.close()

  return {
    appDir,
    brandName,
    colorPath: toPosixPath(colorPath),
    configPath,
    logoDir: toPosixPath(logoDir),
    route,
    shortName,
    shouldBuild,
  } satisfies InitAnswers
}

async function makeConfig(cwd: string, answers: InitAnswers): Promise<BrandKitConfig> {
  const colorSource = colorSourceFromPath(answers.colorPath)
  const bannerColors = await inferBannerColors(cwd, colorSource)
  const bannerMarkVariants = await inferBannerMarkVariants(
    cwd,
    answers.logoDir,
    bannerColors,
  )
  const defaultMarkColor =
    bannerMarkVariants[0]?.colorOptions?.[0]?.key ??
    bannerMarkVariants[0]?.colorKeys?.[0] ??
    'light'

  return {
    brand: {
      name: answers.brandName,
      shortName: answers.shortName,
      description: `Approved assets, colors, avatars, and social banners for ${answers.brandName}.`,
    },
    route: answers.route,
    logos: {
      sourceDir: answers.logoDir,
      groups: [
        {
          key: 'logo-lockups',
          label: 'Logo Lockups',
          match: ['logo'],
          description: 'Primary logo lockups in approved colorways.',
        },
        {
          key: 'wordmarks',
          label: 'Wordmarks',
          match: ['wordmark', 'word-mark', 'word'],
          description: 'Text-first marks for wide placements.',
        },
        {
          key: 'icons',
          label: 'Icons',
          match: ['icon', 'symbol', 'favicon', 'brand-mark'],
          description: 'Symbol-only marks for compact surfaces.',
        },
      ],
    },
    colors: {
      sources: [colorSource],
    },
    socialBanners: {
      markVariants: bannerMarkVariants,
      colors: bannerColors,
      presets: [
        {
          key: 'x-profile-header',
          label: 'X / Twitter profile header',
          width: 1500,
          height: 500,
          backgroundColor: 'primary',
          accentColor: 'accent',
          markColor: defaultMarkColor,
          secondaryColor: 'light',
          pattern: 'diagonal-sweep',
        },
        {
          key: 'linkedin-personal-background',
          label: 'LinkedIn personal background',
          width: 1584,
          height: 396,
          backgroundColor: 'primary',
          accentColor: 'accent',
          markColor: defaultMarkColor,
          secondaryColor: 'light',
          pattern: 'radial-glow',
        },
        {
          key: 'linkedin-organization-cover',
          label: 'LinkedIn organization cover',
          width: 4200,
          height: 700,
          backgroundColor: 'primary',
          accentColor: 'accent',
          markColor: defaultMarkColor,
          secondaryColor: 'light',
          pattern: 'wave',
        },
        {
          key: 'facebook-page-cover',
          label: 'Facebook page cover',
          width: 851,
          height: 315,
          backgroundColor: 'primary',
          accentColor: 'accent',
          markColor: defaultMarkColor,
          secondaryColor: 'light',
          pattern: 'split-field',
        },
      ],
    },
  }
}

function configSource(config: BrandKitConfig) {
  return `import { defineBrandKitConfig } from 'open-brandkit'

export default defineBrandKitConfig(${JSON.stringify(config, null, 2)})
`
}

async function writeGeneratedFile({
  content,
  created,
  filePath,
  force,
  skipped,
}: {
  content: string
  created: string[]
  filePath: string
  force: boolean
  skipped: string[]
}) {
  if ((await pathExists(filePath)) && !force) {
    skipped.push(filePath)
    return
  }

  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, content)
  created.push(filePath)
}

function pageRouteSource(configImport: string) {
  return `import { BrandKitPage, getBrandKitNextPageProps } from 'open-brandkit/next'

import config from '${configImport}'

export default async function BrandKitRoute() {
  const props = await getBrandKitNextPageProps(config)
  const route = config.route ?? '/brandkit'

  return (
    <BrandKitPage
      {...props}
      endpoints={{
        bannerPresets: \`\${route}/banners/presets\`,
        bannerUpload: \`\${route}/banners\`,
        favicon: \`\${route}/favicon\`,
      }}
    />
  )
}
`
}

function faviconRouteSource(configImport: string) {
  return `import { createBrandKitFaviconHandler } from 'open-brandkit/next/server'

import config from '${configImport}'

export const runtime = 'nodejs'
export const { POST } = createBrandKitFaviconHandler(config)
`
}

function bannerUploadRouteSource(configImport: string) {
  return `import { createBrandKitBannerUploadHandler } from 'open-brandkit/next/server'

import config from '${configImport}'

export const runtime = 'nodejs'
export const { POST } = createBrandKitBannerUploadHandler(config)
`
}

function bannerPresetRouteSource(configImport: string) {
  return `import { createBrandKitBannerPresetHandler } from 'open-brandkit/next/server'

import config from '${configImport}'

export const runtime = 'nodejs'
export const { POST } = createBrandKitBannerPresetHandler(config)
`
}

function downloadRouteSource() {
  return `import { createBrandKitDownloadHandler } from 'open-brandkit/next/server'

export const runtime = 'nodejs'
export const { GET } = createBrandKitDownloadHandler()
`
}

function layoutRouteSource() {
  return `import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Brand Kit',
}

export default function BrandKitLayout({ children }: { children: ReactNode }) {
  return children
}
`
}

async function writeNextAdapterFiles({
  answers,
  configPath,
  created,
  cwd,
  force,
  skipped,
}: {
  answers: InitAnswers
  configPath: string
  created: string[]
  cwd: string
  force: boolean
  skipped: string[]
}) {
  const routeDir = path.join(cwd, answers.appDir, ...routeToSegments(answers.route))
  const pagePath = path.join(routeDir, 'page.tsx')
  const faviconPath = path.join(routeDir, 'favicon', 'route.ts')
  const bannerUploadPath = path.join(routeDir, 'banners', 'route.ts')
  const bannerPresetPath = path.join(routeDir, 'banners', 'presets', 'route.ts')
  const downloadPath = path.join(routeDir, 'download', '[group]', 'route.ts')
  const layoutPath = path.join(routeDir, 'layout.tsx')

  await writeGeneratedFile({
    content: pageRouteSource(importPath(pagePath, configPath)),
    created,
    filePath: pagePath,
    force,
    skipped,
  })
  await writeGeneratedFile({
    content: faviconRouteSource(importPath(faviconPath, configPath)),
    created,
    filePath: faviconPath,
    force,
    skipped,
  })
  await writeGeneratedFile({
    content: bannerUploadRouteSource(importPath(bannerUploadPath, configPath)),
    created,
    filePath: bannerUploadPath,
    force,
    skipped,
  })
  await writeGeneratedFile({
    content: bannerPresetRouteSource(importPath(bannerPresetPath, configPath)),
    created,
    filePath: bannerPresetPath,
    force,
    skipped,
  })
  await writeGeneratedFile({
    content: downloadRouteSource(),
    created,
    filePath: downloadPath,
    force,
    skipped,
  })
  await writeGeneratedFile({
    content: layoutRouteSource(),
    created,
    filePath: layoutPath,
    force,
    skipped,
  })
}

function getTailwindSourceDirective(cssPath: string, cwd: string) {
  let sourcePath = toPosixPath(
    path.relative(
      path.dirname(cssPath),
      path.join(cwd, 'node_modules', 'open-brandkit', 'dist'),
    ),
  )

  if (!sourcePath.startsWith('.')) {
    sourcePath = `./${sourcePath}`
  }

  return `@source "${sourcePath}";`
}

function getTailwindContentGlob(configPath: string, cwd: string) {
  let sourcePath = toPosixPath(
    path.relative(
      path.dirname(configPath),
      path.join(cwd, 'node_modules', 'open-brandkit', 'dist'),
    ),
  )

  if (!sourcePath.startsWith('.')) {
    sourcePath = `./${sourcePath}`
  }

  return `${sourcePath}/**/*.{js,mjs}`
}

function resolveCssImportPath(cwd: string, fromFile: string, importPath: string) {
  if (importPath.startsWith('@/')) {
    return path.join(cwd, 'src', importPath.slice(2))
  }

  if (importPath.startsWith('~/')) {
    return path.join(cwd, importPath.slice(2))
  }

  if (importPath.startsWith('/')) {
    return path.join(cwd, importPath.slice(1))
  }

  if (importPath.startsWith('.')) {
    return path.resolve(path.dirname(fromFile), importPath)
  }

  return null
}

function getCssImports(source: string) {
  const imports: string[] = []
  const importPattern =
    /import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+\.css)['"]/g
  let match: RegExpExecArray | null

  while ((match = importPattern.exec(source))) {
    imports.push(match[1])
  }

  return imports
}

function isTailwindCssSource(source: string) {
  return (
    source.includes('@import "tailwindcss"') ||
    source.includes("@import 'tailwindcss'")
  )
}

async function findImportedTailwindCssPath(cwd: string, appDir: string) {
  const layoutCandidates = [
    path.join(cwd, appDir, 'layout.tsx'),
    path.join(cwd, appDir, 'layout.jsx'),
    path.join(cwd, appDir, 'layout.ts'),
    path.join(cwd, appDir, 'layout.js'),
    path.join(cwd, 'src/app/layout.tsx'),
    path.join(cwd, 'src/app/layout.jsx'),
    path.join(cwd, 'src/app/layout.ts'),
    path.join(cwd, 'src/app/layout.js'),
    path.join(cwd, 'app/layout.tsx'),
    path.join(cwd, 'app/layout.jsx'),
    path.join(cwd, 'app/layout.ts'),
    path.join(cwd, 'app/layout.js'),
  ]

  for (const layoutPath of Array.from(new Set(layoutCandidates))) {
    if (!(await pathExists(layoutPath))) continue

    const layoutSource = await readFile(layoutPath, 'utf8')

    for (const cssImport of getCssImports(layoutSource)) {
      const cssPath = resolveCssImportPath(cwd, layoutPath, cssImport)

      if (!cssPath || !(await pathExists(cssPath))) continue

      const cssSource = await readFile(cssPath, 'utf8')

      if (isTailwindCssSource(cssSource)) return cssPath
    }
  }

  return null
}

async function findTailwindCssPath(cwd: string, appDir: string) {
  const importedCssPath = await findImportedTailwindCssPath(cwd, appDir)

  if (importedCssPath) return importedCssPath

  const candidates = [
    path.join(cwd, appDir, 'globals.css'),
    path.join(cwd, appDir, 'global.css'),
    path.join(cwd, 'src/app/globals.css'),
    path.join(cwd, 'src/app/global.css'),
    path.join(cwd, 'app/globals.css'),
    path.join(cwd, 'app/global.css'),
    path.join(cwd, 'src/styles/tailwind.css'),
    path.join(cwd, 'src/styles/globals.css'),
    path.join(cwd, 'styles/tailwind.css'),
    path.join(cwd, 'styles/globals.css'),
  ]

  for (const candidate of Array.from(new Set(candidates))) {
    if (!(await pathExists(candidate))) continue

    const source = await readFile(candidate, 'utf8')

    if (isTailwindCssSource(source)) {
      return candidate
    }
  }

  return null
}

async function findPostcssConfigPath(cwd: string) {
  const candidates = [
    '.postcssrc.json',
    'postcss.config.json',
    '.postcssrc.js',
    'postcss.config.js',
    'postcss.config.cjs',
  ].map((fileName) => path.join(cwd, fileName))

  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate
  }

  return null
}

async function ensureTailwindPostcssConfig({
  created,
  cwd,
  skipped,
}: {
  created: string[]
  cwd: string
  skipped: string[]
}) {
  const existingConfigPath = await findPostcssConfigPath(cwd)

  if (!existingConfigPath) {
    const configPath = path.join(cwd, 'postcss.config.cjs')
    const source = `const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

module.exports = config
`

    await writeFile(configPath, source)
    created.push(configPath)
    return
  }

  const source = await readFile(existingConfigPath, 'utf8')

  if (source.includes('@tailwindcss/postcss')) {
    skipped.push(existingConfigPath)
    return
  }

  const nextSource = source.replace(
    /(plugins\s*:\s*\{)/,
    "$1\n    '@tailwindcss/postcss': {},",
  )

  if (nextSource === source) {
    skipped.push(existingConfigPath)
    return
  }

  await writeFile(existingConfigPath, nextSource)
  created.push(existingConfigPath)
}

async function ensureLayoutImportsCss({
  created,
  cssImport,
  layoutPath,
  skipped,
}: {
  created: string[]
  cssImport: string
  layoutPath: string
  skipped: string[]
}) {
  if (!(await pathExists(layoutPath))) return

  const source = await readFile(layoutPath, 'utf8')

  if (
    source.includes(`'${cssImport}'`) ||
    source.includes(`"${cssImport}"`)
  ) {
    skipped.push(layoutPath)
    return
  }

  await writeFile(layoutPath, `import '${cssImport}'\n${source}`)

  if (!created.includes(layoutPath)) created.push(layoutPath)
}

async function createRouteTailwindCss({
  created,
  cwd,
  layoutPath,
  routeDir,
  skipped,
}: {
  created: string[]
  cwd: string
  layoutPath: string
  routeDir: string
  skipped: string[]
}) {
  const cssPath = path.join(routeDir, 'open-brandkit.css')
  const directive = getTailwindSourceDirective(cssPath, cwd)
  const source = `@import "tailwindcss";
${directive}
`

  if (await pathExists(cssPath)) {
    const existingSource = await readFile(cssPath, 'utf8')

    if (existingSource.includes('open-brandkit')) {
      skipped.push(cssPath)
    } else {
      await writeFile(cssPath, `${existingSource.trimEnd()}\n${directive}\n`)
      created.push(cssPath)
    }
  } else {
    await mkdir(path.dirname(cssPath), { recursive: true })
    await writeFile(cssPath, source)
    created.push(cssPath)
  }

  await ensureLayoutImportsCss({
    created,
    cssImport: './open-brandkit.css',
    layoutPath,
    skipped,
  })
  await ensureTailwindPostcssConfig({ created, cwd, skipped })
}

async function findTailwindConfigPaths(cwd: string) {
  const candidates = [
    'tailwind.config.ts',
    'tailwind.config.js',
    'tailwind.config.mjs',
    'tailwind.config.cjs',
  ].map((fileName) => path.join(cwd, fileName))
  const existing: string[] = []

  for (const candidate of candidates) {
    if (await pathExists(candidate)) existing.push(candidate)
  }

  return existing
}

async function updateTailwindConfigContent({
  created,
  cwd,
  skipped,
}: {
  created: string[]
  cwd: string
  skipped: string[]
}) {
  const configPaths = await findTailwindConfigPaths(cwd)
  let updated = false

  for (const configPath of configPaths) {
    const source = await readFile(configPath, 'utf8')
    const contentGlob = getTailwindContentGlob(configPath, cwd)

    if (source.includes('open-brandkit/dist')) {
      skipped.push(configPath)
      updated = true
      continue
    }

    const nextSource = source.replace(
      /(content\s*:\s*\[)([\s\S]*?)(\n\s*\])/,
      (_match, start: string, body: string, end: string) =>
        `${start}${body}\n    '${contentGlob}',${end}`,
    )

    if (nextSource === source) continue

    await writeFile(configPath, nextSource)
    created.push(configPath)
    updated = true
  }

  return updated
}

async function updateTailwindSource({
  appDir,
  created,
  cwd,
  route,
  skipped,
}: {
  appDir: string
  created: string[]
  cwd: string
  route: string
  skipped: string[]
}) {
  if (await updateTailwindConfigContent({ created, cwd, skipped })) {
    return
  }

  const cssPath = await findTailwindCssPath(cwd, appDir)

  if (!cssPath) {
    const routeDir = path.join(cwd, appDir, ...routeToSegments(route))

    await createRouteTailwindCss({
      created,
      cwd,
      layoutPath: path.join(routeDir, 'layout.tsx'),
      routeDir,
      skipped,
    })
    return
  }

  const source = await readFile(cssPath, 'utf8')
  const directive = getTailwindSourceDirective(cssPath, cwd)

  if (source.includes('open-brandkit') || source.includes(directive)) {
    skipped.push(cssPath)
    return
  }

  const nextSource = `${source.trimEnd()}\n${directive}\n`

  await writeFile(cssPath, nextSource)
  created.push(cssPath)
}

async function updatePackageJson({
  created,
  cwd,
  force,
  skipped,
}: {
  created: string[]
  cwd: string
  force: boolean
  skipped: string[]
}) {
  const packageJson = await readPackageJson(cwd)

  if (!packageJson) return

  const ownPackage = await readOwnPackageJson()
  const packageName = ownPackage.name ?? 'open-brandkit'
  const packageVersion =
    ownPackage.version && ownPackage.version !== '0.0.0'
      ? `^${ownPackage.version}`
      : 'latest'
  const scripts = packageJson.value.scripts ?? {}
  const dependencies = packageJson.value.dependencies ?? {}
  const devDependencies = packageJson.value.devDependencies ?? {}
  const nextPackageValue = {
    ...packageJson.value,
    scripts: {
      ...scripts,
      'brandkit:build':
        scripts['brandkit:build'] && !force
          ? scripts['brandkit:build']
          : 'open-brandkit build',
    },
    dependencies:
      packageJson.value.name === packageName || dependencies[packageName]
        ? dependencies
        : {
            ...dependencies,
            [packageName]: packageVersion,
          },
    devDependencies:
      dependencies.tailwindcss || devDependencies.tailwindcss
        ? devDependencies
        : {
            ...devDependencies,
            '@tailwindcss/postcss': '^4.0.0',
            tailwindcss: '^4.0.0',
          },
  }

  if (JSON.stringify(nextPackageValue) === JSON.stringify(packageJson.value)) {
    skipped.push(packageJson.path)
    return
  }

  await writeFile(packageJson.path, `${JSON.stringify(nextPackageValue, null, 2)}\n`)
  created.push(packageJson.path)
}

async function detectInstallCommand(cwd: string) {
  if (await pathExists(path.join(cwd, 'pnpm-lock.yaml'))) {
    return { command: 'pnpm', args: ['install'] }
  }

  if (await pathExists(path.join(cwd, 'yarn.lock'))) {
    return { command: 'yarn', args: ['install'] }
  }

  if (
    (await pathExists(path.join(cwd, 'bun.lock'))) ||
    (await pathExists(path.join(cwd, 'bun.lockb')))
  ) {
    return { command: 'bun', args: ['install'] }
  }

  return { command: 'npm', args: ['install'] }
}

async function runCommand(command: string, args: string[], cwd: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}.`))
    })
    child.on('error', reject)
  })
}

async function initProject(cwd: string, args: string[]): Promise<InitResult> {
  const force = hasFlag(args, '--force')
  const answers = await collectInitAnswers(cwd, args)
  const config = await makeConfig(cwd, answers)
  const created: string[] = []
  const skipped: string[] = []

  await writeGeneratedFile({
    content: configSource(config),
    created,
    filePath: answers.configPath,
    force,
    skipped,
  })

  await writeNextAdapterFiles({
    answers,
    configPath: answers.configPath,
    created,
    cwd,
    force,
    skipped,
  })
  await updateTailwindSource({
    appDir: answers.appDir,
    created,
    cwd,
    route: answers.route,
    skipped,
  })

  await updatePackageJson({ created, cwd, force, skipped })

  if (hasFlag(args, '--install')) {
    const install = await detectInstallCommand(cwd)

    await runCommand(install.command, install.args, cwd)
  }

  if (answers.shouldBuild) {
    const configForBuild =
      skipped.includes(answers.configPath) && !force
        ? await loadConfig(answers.configPath)
        : config

    await buildBrandKit(configForBuild, { cwd })
  }

  return {
    config,
    configPath: answers.configPath,
    created,
    skipped,
  }
}

async function main() {
  const [, , command = 'help', ...args] = process.argv
  const cwd = process.cwd()

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp()
    return
  }

  if (command === 'init' || command === 'install') {
    const result = await initProject(cwd, args)

    for (const filePath of result.created) {
      console.log(`Created ${path.relative(cwd, filePath)}`)
    }

    for (const filePath of result.skipped) {
      console.log(`Skipped existing ${path.relative(cwd, filePath)}`)
    }

    console.log(`Brand Kit route: ${result.config.route ?? '/brandkit'}`)
    console.log('Run npm run brandkit:build after changing logos or colors.')
    return
  }

  if (command === 'build') {
    const ownPackage = await readOwnPackageJson()
    const configPath = await findConfigPath(cwd, getFlagValue(args, '--config'))
    const config = await loadConfig(configPath)
    const result = await buildBrandKit(config, { cwd })

    console.log(
      `Built with ${ownPackage.name ?? 'open-brandkit'}@${ownPackage.version ?? 'latest'}`,
    )
    console.log(`Generated ${path.relative(cwd, result.sitePath)}`)
    console.log(`Generated ${path.relative(cwd, result.manifestPath)}`)
    console.log(`Wrote ${result.writtenFiles.length} files`)
    return
  }

  printHelp()
  throw new Error(`Unknown command: ${command}`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Open BrandKit failed.'

  console.error(message)
  process.exitCode = 1
})
