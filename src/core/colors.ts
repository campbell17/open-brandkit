import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type {
  BrandKitColor,
  BrandKitColorConfig,
  BrandKitColorSection,
  BrandKitColorSource,
  BrandKitPrintColorGroup,
} from './types.js'

const brandColorsHeading = '## Brand Colors'
const printColorShadesHeading = '## Print Color Shades'

export function normalizeHexColor(value: string) {
  const trimmed = value.trim()

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed
  }

  if (/^[0-9a-f]{6}$/i.test(trimmed)) {
    return `#${trimmed}`
  }

  return null
}

function parseMarkdownCells(line: string) {
  return line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim())
}

function isSeparatorRow(cells: string[]) {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, '')))
}

function getHeadingLevel(heading: string) {
  return heading.match(/^#{1,6}(?=\s+)/)?.[0].length ?? 6
}

function findNextSiblingHeadingIndex(section: string, headingLevel: number) {
  const headingPattern = /^#{1,6}\s+/gm
  let match: RegExpExecArray | null

  while ((match = headingPattern.exec(section))) {
    if (getHeadingLevel(match[0]) <= headingLevel) {
      return match.index
    }
  }

  return -1
}

function getMarkdownSection(
  markdown: string,
  sectionHeading?: string,
  endHeading?: string,
) {
  if (!sectionHeading) return markdown

  const headingIndex = markdown.indexOf(sectionHeading)

  if (headingIndex === -1) return ''

  const afterHeading = markdown.slice(headingIndex + sectionHeading.length)
  const headingLevel = getHeadingLevel(sectionHeading)
  const explicitEndIndex = endHeading ? afterHeading.indexOf(endHeading) : -1
  const nextHeadingIndex =
    explicitEndIndex === -1
      ? findNextSiblingHeadingIndex(afterHeading, headingLevel)
      : explicitEndIndex

  return nextHeadingIndex === -1
    ? afterHeading
    : afterHeading.slice(0, nextHeadingIndex)
}

function getDefaultMarkdownColorSection(markdown: string) {
  if (!markdown.includes(printColorShadesHeading)) return markdown

  const brandSection = getMarkdownSection(
    markdown,
    brandColorsHeading,
    printColorShadesHeading,
  )

  if (brandSection.trim()) return brandSection

  return markdown.slice(0, markdown.indexOf(printColorShadesHeading))
}

function getMarkdownHeadingLabel(sectionHeading?: string) {
  return sectionHeading?.replace(/^#{1,6}\s+/, '').trim() || 'Brand Colors'
}

function getMarkdownAfterHeading(markdown: string, sectionHeading: string) {
  const headingIndex = markdown.indexOf(sectionHeading)

  if (headingIndex === -1) return ''

  return markdown.slice(headingIndex + sectionHeading.length)
}

function normalizeColorRow(row: Record<string, string>): BrandKitColor | null {
  const lowerCaseEntries = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.toLowerCase(), value]),
  )
  const name = lowerCaseEntries.name?.trim()
  const hex = normalizeHexColor(lowerCaseEntries.hex ?? '')

  if (!name || !hex) return null

  return {
    name,
    hex,
    rgb: lowerCaseEntries.rgb?.trim() || undefined,
    cmyk: lowerCaseEntries.cmyk?.trim() || undefined,
  }
}

export function parseMarkdownColorTable(
  markdown: string,
  sectionHeading?: string,
): BrandKitColor[] {
  const section = sectionHeading
    ? getMarkdownSection(markdown, sectionHeading)
    : getDefaultMarkdownColorSection(markdown)
  const rows = section
    .split(/\r?\n/g)
    .filter((line) => line.trim().startsWith('|'))
    .map(parseMarkdownCells)
    .filter((cells) => cells.length > 0)
    .filter((cells) => !isSeparatorRow(cells))

  const [headers, ...bodyRows] = rows

  if (!headers) return []

  return bodyRows
    .map((cells) => {
      const row = Object.fromEntries(
        headers.map((header, index) => [header, cells[index] ?? '']),
      )

      return normalizeColorRow(row)
    })
    .filter((color): color is BrandKitColor => Boolean(color))
}

