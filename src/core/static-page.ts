import type {
  BrandKitAsset,
  BrandKitAssetGroup,
  BrandKitColor,
  BrandKitManifest,
  BrandKitPrintColor,
  BrandKitPrintColorGroup,
} from './types.js'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeJsonForHtml(value: unknown) {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}

function fileNameFromUrl(url?: string) {
  const pathName = url?.split('#')[0]?.split('?')[0]
  const fileName = pathName?.split('/').filter(Boolean).pop()

  return fileName?.includes('.') ? fileName : undefined
}

function npmPackageVersionUrl(packageName: string, version: string) {
  return `https://www.npmjs.com/package/${encodeURIComponent(packageName)}/v/${encodeURIComponent(version)}`
}

const deterministicIntro =
  'Approved marks, avatar-ready presets, social profile assets, and the current color system.'

const pageStyles = `
:root {
  color-scheme: light;
  --ink: #020617;
  --muted: #64748b;
  --copy: #475569;
  --line: #e2e8f0;
  --neutral-line: #e5e5e5;
  --neutral: #737373;
  --surface: #ffffff;
  --wash: #f8fafc;
  --dark: #2b333f;
  --dark-hover: #1d232b;
  --favicon: #0d2249;
  --brand-primary: #0d2249;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--wash);
  color: var(--ink);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
a { color: inherit; }
.wrap {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding-right: 16px;
  padding-left: 16px;
}
.header {
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}
.header-inner {
  display: grid;
  gap: 40px;
  padding-top: 48px;
  padding-bottom: 48px;
}
.brand-link,
.eyebrow {
  margin: 0;
  color: var(--neutral);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2em;
  line-height: 1.3;
  text-decoration: none;
  text-transform: uppercase;
}
.brand-link:hover { color: #0a0a0a; }
.brand-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.brand-link .icon {
  width: 14px;
  height: 14px;
}
.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  margin-top: 12px;
}
h1 {
  margin: 0;
  color: var(--ink);
  font-size: 48px;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1;
}
.copy {
  max-width: 672px;
  margin: 16px 0 0;
  color: var(--copy);
  font-size: 16px;
  line-height: 1.75;
}
.version-label {
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
  text-decoration: none;
  text-underline-offset: 4px;
}
.version-label:hover { color: var(--ink); text-decoration: underline; }
.nav,
.button-row,
.group-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.nav { margin-top: 32px; }
.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #404040;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  text-underline-offset: 4px;
}
.nav-link:hover {
  color: #0a0a0a;
  text-decoration: underline;
}
.nav-arrow,
.icon {
  display: inline-block;
  flex: 0 0 auto;
  stroke-width: 2;
}
.nav-arrow {
  width: 14px;
  height: 14px;
}
.icon {
  width: 16px;
  height: 16px;
}
.copy-icon {
  width: 14px;
  height: 14px;
}
.asset-count {
  color: var(--muted);
  font-size: 14px;
}
.hero-media {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.hero-asset {
  display: flex;
  aspect-ratio: 673 / 489;
  width: 100%;
  max-width: 320px;
  align-items: center;
  justify-content: center;
}
.hero-asset img,
.footer-logo img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.section-muted {
  border-bottom: 1px solid var(--line);
  background: var(--wash);
}
.section {
  background: var(--surface);
}
.section-banners {
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: var(--wash);
}
.section-inner {
  padding-top: 56px;
  padding-bottom: 56px;
}
.section-heading {
  max-width: 672px;
}
.section-heading-row {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.section-heading-actions {
  flex: 0 0 auto;
}
.section-heading h2 {
  margin: 12px 0 0;
  color: var(--ink);
  font-size: 36px;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1.1;
}
.section-heading p:last-child {
  margin: 16px 0 0;
  color: var(--copy);
  font-size: 16px;
  line-height: 1.75;
}
.stack {
  display: flex;
  flex-direction: column;
  gap: 48px;
  margin-top: 40px;
}
.group,
.avatar,
.banner-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.group-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.group h3,
.avatar h3,
.color-group h3 {
  margin: 0;
  color: var(--ink);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
}
.group p,
.avatar p,
.color-group p,
.banner-group p {
  margin: 4px 0 0;
  color: var(--copy);
  font-size: 14px;
  line-height: 1.5;
}
.asset-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
.card,
.color-card,
.banner-card {
  overflow: hidden;
  border: 1px solid var(--neutral-line);
  border-radius: 8px;
  background: var(--surface);
}
.card {
  display: flex;
  height: 100%;
  flex-direction: column;
}
.checker {
  background-color: #f7f7f7;
  background-image: repeating-conic-gradient(#ececec 0% 25%, #f8f8f8 0% 50%);
  background-position: 50%;
  background-size: 20px 20px;
}
.asset-preview {
  display: flex;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--neutral-line);
  padding: 40px 24px;
  cursor: zoom-in;
  transition: opacity 160ms ease;
}
.asset-preview:hover { opacity: 0.9; }
.preview-dark {
  background: var(--dark);
  background-image: none;
}
.asset-preview img {
  display: block;
  width: auto;
  max-width: 100%;
  max-height: 112px;
  object-fit: contain;
}
.card-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
}
.card h4,
.color-card h4,
.banner-card h4 {
  margin: 0;
  color: #171717;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}
.button,
.copy-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px solid #d4d4d4;
  border-radius: 6px;
  background: var(--surface);
  color: #262626;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.2;
  text-decoration: none;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}
.button {
  min-height: 36px;
  padding: 8px 12px;
}
.button:hover {
  border-color: #a3a3a3;
  background: #fafafa;
}
.button-dark {
  border-color: var(--dark);
  background: var(--dark);
  color: #ffffff;
}
.button-dark,
.button-dark * {
  color: #ffffff;
}
.button-dark:hover {
  border-color: var(--dark-hover);
  background: var(--dark-hover);
  color: #ffffff;
}
.button-favicon {
  border-color: var(--favicon);
  background: var(--favicon);
  color: #ffffff;
}
.button-favicon:hover {
  border-color: #1e293b;
  background: #1e293b;
  color: #ffffff;
}
.copy-button {
  min-height: 30px;
  border-color: var(--neutral-line);
  padding: 6px 10px;
  color: #404040;
  font-size: 12px;
}
.avatar-grid {
  display: grid;
  gap: 20px;
}
.avatar-controls {
  position: relative;
  display: grid;
  gap: 48px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  padding: 24px;
}
.reset-button {
  position: absolute;
  top: 12px;
  left: 12px;
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}
.control-group {
  display: flex;
  width: max-content;
  max-width: 100%;
  flex-direction: column;
  gap: 16px;
  justify-self: center;
}
.control-title,
.color-section-title,
.banner-group h3 {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.3;
  text-transform: uppercase;
}
.chip-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px 12px;
}
.chip {
  display: flex;
  width: 64px;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 0;
  text-align: center;
}
.chip-preview {
  display: flex;
  aspect-ratio: 1;
  width: 64px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: var(--surface);
}
.chip.is-selected .chip-preview {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px #2563eb, 0 0 0 4px #ffffff;
}
.chip-label {
  width: 64px;
  color: #334155;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.35;
}
.chip-preview img {
  display: block;
  max-width: 42px;
  max-height: 42px;
  object-fit: contain;
}
.shape-sample {
  display: block;
  width: 32px;
  height: 32px;
  background: var(--favicon);
}
.border-sample {
  display: block;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: var(--surface);
}
.avatar-divider { display: none; }
.avatar-preview {
  display: flex;
  min-height: 320px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  padding: 20px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(15,23,42,0.06);
}
.avatar-surface {
  display: flex;
  aspect-ratio: 1;
  width: 100%;
  max-width: 256px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.avatar-surface canvas {
  display: block;
  aspect-ratio: 1;
  width: 100%;
  height: auto;
}
.avatar-range {
  display: flex;
  width: 100%;
  max-width: 256px;
  flex-direction: column;
  gap: 12px;
}
.avatar-range span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.avatar-range input {
  width: 100%;
  cursor: pointer;
  accent-color: var(--brand-primary);
}
.custom-color-label {
  display: flex;
  width: 100%;
  max-width: 220px;
  flex-direction: column;
  gap: 8px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.custom-color-label[hidden] { display: none; }
.custom-color-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.custom-color-row input[type="color"] {
  width: 40px;
  height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  cursor: pointer;
  padding: 3px;
}
.custom-color-row input[type="text"] {
  min-width: 0;
  flex: 1;
  height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  letter-spacing: 0;
  padding: 0 10px;
  text-transform: none;
}
.status {
  min-height: 20px;
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
}
.color-group { margin-top: 48px; }
.color-sections,
.color-section,
.color-rows {
  display: flex;
  flex-direction: column;
}
.color-sections { gap: 16px; margin-top: 20px; }
.color-section { gap: 12px; }
.color-rows { gap: 16px; }
.color-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
.swatch {
  height: 112px;
  width: 100%;
  border-bottom: 1px solid var(--neutral-line);
}
.color-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}
.print-colors {
  display: flex;
  flex-direction: column;
  gap: 32px;
  margin-top: 48px;
}
.print-intro h3 {
  margin: 0;
  color: var(--ink);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
}
.print-family h4 {
  margin: 0;
  color: var(--ink);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}
.print-intro p {
  margin: 4px 0 0;
  color: var(--copy);
  font-size: 14px;
  line-height: 1.5;
}
.print-family {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.print-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.print-card {
  position: relative;
  min-width: 0;
}
.print-card:hover,
.print-card:focus-within {
  z-index: 50;
}
.print-chip {
  overflow: hidden;
  border: 1px solid var(--neutral-line);
  border-radius: 6px;
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(15,23,42,0.06);
}
.print-swatch {
  display: block;
  aspect-ratio: 1;
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--neutral-line);
  cursor: pointer;
}
.print-swatch:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.print-chip-body {
  padding: 6px 10px 10px;
  text-align: left;
}
.print-kicker {
  margin: 0;
  color: var(--muted);
  font-weight: 600;
  letter-spacing: 0.12em;
  line-height: 1.3;
  text-transform: uppercase;
}
.print-chip .print-kicker {
  font-size: 10px;
}
.print-popover-chip .print-kicker {
  font-size: 9px;
}
.print-value-group > .print-kicker {
  font-size: 12px;
}
.print-pantone {
  margin: 2px 0 0;
  color: var(--ink);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
}
.print-popover {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 40;
  display: none;
  width: max-content;
  min-width: 256px;
  max-width: calc(100vw - 32px);
  padding-top: 8px;
}
.print-card:hover .print-popover,
.print-card:focus-within .print-popover {
  display: block;
}
.print-popover-panel {
  position: relative;
  border: 1px solid var(--neutral-line);
  border-radius: 8px;
  background: var(--surface);
  padding: 16px;
  text-align: left;
  box-shadow: 0 20px 40px rgba(15,23,42,0.18);
}
.print-popover-chip {
  position: absolute;
  top: 12px;
  right: 12px;
  border: 1px solid var(--neutral-line);
  border-radius: 6px;
  background: var(--surface);
  padding: 6px 10px;
  text-align: right;
  box-shadow: 0 1px 2px rgba(15,23,42,0.08);
}
.print-values {
  display: flex;
  max-width: 180px;
  flex-direction: column;
  gap: 12px;
}
.print-value-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.print-copy-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.print-copy-icon {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  color: #a3a3a3;
  stroke-width: 2;
}
.print-component-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.print-copy-value,
.print-component-copy {
  border: 0;
  background: transparent;
  color: #262626;
  cursor: pointer;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 20px;
  padding: 0;
  text-align: left;
  transition: color 160ms ease;
}
.print-component-copy {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.print-copy-value:hover,
.print-component-copy:hover {
  color: #3a89c0;
  text-decoration: underline;
}
.print-channel {
  color: var(--muted);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 11px;
  font-weight: 700;
}
.banner-stack {
  display: flex;
  flex-direction: column;
  gap: 40px;
  margin-top: 48px;
}
.banner-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.banner-card {
  max-width: 100%;
}
.banner-preview {
  width: 100%;
  overflow: hidden;
  border-bottom: 1px solid var(--neutral-line);
  background: #f1f5f9;
}
.banner-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.banner-card-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}
.banner-card p {
  margin: 4px 0 0;
  color: var(--neutral);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.5;
}
.footer {
  border-top: 1px solid var(--line);
  background: var(--surface);
}
.footer-inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 32px;
  padding-bottom: 32px;
}
.footer-logo {
  display: flex;
  width: 160px;
  height: 48px;
  align-items: center;
}
.footer p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}
.lightbox[hidden] { display: none; }
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 120;
  overflow-y: auto;
  background: rgba(0,0,0,0.7);
  padding: 16px;
}
.lightbox-align {
  display: flex;
  min-height: 100%;
  align-items: center;
  justify-content: center;
}
.lightbox-panel {
  width: 100%;
  max-width: 1024px;
  overflow: hidden;
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35);
}
.lightbox-preview {
  display: flex;
  min-height: 60vh;
  align-items: center;
  justify-content: center;
  background: #f7f7f7;
  padding: 40px 32px;
}
.lightbox-checker {
  max-width: 100%;
  overflow: auto;
  border: 1px solid #d4d4d4;
  border-radius: 6px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
}
.lightbox-checker img {
  display: block;
  width: auto;
  max-width: 100%;
  max-height: 70vh;
  height: auto;
}
.lightbox-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-top: 1px solid var(--neutral-line);
  padding: 20px;
}
.lightbox-title {
  margin: 0;
  color: #171717;
  font-size: 18px;
  font-weight: 600;
}
.lightbox-file {
  margin: 4px 0 0;
  color: var(--neutral);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
}
.shape-square { border-radius: 0; }
.shape-rounded { border-radius: 22%; }
.shape-round { border-radius: 999px; }
@media (min-width: 640px) {
  .wrap { padding-right: 24px; padding-left: 24px; }
  .asset-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .group-header {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
  .section-heading-row {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
  .color-row-2,
  .color-row-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .print-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .lightbox { padding: 32px; }
  .lightbox-body {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
@media (min-width: 768px) {
  .avatar-controls {
    grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
  }
  .avatar-divider {
    position: relative;
    display: block;
    align-self: stretch;
    grid-column: 2;
    grid-row: 1 / span 3;
  }
  .avatar-divider::before {
    position: absolute;
    top: -12px;
    bottom: -12px;
    left: 50%;
    width: 1px;
    content: "";
    transform: translateX(-50%);
    background: linear-gradient(to bottom, transparent, var(--line), transparent);
  }
  .avatar-left { grid-column: 1; }
  .avatar-right { grid-column: 3; }
  .avatar-row-1 { grid-row: 1; }
  .avatar-row-2 { grid-row: 2; }
  .avatar-row-3 { grid-row: 3; }
  .footer-inner {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .footer p { text-align: right; }
}
@media (min-width: 1024px) {
  .wrap { padding-right: 32px; padding-left: 32px; }
  .header-inner {
    grid-template-columns: minmax(0, 1fr) 360px;
    align-items: center;
  }
  .hero-media { justify-content: flex-end; }
  .asset-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .avatar-grid {
    grid-template-columns: minmax(0, 1fr) 384px;
    align-items: stretch;
  }
  .color-row-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .print-grid { grid-template-columns: repeat(7, minmax(0, 1fr)); }
}
@media (min-width: 1280px) {
  .print-grid { grid-template-columns: repeat(10, minmax(0, 1fr)); }
}
`

