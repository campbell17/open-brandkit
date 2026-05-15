import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type {
  BrandKitColor,
  BrandKitColorConfig,
  BrandKitColorSection,
  BrandKitColorSource,
} from './types.js'

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

function getMarkdownSection(markdown: string, sectionHeading?: string) {
  if (!sectionHeading) return markdown

  const headingIndex = markdown.indexOf(sectionHeading)

  if (headingIndex === -1) return ''

  const afterHeading = markdown.slice(headingIndex + sectionHeading.length)
  const nextHeadingIndex = afterHeading.search(/\n#{1,6}\s+/)

  return nextHeadingIndex === -1
    ? afterHeading
    : afterHeading.slice(0, nextHeadingIndex)
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
  const rows = getMarkdownSection(markdown, sectionHeading)
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

export function createDefaultColorSections(
  colors: BrandKitColor[],
): BrandKitColorSection[] {
  if (!colors.length) return []

  const rows: string[][] = []

  for (let index = 0; index < colors.length; index += 3) {
    rows.push(colors.slice(index, index + 3).map((color) => color.name))
  }

  return [
    {
      label: 'Primary',
      rows,
    },
  ]
}