function splitMarkdownSubsections(section: string, defaultLabel: string) {
  const headingPattern = /^#{3,6}\s+(.+?)\s*$/gm
  const matches = Array.from(section.matchAll(headingPattern))

  if (!matches.length) {
    return [
      {
        label: defaultLabel,
        content: section,
      },
    ]
  }

  const subsections: { label: string; content: string }[] = []
  const firstHeadingIndex = matches[0]?.index ?? 0
  const leadingContent = section.slice(0, firstHeadingIndex)

  if (leadingContent.includes('|')) {
    subsections.push({
      label: defaultLabel,
      content: leadingContent,
    })
  }

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]
    const nextMatch = matches[index + 1]

    if (!match) continue

    const start = (match.index ?? 0) + match[0].length
    const end = nextMatch?.index ?? section.length

    subsections.push({
      label: match[1]?.trim() || defaultLabel,
      content: section.slice(start, end),
    })
  }

  return subsections
}

function normalizeColorSectionLabel(label: string) {
  const trimmed = label.trim()

  if (/^brand colors?$/i.test(trimmed)) return 'Primary'

  return trimmed.replace(/\s+colors?$/i, '')
}

function getColorSectionColumns(label: string): 1 | 2 | 3 {
  const normalized = normalizeColorSectionLabel(label)

  if (/^primary$/i.test(normalized)) return 2

  return 3
}

function chunkColorNames(colors: BrandKitColor[], columns: 1 | 2 | 3) {
  const rows: string[][] = []

  for (let index = 0; index < colors.length; index += columns) {
    rows.push(colors.slice(index, index + columns).map((color) => color.name))
  }

  return rows
}

export function parseMarkdownColorSections(
  markdown: string,
  sectionHeading = brandColorsHeading,
): BrandKitColorSection[] {
  const section = getMarkdownSection(
    markdown,
    sectionHeading,
    printColorShadesHeading,
  )

  if (!section.trim()) return []

  const colorSections: BrandKitColorSection[] = []
  const subsections = splitMarkdownSubsections(
    section,
    getMarkdownHeadingLabel(sectionHeading),
  )

  for (const subsection of subsections) {
    const colors = parseMarkdownColorTable(subsection.content)

    if (!colors.length) continue

    const label = normalizeColorSectionLabel(subsection.label)
    const columns = getColorSectionColumns(label)

    colorSections.push({
      label,
      columns,
      rows: chunkColorNames(colors, columns),
    })
  }

  return colorSections
}