function lucideIcon(name: string, className = 'icon') {
  const paths: Record<string, string> = {
    'align-center':
      '<path d="M21 5H3" /><path d="M17 12H7" /><path d="M19 19H5" />',
    'align-left':
      '<path d="M21 5H3" /><path d="M15 12H3" /><path d="M17 19H3" />',
    'align-right':
      '<path d="M21 5H3" /><path d="M21 12H9" /><path d="M21 19H7" />',
    'arrow-down': '<path d="M12 5v14" /><path d="m19 12-7 7-7-7" />',
    'arrow-left': '<path d="m12 19-7-7 7-7" /><path d="M19 12H5" />',
    copy:
      '<rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />',
    download:
      '<path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" />',
    'rotate-ccw':
      '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />',
    upload:
      '<path d="M12 3v12" /><path d="m17 8-5-5-5 5" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />',
  }

  return `<svg class="${className}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name] ?? paths.download}</svg>`
}

function renderDownloadButtons(downloads: BrandKitAsset['downloads']) {
  return downloads
    .map(
      (download) => `
        <a class="button button-dark" href="${escapeHtml(download.url)}" download="${escapeHtml(download.fileName)}">
          ${lucideIcon('download')}
          <span>${escapeHtml(download.format)}</span>
        </a>
      `,
    )
    .join('')
}

