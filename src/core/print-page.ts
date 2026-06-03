import type {
  BrandKitAsset,
  BrandKitAssetGroup,
  BrandKitColor,
  BrandKitManifest,
  BrandKitPrintColor,
  BrandKitPrintColorGroup,
} from './types.js'

export type PrintableBrandKitPageOptions = {
  autoPrint?: boolean
  showToolbar?: boolean
}

type Rgb = {
  blue: number
  green: number
  red: number
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function normalizeHexColor(value?: string) {
  if (!value) return null

  const trimmed = value.trim().replace(/^#/, '')

  if (/^[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed
      .split('')
      .map((character) => character + character)
      .join('')}`.toUpperCase()
  }

  if (/^[0-9a-f]{6}$/i.test(trimmed)) return `#${trimmed}`.toUpperCase()

  return null
}

function hexToRgb(value: string): Rgb {
  const hex = normalizeHexColor(value) ?? '#000000'

  return {
    blue: Number.parseInt(hex.slice(5, 7), 16),
    green: Number.parseInt(hex.slice(3, 5), 16),
    red: Number.parseInt(hex.slice(1, 3), 16),
  }
}

function rgbToCmyk({ blue, green, red }: Rgb) {
  const normalizedRed = red / 255
  const normalizedGreen = green / 255
  const normalizedBlue = blue / 255
  const black = 1 - Math.max(normalizedRed, normalizedGreen, normalizedBlue)

  if (black === 1) return ['0', '0', '0', '100']

  const cyan = ((1 - normalizedRed - black) / (1 - black)) * 100
  const magenta = ((1 - normalizedGreen - black) / (1 - black)) * 100
  const yellow = ((1 - normalizedBlue - black) / (1 - black)) * 100

  return [cyan, magenta, yellow, black * 100].map((amount) =>
    Number.isInteger(amount) ? String(amount) : amount.toFixed(1),
  )
}

function colorChannelToLinear(channel: number) {
  const normalized = channel / 255

  if (normalized <= 0.03928) return normalized / 12.92

  return ((normalized + 0.055) / 1.055) ** 2.4
}

function relativeLuminance({ blue, green, red }: Rgb) {
  return (
    0.2126 * colorChannelToLinear(red) +
    0.7152 * colorChannelToLinear(green) +
    0.0722 * colorChannelToLinear(blue)
  )
}

function swatchTextClass(hex: string) {
  return relativeLuminance(hexToRgb(hex)) > 0.48 ? 'tone-dark' : 'tone-light'
}

function rgbLabel({ blue, green, red }: Rgb) {
  return `${red}, ${green}, ${blue}`
}

function cmykLabel(cmyk: string[]) {
  return cmyk.join(', ')
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

function findLogoAsset(manifest: BrandKitManifest) {
  const preferredGroup =
    manifest.assetGroups.find((group) =>
      /logo|lockup/i.test(`${group.key} ${group.label}`),
    ) ?? manifest.assetGroups[0]

  return preferredGroup?.items[0] ?? null
}

function findIconAsset(manifest: BrandKitManifest) {
  const preferredGroup = manifest.assetGroups.find((group) =>
    /icon|symbol|favicon|brandmark/i.test(`${group.key} ${group.label}`),
  )

  if (preferredGroup?.items[0]) return preferredGroup.items[0]

  return (
    manifest.assetGroups
      .flatMap((group) => group.items)
      .find((asset) =>
        /icon|symbol|favicon|brandmark/i.test(
          `${asset.id} ${asset.title} ${asset.previewUrl}`,
        ),
      ) ?? null
  )
}

function logoPreviewToneClass(asset: BrandKitAsset) {
  return asset.previewTone === 'dark' ? 'preview-dark' : 'preview-light'
}

function renderLogoImage(asset: BrandKitAsset | null, className: string) {
  if (!asset) return ''

  return `<img class="${className}" src="${escapeHtml(asset.previewUrl)}" alt="${escapeHtml(asset.title)}" />`
}

function renderFooter(manifest: BrandKitManifest, rightLabel: string) {
  return `
    <div class="footer-rule">
      <span>${escapeHtml(manifest.brand.name)}</span>
      <span>${escapeHtml(rightLabel)}</span>
    </div>
  `
}

function renderLogoCard(asset: BrandKitAsset) {
  return `
    <article class="logo-card">
      <div class="logo-preview ${logoPreviewToneClass(asset)}">
        <img src="${escapeHtml(asset.previewUrl)}" alt="${escapeHtml(asset.title)}" />
      </div>
      <div class="logo-meta">
        <p class="logo-title">${escapeHtml(asset.title)}</p>
        <p class="logo-files">${escapeHtml(
          asset.downloads.map((download) => download.fileName).join(' / '),
        )}</p>
      </div>
    </article>
  `
}

function renderLogoGroup(group: BrandKitAssetGroup) {
  return `
    <section class="logo-group">
      <div class="logo-group-heading">
        <p class="eyebrow">Approved marks</p>
        <h2>${escapeHtml(group.label)}</h2>
        ${group.description ? `<p>${escapeHtml(group.description)}</p>` : ''}
      </div>
      <div class="logo-card-grid">${group.items.map(renderLogoCard).join('')}</div>
    </section>
  `
}

function renderLogoSheet({
  groupChunk,
  logoAsset,
  manifest,
  pageIndex,
}: {
  groupChunk: BrandKitAssetGroup[]
  logoAsset: BrandKitAsset | null
  manifest: BrandKitManifest
  pageIndex: number
}) {
  const continued = pageIndex > 0 ? ` ${pageIndex + 1}` : ''

  return `
    <section class="sheet kit-cover">
      <header class="kit-cover-header">
        <div class="kit-cover-title">
          <p class="eyebrow">Complete brand kit${continued}</p>
          <h1>${escapeHtml(manifest.brand.name)} Brand Kit</h1>
        </div>
        <div class="logo-box">
          ${renderLogoImage(logoAsset, '')}
        </div>
      </header>
      <div class="logo-groups">${groupChunk.map(renderLogoGroup).join('')}</div>
      ${renderFooter(manifest, 'Approved logos and icons')}
    </section>
  `
}

function renderBrandColorCard(color: BrandKitColor) {
  const rgb = hexToRgb(color.hex)
  const cmyk = color.cmyk ?? cmykLabel(rgbToCmyk(rgb))

  return `
    <article class="brand-card ${swatchTextClass(color.hex)}" style="--swatch:${escapeHtml(color.hex)}">
      <div class="brand-card-surface">
        <p class="brand-label">${escapeHtml(color.name)}</p>
        <p class="brand-hex">${escapeHtml((normalizeHexColor(color.hex) ?? color.hex).toUpperCase())}</p>
      </div>
      <div class="brand-card-details">
        <p>Core digital color for web, product, and brand support use.</p>
        <dl>
          <div><dt>RGB</dt><dd>${escapeHtml(color.rgb ?? rgbLabel(rgb))}</dd></div>
          <div><dt>CMYK approx.</dt><dd>${escapeHtml(cmyk)}</dd></div>
        </dl>
      </div>
    </article>
  `
}

function renderBrandColorSheet({
  colors,
  logoAsset,
  manifest,
  pageIndex,
  pageTotal,
}: {
  colors: BrandKitColor[]
  logoAsset: BrandKitAsset | null
  manifest: BrandKitManifest
  pageIndex: number
  pageTotal: number
}) {
  const pageLabel =
    pageTotal > 1 ? `Core Brand Colors ${pageIndex + 1}` : 'Core Brand Colors'

  return `
    <section class="sheet">
      <header class="page-header">
        <div class="page-title">
          <p class="eyebrow">Digital and identity colors</p>
          <h2>${escapeHtml(pageLabel)}</h2>
          <p>
            Hex and RGB are the primary digital values. CMYK values are included
            as starting points for print proofing.
          </p>
        </div>
        ${renderLogoImage(logoAsset, 'small-logo')}
      </header>
      <div class="brand-grid">${colors.map(renderBrandColorCard).join('')}</div>
      ${renderFooter(manifest, 'Digital color values')}
    </section>
  `
}

function renderPrintColorCard(color: BrandKitPrintColor) {
  return `
    <article class="print-card ${swatchTextClass(color.hex)}" style="--swatch:${escapeHtml(color.hex)}">
      <div class="print-card-chip">
        <p class="print-pms">${escapeHtml(color.pantone)}</p>
        <p class="print-hex">${escapeHtml((normalizeHexColor(color.hex) ?? color.hex).toUpperCase())}</p>
      </div>
      <dl class="print-card-meta">
        <div><dt>RGB</dt><dd>${escapeHtml(cmykLabel(color.rgb))}</dd></div>
        <div><dt>CMYK</dt><dd>${escapeHtml(cmykLabel(color.cmyk))}</dd></div>
      </dl>
    </article>
  `
}

function renderPrintColorGroup(group: BrandKitPrintColorGroup) {
  return `
    <section class="print-group">
      <div class="print-group-heading">
        <p class="eyebrow">Pantone / Print</p>
        <h2>${escapeHtml(group.label)}</h2>
      </div>
      <div class="print-card-grid">${group.items.map(renderPrintColorCard).join('')}</div>
    </section>
  `
}

function renderPrintColorSheet({
  groupChunk,
  logoAsset,
  manifest,
  pageIndex,
}: {
  groupChunk: BrandKitPrintColorGroup[]
  logoAsset: BrandKitAsset | null
  manifest: BrandKitManifest
  pageIndex: number
}) {
  const pageLabel = String(pageIndex + 1).padStart(2, '0')

  return `
    <section class="sheet print-sheet">
      <header class="page-header">
        <div class="page-title">
          <p class="eyebrow">Physical production palette</p>
          <h2>Print Shade Families ${pageLabel}</h2>
          <p>
            Use these print color references for apparel, packaging, merch, labels,
            and other physical production work.
          </p>
        </div>
        ${renderLogoImage(logoAsset, 'small-logo')}
      </header>
      <div class="print-layout">
        ${groupChunk.map(renderPrintColorGroup).join('')}
      </div>
      ${renderFooter(manifest, 'Pantone / RGB / CMYK / Hex')}
    </section>
  `
}

function renderAutoPrintScript(autoPrint: boolean) {
  return `
    <script>
      document.getElementById('print-action')?.addEventListener('click', () => window.print());
      ${
        autoPrint
          ? `window.addEventListener('load', () => {
              const printNow = () => window.setTimeout(() => window.print(), 120);
              if (document.fonts?.ready) {
                document.fonts.ready.then(printNow).catch(printNow);
              } else {
                printNow();
              }
            });`
          : ''
      }
    </script>
  `
}

const printPageStyles = `
:root {
  color-scheme: light;
  --ink: #2b333f;
  --muted: #65707a;
  --line: #d9d9d9;
  --soft-line: #e0e0e0;
  --paper: #ffffff;
  --warm: #faf8f4;
  --wash: #eef2f6;
}
* {
  box-sizing: border-box;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
html {
  background: var(--wash);
}
body {
  margin: 0;
  background: var(--wash);
  color: var(--ink);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
img {
  display: block;
  max-width: 100%;
}
h1,
h2,
h3,
p {
  margin: 0;
}
dl {
  display: grid;
  gap: 0.04in;
  margin: 0;
}
dt {
  color: #6f7881;
  font-size: 0.064in;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
dd {
  margin: 0;
  color: #28333f;
  font-size: 0.078in;
  font-weight: 680;
}
.print-toolbar {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid #d8dee8;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(10px);
}
.toolbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: min(100%, 1120px);
  min-height: 64px;
  margin: 0 auto;
  padding: 0 24px;
}
.toolbar-inner p {
  color: #4b5563;
  font-size: 13px;
}
.button {
  appearance: none;
  border: 1px solid #1f2937;
  border-radius: 6px;
  background: #1f2937;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 650;
  line-height: 1;
  padding: 11px 14px;
}
.button:hover {
  background: #111827;
}
.print-shell {
  display: grid;
  gap: 24px;
  justify-content: center;
  padding: 24px;
}
.sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 11in;
  height: 8.5in;
  overflow: hidden;
  padding: 0.34in;
  page-break-after: always;
  background: #ffffff;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.18);
}
.sheet:last-child {
  page-break-after: auto;
}
.kit-cover {
  gap: 0.22in;
  color: #2b333f;
}
.kit-cover-header,
.page-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.4in;
}
.kit-cover-title {
  max-width: 6.2in;
}
.eyebrow {
  margin-bottom: 0.08in;
  color: var(--muted);
  font-size: 0.095in;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.kit-cover h1 {
  max-width: 6.6in;
  color: #2b333f;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.44in;
  font-weight: 400;
  letter-spacing: -0.015em;
  line-height: 1;
}
.logo-box {
  display: flex;
  width: 2.15in;
  min-height: 0.74in;
  flex: 0 0 auto;
  align-items: flex-start;
  justify-content: flex-end;
}
.logo-box img {
  width: 100%;
  max-height: 0.95in;
  object-fit: contain;
  object-position: top right;
}
.logo-groups {
  position: relative;
  z-index: 1;
  display: grid;
  flex: 1;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.14in;
  min-height: 0;
}
.logo-group {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border: 1px solid var(--line);
  background: #ffffff;
}
.logo-group-heading {
  padding: 0.13in 0.13in 0.1in;
  border-bottom: 1px solid var(--soft-line);
}
.logo-group-heading h2 {
  color: #2b333f;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.2in;
  font-weight: 400;
  line-height: 1;
}
.logo-group-heading p:not(.eyebrow) {
  margin-top: 0.05in;
  color: var(--muted);
  font-size: 0.072in;
  line-height: 1.3;
}
.logo-card-grid {
  display: grid;
  flex: 1;
  grid-auto-rows: minmax(0, 1fr);
  min-height: 0;
}
.logo-card {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-height: 0;
  border-bottom: 1px solid var(--soft-line);
  background: #ffffff;
}
.logo-card:last-child {
  border-bottom: 0;
}
.logo-preview {
  display: flex;
  min-height: 0.68in;
  align-items: center;
  justify-content: center;
  padding: 0.12in;
}
.logo-preview.preview-light {
  background: #ffffff;
}
.logo-preview.preview-dark {
  background: #2b333f;
}
.logo-preview img {
  width: auto;
  max-width: 100%;
  max-height: 0.44in;
  object-fit: contain;
}
.logo-meta {
  padding: 0.08in 0.1in 0.09in;
  background: var(--warm);
}
.logo-title {
  color: #2b333f;
  font-size: 0.074in;
  font-weight: 800;
  line-height: 1.15;
}
.logo-files {
  margin-top: 0.025in;
  color: var(--muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 0.052in;
  line-height: 1.25;
}
.page-header {
  gap: 0.24in;
  margin-bottom: 0.2in;
}
.page-title h2 {
  color: #2b333f;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.33in;
  font-weight: 400;
  line-height: 1;
}
.page-title p:not(.eyebrow) {
  margin-top: 0.08in;
  max-width: 5.7in;
  color: #62717f;
  font-size: 0.1in;
  line-height: 1.45;
}
.small-logo {
  width: 1.35in;
  max-height: 0.7in;
  object-fit: contain;
  object-position: top right;
}
.brand-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.12in;
}
.brand-card {
  display: grid;
  grid-template-rows: 1.42in 1fr;
  min-height: 2.5in;
  overflow: hidden;
  border: 1px solid #dfdfdf;
  background: #ffffff;
}
.brand-card-surface {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0.14in;
  background: var(--swatch);
}
.brand-card.tone-light .brand-card-surface,
.print-card.tone-light {
  color: #ffffff;
}
.brand-card.tone-dark .brand-card-surface,
.print-card.tone-dark {
  color: #1d2733;
}
.brand-label {
  font-size: 0.14in;
  font-weight: 790;
  line-height: 1;
}
.brand-hex {
  margin-top: 0.05in;
  font-size: 0.088in;
  font-weight: 760;
  letter-spacing: 0.075em;
}
.brand-card-details {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.13in;
  color: #56616c;
  font-size: 0.077in;
  line-height: 1.38;
}
.print-layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.14in;
  min-height: 0;
}
.print-group {
  display: flex;
  min-height: 5.62in;
  flex-direction: column;
  border: 1px solid var(--line);
  background: #ffffff;
}
.print-group-heading {
  padding: 0.13in 0.13in 0.1in;
  border-bottom: 1px solid var(--soft-line);
}
.print-group-heading h2 {
  color: #2b333f;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.22in;
  font-weight: 400;
}
.print-card-grid {
  display: grid;
  flex: 1;
  grid-auto-rows: minmax(0, 1fr);
}
.print-card {
  display: grid;
  grid-template-columns: 0.94in 1fr;
  min-height: 0.66in;
  background: #ffffff;
  border-bottom: 1px solid #d2d2d2;
}
.print-card:last-child {
  border-bottom: 0;
}
.print-card-chip {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0.08in;
  background: var(--swatch);
}
.print-pms {
  font-size: 0.082in;
  font-weight: 800;
  line-height: 1.05;
}
.print-hex {
  margin-top: 0.025in;
  font-size: 0.058in;
  font-weight: 820;
  letter-spacing: 0.06em;
}
.print-card-meta {
  display: grid;
  grid-template-columns: 0.75fr 1fr;
  align-content: center;
  gap: 0.05in;
  padding: 0.07in 0.08in;
  background: var(--warm);
}
.print-card-meta dt {
  margin-bottom: 0.015in;
  font-size: 0.052in;
}
.print-card-meta dd {
  font-size: 0.062in;
  line-height: 1.15;
}
.footer-rule {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 0.1in;
  color: #6b737b;
  font-size: 0.068in;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}
@page {
  size: Letter landscape;
  margin: 0;
}
@media print {
  html,
  body {
    background: #ffffff;
  }
  .print-toolbar {
    display: none !important;
  }
  .print-shell {
    display: block;
    padding: 0;
  }
  .sheet {
    box-shadow: none;
  }
}
@media screen and (max-width: 980px) {
  .print-shell {
    justify-content: start;
    overflow-x: auto;
  }
}
`

export function generatePrintableBrandKitPage(
  manifest: BrandKitManifest,
  options: PrintableBrandKitPageOptions = {},
) {
  const faviconAsset = findIconAsset(manifest)
  const logoAsset = findLogoAsset(manifest)
  const logoSheets = chunk(manifest.assetGroups, 3).map((groupChunk, index) =>
    renderLogoSheet({ groupChunk, logoAsset, manifest, pageIndex: index }),
  )
  const brandColorSheets = chunk(manifest.brandColors, 8).map((colors, index, pages) =>
    renderBrandColorSheet({
      colors,
      logoAsset,
      manifest,
      pageIndex: index,
      pageTotal: pages.length,
    }),
  )
  const printColorSheets = chunk(manifest.printColorGroups ?? [], 3).map(
    (groupChunk, index) =>
      renderPrintColorSheet({
        groupChunk,
        logoAsset,
        manifest,
        pageIndex: index,
      }),
  )
  const showToolbar = options.showToolbar ?? true

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(manifest.brand.name)} Brand Kit PDF</title>
    ${
      faviconAsset
        ? `<link rel="icon" href="${escapeHtml(faviconAsset.previewUrl)}" />`
        : ''
    }
    <style>${printPageStyles}</style>
  </head>
  <body>
    ${
      showToolbar
        ? `<div class="print-toolbar">
      <div class="toolbar-inner">
        <p>Use your browser print dialog and choose Save as PDF.</p>
        <button class="button" id="print-action" type="button">Print / Save PDF</button>
      </div>
    </div>`
        : ''
    }
    <main class="print-shell">
      ${logoSheets.join('')}
      ${brandColorSheets.join('')}
      ${printColorSheets.join('')}
    </main>
    ${renderAutoPrintScript(Boolean(options.autoPrint))}
  </body>
</html>
`
}