function splitMarkdownIntoBlocks(section: string) {
  return section
    .trim()
    .split(/\r?\n\s*\r?\n/g)
    .map((block) =>
      block
        .split(/\r?\n/g)
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .filter((block) => block.length > 0)
}

function parseTableRows(lines: string[]) {
  return lines
    .filter((line) => line.startsWith('|'))
    .map(parseMarkdownCells)
    .filter((cells) => cells.length > 0)
    .filter((cells) => !isSeparatorRow(cells))
    .filter((cells) => {
      const firstCell = cells[0]?.toLowerCase() ?? ''

      return firstCell !== 'name' && firstCell !== 'pms'
    })
}

function parseColorComponents(value: string) {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function buildFallbackPrintLabel(rows: string[][]) {
  const first = rows[0]?.[0] ?? 'Print'
  const last = rows.at(-1)?.[0] ?? first

  return first === last ? `Series ${first}` : `Series ${first} to ${last}`
}

export function parseMarkdownPrintColorGroups(
  markdown: string,
  sectionHeading = printColorShadesHeading,
): BrandKitPrintColorGroup[] {
  const printSection = getMarkdownAfterHeading(markdown, sectionHeading)

  if (!printSection.trim()) return []

  const printBlocks = splitMarkdownIntoBlocks(printSection)
  const printColorGroups: BrandKitPrintColorGroup[] = []
  let pendingLabel: string | null = null

  for (const block of printBlocks) {
    if (block.length === 1 && /^#{3,6}\s+/.test(block[0] ?? '')) {
      pendingLabel = block[0]?.replace(/^#{3,6}\s+/, '').trim() ?? null
      continue
    }

    const rows = parseTableRows(block).filter((row) => row.length >= 4)

    if (!rows.length) continue

    const label = pendingLabel ?? buildFallbackPrintLabel(rows)
    pendingLabel = null

    printColorGroups.push({
      label,
      items: rows
        .map((row) => {
          const [pantone = '', rgb = '', cmyk = '', rawHex = ''] = row
          const hex = normalizeHexColor(rawHex)

          if (!pantone || !hex) return null

          return {
            pantone,
            hex,
            rgb: parseColorComponents(rgb),
            cmyk: parseColorComponents(cmyk),
          }
        })
        .filter((color): color is BrandKitPrintColorGroup['items'][number] =>
          Boolean(color),
        ),
    })
  }

  return printColorGroups.filter((group) => group.items.length > 0)
}

function parseDelimitedRows(source: string, delimiter: ',' | '\t') {
  return source
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(delimiter).map((cell) => cell.trim()))
}

export function parseCsvColorTable(csv: string): BrandKitColor[] {
  const delimiter = csv.includes('\t') ? '\t' : ','
  const rows = parseDelimitedRows(csv, delimiter)
  const [headers, ...bodyRows] = rows

  if (!headers) return []

  return bodyRows
    .map((cells) => {
      const row = Object.fromEntries(
        headers.map((header, index) => [header, cells[index] ?? '']),
      )

      return normalizeColorRow(row)
    })
    .filter((color): color is BrandKitColor => Boolean(color))
}

export function parseJsonColorSource(json: string): BrandKitColor[] {
  const parsed = JSON.parse(json) as unknown
  const colors = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed && 'colors' in parsed
      ? (parsed as { colors: unknown }).colors
      : []

  if (!Array.isArray(colors)) return []

  return colors
    .map((color) => {
      if (!color || typeof color !== 'object') return null

      return normalizeColorRow(color as Record<string, string>)
    })
    .filter((color): color is BrandKitColor => Boolean(color))
}

async function loadColorSource(
  source: BrandKitColorSource,
  projectRoot: string,
) {
  if (source.type === 'literal') {
    return source.colors
  }

  const file = await readFile(path.resolve(projectRoot, source.path), 'utf8')

  if (source.type === 'markdown-table') {
    return parseMarkdownColorTable(file, source.sectionHeading)
  }

  if (source.type === 'json') {
    return parseJsonColorSource(file)
  }

  return parseCsvColorTable(file)
}

async function loadColorSectionsFromSource(
  source: BrandKitColorSource,
  projectRoot: string,
) {
  if (source.type !== 'markdown-table') return []

  const file = await readFile(path.resolve(projectRoot, source.path), 'utf8')

  return parseMarkdownColorSections(file, source.sectionHeading)
}

export async function loadBrandKitColors(
  config: BrandKitColorConfig,
  projectRoot: string,
) {
  const colors = (
    await Promise.all(
      config.sources.map((source) => loadColorSource(source, projectRoot)),
    )
  ).flat()
  const deduped = new Map<string, BrandKitColor>()

  for (const color of colors) {
    deduped.set(color.name, color)
  }

  return Array.from(deduped.values())
}

export async function loadBrandKitColorSections(
  config: BrandKitColorConfig,
  projectRoot: string,
  fallbackColors: BrandKitColor[],
) {
  if (config.sections?.length) return config.sections

  const sections = (
    await Promise.all(
      config.sources.map((source) =>
        loadColorSectionsFromSource(source, projectRoot),
      ),
    )
  ).flat()

  return sections.length ? sections : createDefaultColorSections(fallbackColors)
}

async function loadPrintColorSource(
  source: BrandKitColorSource,
  projectRoot: string,
) {
  if (source.type !== 'markdown-table') return []

  const file = await readFile(path.resolve(projectRoot, source.path), 'utf8')

  return parseMarkdownPrintColorGroups(file)
}

export async function loadBrandKitPrintColorGroups(
  config: BrandKitColorConfig,
  projectRoot: string,
) {
  return (
    await Promise.all(
      config.sources.map((source) => loadPrintColorSource(source, projectRoot)),
    )
  ).flat()
}

export function createDefaultColorSections(
  colors: BrandKitColor[],
): BrandKitColorSection[] {
  if (!colors.length) return []

  return [
    {
      label: 'Primary',
      columns: 2,
      rows: chunkColorNames(colors, 2),
    },
  ]
}