function renderAssetGroup(group: BrandKitAssetGroup, downloadUrl: string) {
  const downloadFileName = fileNameFromUrl(downloadUrl)

  return `
    <section class="group">
      <div class="group-header">
        <div>
          <h3>${escapeHtml(group.label)}</h3>
          ${group.description ? `<p>${escapeHtml(group.description)}</p>` : ''}
        </div>
        <div class="group-actions">
          <span class="asset-count">${group.items.length} ${group.items.length === 1 ? 'asset' : 'assets'} available</span>
          <a class="button" href="${escapeHtml(downloadUrl)}" download="${escapeHtml(downloadFileName ?? '')}">
            ${lucideIcon('download')}
            <span>Download all</span>
          </a>
        </div>
      </div>
      <div class="asset-grid">
        ${group.items
          .map(
            (asset) => `
              <article class="card">
                <button class="asset-preview checker" type="button" data-lightbox-id="${escapeHtml(asset.id)}">
                  <img src="${escapeHtml(asset.previewUrl)}" alt="${escapeHtml(asset.title)}" loading="lazy" />
                </button>
                <div class="card-body">
                  <h4>${escapeHtml(asset.title)}</h4>
                  <div class="button-row">${renderDownloadButtons(asset.downloads)}</div>
                </div>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function findAvatarAssets(groups: BrandKitAssetGroup[]) {
  const iconGroup =
    groups.find((group) => /icon/i.test(group.key)) ??
    groups.find((group) => /icon/i.test(group.label))
  const iconGroupAssets =
    iconGroup?.items.filter((asset) => !isWordmarkAsset(asset)) ?? []

  if (iconGroupAssets.length) return iconGroupAssets

  return groups
    .flatMap((group) => group.items)
    .filter((asset) => isIconAsset(asset))
}

function findHeroAsset(groups: BrandKitAssetGroup[]) {
  return findAvatarAssets(groups)[0] ?? groups[0]?.items[0] ?? null
}

function findFooterAsset(groups: BrandKitAssetGroup[]) {
  const logoGroup =
    groups.find((group) => /logo|lockup|wordmark/i.test(group.key)) ??
    groups.find((group) => /logo|lockup|wordmark/i.test(group.label))

  return logoGroup?.items[0] ?? groups[0]?.items[0] ?? null
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function findPrimaryColor(colors: BrandKitColor[]) {
  return (
    colors.find((color) => /primary/i.test(color.name)) ??
    colors[0] ?? {
      hex: '#0d2249',
      name: 'Primary',
    }
  )
}

function normalizeHexColor(value: string) {
  if (/^#[0-9a-f]{6}$/i.test(value.trim())) return value.trim()
  if (/^[0-9a-f]{6}$/i.test(value.trim())) return `#${value.trim()}`

  return '#4784de'
}

function fixedBackgroundOptions(customHex: string) {
  return [
    { key: 'transparent', label: 'Transparent', color: '' },
    { key: 'black', label: 'Black', color: '#05070b' },
    { key: 'white', label: 'White', color: '#ffffff' },
    { key: 'custom', label: 'Custom', color: normalizeHexColor(customHex) },
  ]
}

function fixedBorderOptions(colors: BrandKitColor[], customHex: string) {
  const primary = findPrimaryColor(colors)

  return [
    { key: 'primary', label: 'Primary', color: primary.hex },
    { key: 'black', label: 'Black', color: '#05070b' },
    { key: 'white', label: 'White', color: '#ffffff' },
    { key: 'custom', label: 'Custom', color: normalizeHexColor(customHex) },
  ]
}

function assetSearchText(asset: BrandKitAsset) {
  return [
    asset.id,
    asset.title,
    asset.previewUrl,
    ...asset.downloads.map((download) => download.fileName),
  ]
    .join(' ')
    .toLowerCase()
}

function isWordmarkAsset(asset: BrandKitAsset) {
  const compact = assetSearchText(asset).replace(/[^a-z0-9]+/g, '')

  return compact.includes('wordmark')
}

function isIconAsset(asset: BrandKitAsset) {
  const text = assetSearchText(asset)
  const tokens = text.split(/[^a-z0-9]+/).filter(Boolean)
  const compact = tokens.join('')

  return (
    !isWordmarkAsset(asset) &&
    (tokens.some((token) =>
      ['icon', 'icons', 'symbol', 'symbols', 'favicon'].includes(token),
    ) ||
      compact.includes('brandmark'))
  )
}

function inferAvatarIconOptions(
  assets: BrandKitAsset[],
  colors: BrandKitColor[],
) {
  const primary = findPrimaryColor(colors)
  const candidates = [
    ...colors.map((color, index) => ({
      color: color.hex,
      key: `brand-${index}-${color.hex.toLowerCase()}`,
      label: color.name,
      tokens: tokenize(color.name),
    })),
    { color: '#ffffff', key: 'white', label: 'White', tokens: ['white'] },
    { color: '#05070b', key: 'black', label: 'Black', tokens: ['black'] },
  ]
  const options: {
    asset: BrandKitAsset
    color: string
    key: string
    label: string
  }[] = []
  const seen = new Set<string>()

  for (const asset of assets) {
    const text = assetSearchText(asset)
    const candidate =
      candidates.find((option) =>
        option.tokens.some((token) => token && text.includes(token)),
      ) ?? {
        color: primary.hex,
        key: `primary-${primary.hex.toLowerCase()}`,
        label: primary.name,
        tokens: ['primary'],
      }

    if (seen.has(candidate.key)) continue

    options.push({
      asset,
      color: candidate.color,
      key: `${candidate.key}:${asset.id}`,
      label: candidate.label,
    })
    seen.add(candidate.key)
  }

  return options
}

function renderColorChip({
  attribute,
  color,
  index,
  label,
  selected,
  value,
}: {
  attribute: string
  color: string
  index: number
  label: string
  selected: boolean
  value: string
}) {
  return `
    <button class="chip ${selected ? 'is-selected' : ''}" type="button" data-${attribute}="${escapeHtml(value)}" data-avatar-color="${escapeHtml(color)}">
      <span class="chip-preview ${color ? '' : 'checker'}" style="${color ? `background-color:${escapeHtml(color)}` : ''}"></span>
      <span class="chip-label">${escapeHtml(label || `Color ${index + 1}`)}</span>
    </button>
  `
}

function renderAvatarGenerator(manifest: BrandKitManifest) {
  const avatarAssets = findAvatarAssets(manifest.assetGroups)

  if (!avatarAssets.length) return ''

  const iconOptions = inferAvatarIconOptions(avatarAssets, manifest.brandColors)
  const backgrounds = fixedBackgroundOptions('#4784de')
  const borders = fixedBorderOptions(manifest.brandColors, '#4784de')

  return `
    <section class="avatar" id="avatar">
      <div>
        <h3>Avatar Generator</h3>
        <p>Make a profile-ready PNG from the approved icon.</p>
      </div>
      <div class="avatar-grid">
        <div class="avatar-controls">
          <button class="reset-button" type="button" id="avatar-reset" aria-label="Reset avatar generator">${lucideIcon('rotate-ccw')}</button>
          <div class="control-group avatar-left avatar-row-1">
            <p class="control-title">Icon</p>
            <div class="chip-row">
              ${iconOptions
                .map(
                  (option, index) => `
                    <button class="chip ${index === 0 ? 'is-selected' : ''}" type="button" data-avatar-icon="${escapeHtml(option.asset.previewUrl)}">
                      <span class="chip-preview checker">
                        <img src="${escapeHtml(option.asset.previewUrl)}" alt="" loading="lazy" />
                      </span>
                      <span class="chip-label">${escapeHtml(option.label)}</span>
                    </button>
                  `,
                )
                .join('')}
            </div>
          </div>
          <div class="control-group avatar-left avatar-row-2">
            <p class="control-title">Background</p>
            <div class="chip-row">
              ${backgrounds
                .map((option, index) =>
                  renderColorChip({
                    attribute: 'avatar-background',
                    color: option.color,
                    index,
                    label: option.label,
                    selected: index === 0,
                    value: option.key,
                  }),
                )
                .join('')}
            </div>
            <label class="custom-color-label" id="background-custom-controls" hidden>
              Custom
              <span class="custom-color-row">
                <input type="color" id="background-custom-color" value="#4784de" aria-label="Custom background color" />
                <input type="text" id="background-custom-text" value="#4784de" aria-label="Custom background hex" />
              </span>
            </label>
          </div>
          <div class="control-group avatar-left avatar-row-3">
            <p class="control-title">Shape</p>
            <div class="chip-row">
              ${['square', 'round', 'rounded']
                .map(
                  (shape, index) => `
                    <button class="chip ${index === 0 ? 'is-selected' : ''}" type="button" data-avatar-shape="${shape}">
                      <span class="chip-preview"><span class="shape-sample shape-${shape}"></span></span>
                      <span class="chip-label">${shape[0].toUpperCase()}${shape.slice(1)}</span>
                    </button>
                  `,
                )
                .join('')}
            </div>
          </div>
          <div class="avatar-divider" aria-hidden="true"></div>
          <div class="control-group avatar-right avatar-row-1">
            <p class="control-title">Border color</p>
            <div class="chip-row">
              ${borders
                .map((option, index) =>
                  renderColorChip({
                    attribute: 'avatar-border',
                    color: option.color,
                    index,
                    label: option.label,
                    selected: index === 0,
                    value: option.key,
                  }),
                )
                .join('')}
            </div>
            <label class="custom-color-label" id="border-custom-controls" hidden>
              Custom
              <span class="custom-color-row">
                <input type="color" id="border-custom-color" value="#4784de" aria-label="Custom border color" />
                <input type="text" id="border-custom-text" value="#4784de" aria-label="Custom border hex" />
              </span>
            </label>
          </div>
          <div class="control-group avatar-right avatar-row-2">
            <p class="control-title">Border thickness</p>
            <div class="chip-row">
              ${[
                ['none', 'None', '1px #cbd5e1'],
                ['thin', 'Thin', '3px #0d2249'],
                ['medium', 'Medium', '5px #0d2249'],
                ['heavy', 'Heavy', '7px #0d2249'],
              ]
                .map(
                  ([value, label, shadow], index) => `
                    <button class="chip ${index === 0 ? 'is-selected' : ''}" type="button" data-avatar-thickness="${value}">
                      <span class="chip-preview"><span class="border-sample" style="box-shadow:inset 0 0 0 ${shadow}"></span></span>
                      <span class="chip-label">${label}</span>
                    </button>
                  `,
                )
                .join('')}
            </div>
          </div>
          <div class="control-group avatar-right avatar-row-3">
            <p class="control-title">Size</p>
            <div class="chip-row">
              ${[512, 1024]
                .map(
                  (size, index) => `
                    <button class="chip ${index === 1 ? 'is-selected' : ''}" type="button" data-avatar-size="${size}">
                      <span class="chip-preview">${size}</span>
                      <span class="chip-label">${size}px</span>
                    </button>
                  `,
                )
                .join('')}
            </div>
          </div>
        </div>
        <div class="avatar-preview">
          <span class="avatar-surface checker shape-square" id="avatar-surface">
            <canvas id="avatar-canvas" width="1024" height="1024" aria-label="Avatar preview"></canvas>
          </span>
          <label class="avatar-range">
            <span>Icon padding</span>
            <input type="range" min="0" max="34" value="18" id="avatar-padding" style="accent-color:${escapeHtml(findPrimaryColor(manifest.brandColors).hex)}" />
          </label>
          <button class="button button-favicon" type="button" id="download-avatar">${lucideIcon('download')}<span>Download PNG (1024px)</span></button>
          <button class="button" type="button" id="download-favicons">${lucideIcon('download')}<span>Download favicon PNGs</span></button>
          <p class="status" id="avatar-status"></p>
        </div>
      </div>
    </section>
  `
}

function colorRows(manifest: BrandKitManifest) {
  const colorMap = new Map(
    manifest.brandColors.map((color) => [color.name.toLowerCase(), color]),
  )
  const configured = manifest.colorSections
    .map((section) => ({
      columns: section.columns ?? 3,
      label: getDisplayColorSectionLabel(section.label),
      rows: section.rows
        .map((row) =>
          row
            .map((name) => colorMap.get(name.toLowerCase()))
            .filter((color): color is BrandKitColor => Boolean(color)),
        )
        .filter((row) => row.length > 0),
    }))
    .filter((section) => section.rows.length > 0)

  if (configured.length) return configured

  const rows: BrandKitColor[][] = []

  for (let index = 0; index < manifest.brandColors.length; index += 3) {
    rows.push(manifest.brandColors.slice(index, index + 3))
  }

  return [{ columns: 3 as const, label: 'Primary', rows }]
}

function getDisplayColorSectionLabel(label: string) {
  const trimmed = label.trim()

  if (/^brand colors?$/i.test(trimmed)) return 'Primary'

  return trimmed.replace(/\s+colors?$/i, '')
}

function renderColors(manifest: BrandKitManifest) {
  return colorRows(manifest)
    .map(
      (section) => `
        <section class="color-section">
          <h4 class="color-section-title">${escapeHtml(section.label)}</h4>
          <div class="color-rows">
            ${section.rows
              .map(
                (row, index) => `
                  <div class="color-row color-row-${Math.min(section.columns, 3)}" data-row="${index}">
                    ${row
                      .map(
                        (color) => `
                          <article class="color-card">
                            <div class="swatch" style="background-color:${escapeHtml(color.hex)}"></div>
                            <div class="color-body">
                              <h4>${escapeHtml(color.name)}</h4>
                              <div class="button-row">
                                <button class="copy-button" type="button" data-copy="${escapeHtml(color.hex)}">${lucideIcon('copy', 'copy-icon')}<span>${escapeHtml(color.hex)}</span></button>
                              </div>
                            </div>
                          </article>
                        `,
                      )
                      .join('')}
                  </div>
                `,
              )
              .join('')}
          </div>
        </section>
      `,
    )
    .join('')
}

function renderPrintCopyButton(value: string) {
  return `<button class="print-copy-value" type="button" data-copy="${escapeHtml(value)}" data-copy-static="true">${escapeHtml(value)}</button>`
}

function renderPrintValueGroup({
  channels,
  color,
  label,
}: {
  channels: string[]
  color: BrandKitPrintColor
  label: string
}) {
  const sourceValues = label === 'RGB' ? color.rgb : color.cmyk
  const values = channels
    .map((channel, index) => ({ channel, value: sourceValues[index] }))
    .filter((item) => item.value)

  if (!values.length) return ''

  return `
    <div class="print-value-group">
      <p class="print-kicker">${escapeHtml(label)}</p>
      <div class="print-copy-row">
        ${lucideIcon('copy', 'print-copy-icon')}
        <div class="print-component-row">
          ${values
            .map(
              (item) => `
                <button class="print-component-copy" type="button" data-copy="${escapeHtml(item.value ?? '')}" data-copy-static="true">
                  <span class="print-channel">${escapeHtml(item.channel)}</span>
                  <span>${escapeHtml(item.value ?? '')}</span>
                </button>
              `,
            )
            .join('')}
        </div>
      </div>
    </div>
  `
}

function renderPrintColorCard(color: BrandKitPrintColor) {
  return `
    <article class="print-card">
      <div class="print-chip">
        <button
          aria-label="${escapeHtml(color.pantone)} color values"
          class="print-swatch"
          style="background-color:${escapeHtml(color.hex)}"
          type="button"
        ></button>
        <div class="print-chip-body">
          <p class="print-kicker">Pantone</p>
          <p class="print-pantone">${escapeHtml(color.pantone)}</p>
        </div>
      </div>
      <div class="print-popover">
        <div class="print-popover-panel">
          <div class="print-popover-chip">
            <p class="print-kicker">Pantone</p>
            <p class="print-pantone">${escapeHtml(color.pantone)}</p>
          </div>
          <div class="print-values">
            <div class="print-value-group">
              <p class="print-kicker">Hex</p>
              <div class="print-copy-row">
                ${lucideIcon('copy', 'print-copy-icon')}
                ${renderPrintCopyButton(color.hex)}
              </div>
            </div>
            ${renderPrintValueGroup({ channels: ['R', 'G', 'B'], color, label: 'RGB' })}
            ${renderPrintValueGroup({ channels: ['C', 'M', 'Y', 'K'], color, label: 'CMYK' })}
          </div>
        </div>
      </div>
    </article>
  `
}

function renderPrintColorGroups(groups: BrandKitPrintColorGroup[]) {
  if (!groups.length) return ''

  return `
    <section class="print-colors">
      <div class="print-intro">
        <h3>Print Colors</h3>
        <p>Pantone-aligned swatches for merch, packaging, and print production.</p>
      </div>
      ${groups
        .map(
          (group) => `
            <section class="print-family">
              <h4>${escapeHtml(group.label)}</h4>
              <div class="print-grid">
                ${group.items.map(renderPrintColorCard).join('')}
              </div>
            </section>
          `,
        )
        .join('')}
    </section>
  `
}

function renderBanners(manifest: BrandKitManifest) {
  if (!manifest.bannerGroups.length) return ''

  const bannerAssetCount = manifest.bannerGroups.reduce(
    (total, group) => total + group.items.length,
    0,
  )

  return `
    <section id="banners" class="section-banners">
      <div class="wrap section-inner">
        <div class="section-heading-row">
          <div class="section-heading">
            <p class="eyebrow">Banners</p>
            <h2>Social profile assets</h2>
            <p>Ready-to-use PNG cover images sized for each platform.</p>
          </div>
          <div class="group-actions section-heading-actions">
            <span class="asset-count">${bannerAssetCount} ${bannerAssetCount === 1 ? 'asset' : 'assets'} available</span>
            ${
              manifest.downloads.bannerAssets
                ? `<a class="button" href="${escapeHtml(manifest.downloads.bannerAssets)}" download="${escapeHtml(fileNameFromUrl(manifest.downloads.bannerAssets) ?? '')}">${lucideIcon('download')}<span>Download all</span></a>`
                : ''
            }
          </div>
        </div>
        <div class="banner-stack">
          ${manifest.bannerGroups
            .map(
              (group) => `
                <section class="banner-group">
                  <div>
                    <h3>${escapeHtml(group.label)}</h3>
                    ${group.description ? `<p>${escapeHtml(group.description)}</p>` : ''}
                  </div>
                  <div class="banner-list">
                    ${group.items
                      .map(
                        (asset) => `
                          <article class="banner-card" style="width:${Math.round(asset.width * 0.5)}px">
                            <div class="banner-preview" style="aspect-ratio:${asset.width} / ${asset.height}">
                              <img src="${escapeHtml(asset.previewUrl)}" alt="${escapeHtml(asset.title)}" loading="lazy" />
                            </div>
                            <div class="banner-card-body">
                              <div>
                                <h4>${escapeHtml(asset.title)}</h4>
                                <p>${escapeHtml(asset.description)}</p>
                              </div>
                              <div class="button-row">${renderDownloadButtons(asset.downloads)}</div>
                            </div>
                          </article>
                        `,
                      )
                      .join('')}
                  </div>
                </section>
              `,
            )
            .join('')}
        </div>
      </div>
    </section>
  `
}

function clientScript(manifest: BrandKitManifest) {
  return `
    window.__OPEN_BRANDKIT__ = ${escapeJsonForHtml(manifest)};

    const copyButtons = document.querySelectorAll('[data-copy]');
    copyButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const value = button.getAttribute('data-copy') || '';
        await navigator.clipboard.writeText(value);
        if (button.hasAttribute('data-copy-static')) return;
        const label = button.querySelector('span');
        const original = label?.textContent || value;
        if (label) label.textContent = 'Copied';
        window.setTimeout(() => {
          if (label) label.textContent = original;
        }, 1000);
      });
    });

    const allAssets = window.__OPEN_BRANDKIT__.assetGroups.flatMap((group) => group.items);
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxFile = document.getElementById('lightbox-file');
    const lightboxDownloads = document.getElementById('lightbox-downloads');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPanel = lightbox?.querySelector('.lightbox-panel');

    function preferredDownload(asset) {
      return asset.downloads.find((download) => download.format === 'PNG') ||
        asset.downloads.find((download) => download.format === 'SVG') ||
        asset.downloads[0];
    }

    function closeLightbox() {
      if (lightbox) lightbox.hidden = true;
    }

    document.querySelectorAll('[data-lightbox-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const asset = allAssets.find((item) => item.id === button.getAttribute('data-lightbox-id'));
        if (!asset || !lightbox || !lightboxImage || !lightboxTitle || !lightboxFile || !lightboxDownloads) return;
        const download = preferredDownload(asset);
        lightboxImage.src = download?.url || asset.previewUrl;
        lightboxImage.alt = asset.title;
        lightboxTitle.textContent = asset.title;
        lightboxFile.textContent = download?.fileName || asset.downloads.map((item) => item.fileName).join(' / ');
        lightboxDownloads.innerHTML = '';
        asset.downloads.forEach((item) => {
          const link = document.createElement('a');
          link.className = 'button button-dark';
          link.href = item.url;
          link.download = item.fileName;
          link.innerHTML = '${lucideIcon('download')}<span>' + item.format + '</span>';
          lightboxDownloads.appendChild(link);
        });
        lightbox.hidden = false;
      });
    });
    lightboxClose?.addEventListener('click', closeLightbox);
    lightbox?.addEventListener('mousedown', (event) => {
      if (event.target instanceof Node && !lightboxPanel?.contains(event.target)) closeLightbox();
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeLightbox();
    });

    const canvas = document.getElementById('avatar-canvas');
    const surface = document.getElementById('avatar-surface');
    const paddingInput = document.getElementById('avatar-padding');
    const downloadAvatar = document.getElementById('download-avatar');
    const downloadFavicons = document.getElementById('download-favicons');
    const avatarStatus = document.getElementById('avatar-status');
    const resetAvatar = document.getElementById('avatar-reset');
    const backgroundCustomControls = document.getElementById('background-custom-controls');
    const backgroundCustomColor = document.getElementById('background-custom-color');
    const backgroundCustomText = document.getElementById('background-custom-text');
    const borderCustomControls = document.getElementById('border-custom-controls');
    const borderCustomColor = document.getElementById('border-custom-color');
    const borderCustomText = document.getElementById('border-custom-text');
    const thicknessRatios = { none: 0, thin: 0.16, medium: 0.32, heavy: 0.48 };

    function selectedValue(selector, fallback) {
      return document.querySelector(selector + '.is-selected')?.getAttribute(selector.replace('[data-', 'data-').replace(']', '')) || fallback;
    }

    function selectedDataset(selector, name, fallback) {
      return document.querySelector(selector + '.is-selected')?.getAttribute(name) || fallback;
    }

    function normalizeHex(value) {
      const trimmed = String(value || '').trim();
      if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
      if (/^[0-9a-f]{6}$/i.test(trimmed)) return '#' + trimmed;
      return '#4784de';
    }

    function syncCustomControls() {
      const backgroundCustomSelected = selectedValue('[data-avatar-background]', '') === 'custom';
      const borderCustomSelected = selectedValue('[data-avatar-border]', '') === 'custom';
      if (backgroundCustomControls) backgroundCustomControls.hidden = !backgroundCustomSelected;
      if (borderCustomControls) borderCustomControls.hidden = !borderCustomSelected;
      const backgroundChip = document.querySelector('[data-avatar-background="custom"]');
      const borderChip = document.querySelector('[data-avatar-border="custom"]');
      const backgroundHex = normalizeHex(backgroundCustomText?.value || backgroundCustomColor?.value);
      const borderHex = normalizeHex(borderCustomText?.value || borderCustomColor?.value);
      backgroundChip?.setAttribute('data-avatar-color', backgroundHex);
      borderChip?.setAttribute('data-avatar-color', borderHex);
      if (backgroundCustomColor && backgroundCustomColor.value !== backgroundHex) backgroundCustomColor.value = backgroundHex;
      if (borderCustomColor && borderCustomColor.value !== borderHex) borderCustomColor.value = borderHex;
    }

    function addShapePath(context, size, shape, inset = 0) {
      const edge = size - inset * 2;
      const radius = Math.min(edge / 2, Math.max(0, size * 0.22 - inset));
      context.beginPath();
      if (shape === 'round') {
        context.arc(size / 2, size / 2, edge / 2, 0, Math.PI * 2);
        context.closePath();
        return;
      }
      if (shape === 'rounded' && typeof context.roundRect === 'function') {
        context.roundRect(inset, inset, edge, edge, radius);
        context.closePath();
        return;
      }
      context.rect(inset, inset, edge, edge);
      context.closePath();
    }

    function loadImage(src) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
      });
    }

    async function drawAvatar(targetCanvas, size) {
      if (!targetCanvas) return;
      const context = targetCanvas.getContext('2d');
      const icon = selectedValue('[data-avatar-icon]', '');
      const background = selectedDataset('[data-avatar-background]', 'data-avatar-color', '');
      const border = selectedDataset('[data-avatar-border]', 'data-avatar-color', '#05070b');
      const shape = selectedValue('[data-avatar-shape]', 'square');
      const thickness = selectedValue('[data-avatar-thickness]', 'none');
      const padding = Number(paddingInput?.value || 18);
      const borderThickness = Math.round((size * (96 / 512) * (thicknessRatios[thickness] || 0)) / 4) * 4;
      const image = await loadImage(icon);
      const maxIconWidth = size * ((100 - padding * 2) / 100);
      const ratio = Math.min(maxIconWidth / image.width, maxIconWidth / image.height);
      const imageWidth = image.width * ratio;
      const imageHeight = image.height * ratio;
      targetCanvas.width = size;
      targetCanvas.height = size;
      context.clearRect(0, 0, size, size);
      if (borderThickness > 0) {
        context.save();
        addShapePath(context, size, shape);
        addShapePath(context, size, shape, borderThickness);
        context.fillStyle = border || '#05070b';
        context.fill('evenodd');
        context.restore();
      }
      if (background) {
        context.save();
        addShapePath(context, size, shape, borderThickness);
        context.clip();
        context.fillStyle = background;
        context.fill();
        context.restore();
      }
      context.drawImage(image, (size - imageWidth) / 2, (size - imageHeight) / 2, imageWidth, imageHeight);
      if (surface) {
        surface.className = 'avatar-surface shape-' + shape + ((!background || shape !== 'square') ? ' checker' : '');
      }
      if (downloadAvatar) downloadAvatar.querySelector('span:last-child').textContent = 'Download PNG (' + selectedValue('[data-avatar-size]', '1024') + 'px)';
    }

    function selectChip(button, selector) {
      document.querySelectorAll(selector).forEach((chip) => chip.classList.remove('is-selected'));
      button.classList.add('is-selected');
      syncCustomControls();
      void drawAvatar(canvas, 1024);
    }

    ['[data-avatar-icon]', '[data-avatar-background]', '[data-avatar-shape]', '[data-avatar-border]', '[data-avatar-thickness]', '[data-avatar-size]'].forEach((selector) => {
      document.querySelectorAll(selector).forEach((button) => {
        button.addEventListener('click', () => selectChip(button, selector));
      });
    });
    [backgroundCustomColor, backgroundCustomText].forEach((input) => {
      input?.addEventListener('input', () => {
        const next = normalizeHex(input.value);
        if (backgroundCustomColor) backgroundCustomColor.value = next;
        if (backgroundCustomText) backgroundCustomText.value = next;
        syncCustomControls();
        void drawAvatar(canvas, 1024);
      });
    });
    [borderCustomColor, borderCustomText].forEach((input) => {
      input?.addEventListener('input', () => {
        const next = normalizeHex(input.value);
        if (borderCustomColor) borderCustomColor.value = next;
        if (borderCustomText) borderCustomText.value = next;
        syncCustomControls();
        void drawAvatar(canvas, 1024);
      });
    });
    paddingInput?.addEventListener('input', () => void drawAvatar(canvas, 1024));
    resetAvatar?.addEventListener('click', () => {
      ['[data-avatar-icon]', '[data-avatar-background]', '[data-avatar-shape]', '[data-avatar-border]', '[data-avatar-thickness]'].forEach((selector) => {
        const chips = document.querySelectorAll(selector);
        chips.forEach((chip) => chip.classList.remove('is-selected'));
        chips[0]?.classList.add('is-selected');
      });
      const sizes = document.querySelectorAll('[data-avatar-size]');
      sizes.forEach((chip) => chip.classList.remove('is-selected'));
      sizes[1]?.classList.add('is-selected');
      if (paddingInput) paddingInput.value = '18';
      if (avatarStatus) avatarStatus.textContent = '';
      syncCustomControls();
      void drawAvatar(canvas, 1024);
    });

    async function downloadCanvasPng(fileName, size) {
      const exportCanvas = document.createElement('canvas');
      await drawAvatar(exportCanvas, size);
      const blob = await new Promise((resolve) => exportCanvas.toBlob(resolve, 'image/png'));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    downloadAvatar?.addEventListener('click', () => {
      const size = Number(selectedValue('[data-avatar-size]', '1024'));
      void downloadCanvasPng('brand-avatar-' + size + 'px.png', size);
    });
    downloadFavicons?.addEventListener('click', async () => {
      for (const size of [16, 32, 180, 192, 512]) {
        await downloadCanvasPng(size === 180 ? 'apple-touch-icon.png' : 'favicon-' + size + 'x' + size + '.png', size);
      }
      if (avatarStatus) avatarStatus.textContent = 'Downloaded favicon PNGs.';
    });
    syncCustomControls();
    void drawAvatar(canvas, 1024);
  `
}

export function generateStaticBrandKitPage(manifest: BrandKitManifest) {
  const heroAsset = findHeroAsset(manifest.assetGroups)
  const footerAsset = findFooterAsset(manifest.assetGroups)
  const assetCount = manifest.assetGroups.reduce(
    (total, group) => total + group.items.length,
    0,
  )
  const bannerAssetCount = manifest.bannerGroups.reduce(
    (total, group) => total + group.items.length,
    0,
  )
  const totalAssetCount = assetCount + bannerAssetCount
  const primaryColor = findPrimaryColor(manifest.brandColors).hex
  const generatorVersion = manifest.generator?.version
  const generatorPackageName = manifest.generator?.name || 'open-brandkit'
  const generatorVersionLabel = generatorVersion ? `v${generatorVersion}` : ''
  const generatorVersionHref = generatorVersion
    ? npmPackageVersionUrl(generatorPackageName, generatorVersion)
    : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(manifest.brand.name)} Brand Kit</title>
    <meta name="description" content="${escapeHtml(manifest.brand.description ?? deterministicIntro)}" />
    <style>${pageStyles}</style>
  </head>
  <body style="--brand-primary:${escapeHtml(primaryColor)}">
    <header class="header">
      <div class="wrap header-inner">
        <div>
          <a class="brand-link" href="${escapeHtml(manifest.brand.homeUrl ?? '/')}">${lucideIcon('arrow-left')}<span>${escapeHtml(manifest.brand.name)}</span></a>
          <div class="title-row">
            <h1>Brand Kit</h1>
            ${
              generatorVersionLabel && generatorVersionHref
                ? `<a class="version-label" href="${escapeHtml(generatorVersionHref)}" target="_blank" rel="noreferrer">${escapeHtml(generatorVersionLabel)}</a>`
                : ''
            }
          </div>
          <p class="copy">${escapeHtml(deterministicIntro)}</p>
          <nav class="nav" aria-label="Brand Kit sections">
            <a class="nav-link" href="#logos">${lucideIcon('arrow-down', 'nav-arrow')}<span>Logos</span></a>
            <a class="nav-link" href="#colors">${lucideIcon('arrow-down', 'nav-arrow')}<span>Colors</span></a>
            ${manifest.bannerGroups.length ? `<a class="nav-link" href="#banners">${lucideIcon('arrow-down', 'nav-arrow')}<span>Banners</span></a>` : ''}
            <span class="asset-count">${totalAssetCount} ${totalAssetCount === 1 ? 'asset' : 'assets'} available</span>
            ${manifest.downloads.allAssets ? `<a class="button" href="${escapeHtml(manifest.downloads.allAssets)}" download="${escapeHtml(fileNameFromUrl(manifest.downloads.allAssets) ?? '')}">${lucideIcon('download')}<span>Download all</span></a>` : ''}
          </nav>
        </div>
        ${
          heroAsset
            ? `<div class="hero-media"><div class="hero-asset"><img src="${escapeHtml(heroAsset.previewUrl)}" alt="${escapeHtml(heroAsset.title)}" /></div></div>`
            : ''
        }
      </div>
    </header>
    <main>
      <section id="logos" class="section-muted">
        <div class="wrap section-inner">
          <div class="section-heading">
            <p class="eyebrow">Logos</p>
            <h2>Approved marks</h2>
          </div>
          <div class="stack">
            ${manifest.assetGroups
              .map((group) =>
                renderAssetGroup(
                  group,
                  manifest.downloads.assetGroups?.[group.key] ??
                    `./downloads/${group.key}.zip`,
                ),
              )
              .join('')}
            ${renderAvatarGenerator(manifest)}
          </div>
        </div>
      </section>
      <section id="colors" class="section">
        <div class="wrap section-inner">
          <div class="section-heading">
            <p class="eyebrow">Colors</p>
            <h2>Color system</h2>
          </div>
          <div class="color-group">
            <div>
              <h3>Brand Colors</h3>
              <p>Core digital colors for product and web work.</p>
            </div>
            <div class="color-sections">${renderColors(manifest)}</div>
            ${renderPrintColorGroups(manifest.printColorGroups ?? [])}
          </div>
        </div>
      </section>
      ${renderBanners(manifest)}
    </main>
    <footer class="footer">
      <div class="wrap footer-inner">
        ${
          footerAsset
            ? `<div class="footer-logo"><img src="${escapeHtml(footerAsset.previewUrl)}" alt="${escapeHtml(footerAsset.title)}" /></div>`
            : ''
        }
        <p>&copy; ${new Date().getFullYear()} ${escapeHtml(manifest.brand.name)}. All rights reserved.</p>
      </div>
    </footer>
    <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" hidden>
      <div class="lightbox-align">
        <div class="lightbox-panel">
          <div class="lightbox-preview">
            <div class="lightbox-checker checker">
              <img id="lightbox-image" alt="" />
            </div>
          </div>
          <div class="lightbox-body">
            <div>
              <h2 class="lightbox-title" id="lightbox-title"></h2>
              <p class="lightbox-file" id="lightbox-file"></p>
            </div>
            <div class="button-row">
              <button class="button" type="button" id="lightbox-close">Close</button>
              <span class="button-row" id="lightbox-downloads"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <script>${clientScript(manifest)}</script>
  </body>
</html>
`
}
