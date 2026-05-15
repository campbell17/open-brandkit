'use client'

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  Copy,
  Download,
  RotateCcw,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type MouseEvent,
} from 'react'

import type {
  BrandKitAsset,
  BrandKitAssetGroup,
  BrandKitBannerAsset,
  BrandKitBannerGroup,
  BrandKitColor,
  BrandKitManifest,
} from '../../core/types.js'
import type { BrandKitBannerControls } from './manifest.js'

export type BrandKitPageEndpoints = {
  bannerPresets?: string
  bannerUpload?: string
  favicon?: string
}

export type BrandKitPageProps = {
  bannerControls?: BrandKitBannerControls
  canUseDevActions?: boolean
  endpoints?: BrandKitPageEndpoints
  manifest: BrandKitManifest
}

type AvatarShape = 'square' | 'rounded' | 'round'
type AvatarBorderThickness = 'none' | 'thin' | 'medium' | 'heavy'

type BannerPresetState = {
  alignment: string
  backgroundColor: string
  markColor: string
  markVariant: string
  pattern: string
  secondaryColor: string
}

type ColorOption = {
  color: string | null
  key: string
  label: string
}

type AvatarIconOption = {
  asset: BrandKitAsset
  color: string
  key: string
  label: string
}

type BrandColorRows = {
  label: string
  rows: BrandKitColor[][]
}[]

const transparentPreviewStyle = {
  backgroundColor: '#f7f7f7',
  backgroundImage: 'repeating-conic-gradient(#ececec 0% 25%, #f8f8f8 0% 50%)',
  backgroundPosition: '50%',
  backgroundSize: '20px 20px',
} satisfies CSSProperties

const avatarShapeOptions = [
  { label: 'Square', value: 'square' },
  { label: 'Round', value: 'round' },
  { label: 'Rounded', value: 'rounded' },
] as const

const avatarBorderThicknessOptions = [
  { label: 'None', value: 'none', ratio: 0 },
  { label: 'Thin', value: 'thin', ratio: 0.16 },
  { label: 'Medium', value: 'medium', ratio: 0.32 },
  { label: 'Heavy', value: 'heavy', ratio: 0.48 },
] as const

const avatarSizeOptions = [512, 1024] as const
const avatarBorderStep = 4
const avatarMaxBorderRatio = 96 / 512
const bannerPreviewScale = 0.5
const deterministicIntro =
  'Approved marks, avatar-ready presets, social profile assets, and the current color system.'

const styles = `
.obk-shell {
  min-height: 100vh;
  background: #f8fafc;
  color: #020617;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.obk-shell * { box-sizing: border-box; }
.obk-shell a { color: inherit; }
.obk-header {
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}
.obk-wrap {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding-right: 16px;
  padding-left: 16px;
}
.obk-header-inner {
  display: grid;
  gap: 40px;
  padding-top: 48px;
  padding-bottom: 48px;
}
.obk-brand-link,
.obk-eyebrow {
  margin: 0;
  color: #737373;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2em;
  line-height: 1.3;
  text-transform: uppercase;
}
.obk-brand-link {
  text-decoration: none;
  transition: color 160ms ease;
}
.obk-brand-link:hover { color: #0a0a0a; }
.obk-title {
  margin: 12px 0 0;
  color: #020617;
  font-size: 48px;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1;
}
.obk-copy {
  max-width: 672px;
  margin: 16px 0 0;
  color: #475569;
  font-size: 16px;
  line-height: 1.75;
}
.obk-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-top: 32px;
}
.obk-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #404040;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  text-underline-offset: 4px;
  transition: color 160ms ease;
}
.obk-nav-link:hover {
  color: #0a0a0a;
  text-decoration: underline;
}
.obk-nav-icon,
.obk-button-icon,
.obk-copy-icon,
.obk-align-svg {
  flex: 0 0 auto;
  stroke-width: 2;
}
.obk-nav-icon {
  width: 14px;
  height: 14px;
}
.obk-button-icon,
.obk-align-svg {
  width: 16px;
  height: 16px;
}
.obk-copy-icon {
  width: 14px;
  height: 14px;
}
.obk-asset-count {
  color: #64748b;
  font-size: 14px;
}
.obk-hero-media {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.obk-hero-asset {
  display: flex;
  aspect-ratio: 673 / 489;
  width: 100%;
  max-width: 320px;
  align-items: center;
  justify-content: center;
}
.obk-hero-asset img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.obk-section {
  background: #ffffff;
}
.obk-section-muted {
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}
.obk-section-banners {
  border-top: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}
.obk-section-inner {
  padding-top: 56px;
  padding-bottom: 56px;
}
.obk-section-heading {
  max-width: 672px;
}
.obk-section-heading-row {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.obk-section-heading-actions {
  flex: 0 0 auto;
}
.obk-section-heading h2 {
  margin: 12px 0 0;
  color: #020617;
  font-size: 36px;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1.1;
}
.obk-section-heading p:last-child {
  margin: 16px 0 0;
  color: #475569;
  font-size: 16px;
  line-height: 1.75;
}
.obk-stack {
  display: flex;
  flex-direction: column;
  gap: 48px;
  margin-top: 40px;
}
.obk-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.obk-group-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.obk-group-header h3,
.obk-avatar-title,
.obk-color-group h3 {
  margin: 0;
  color: #020617;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
}
.obk-group-header p,
.obk-avatar-intro,
.obk-color-group p,
.obk-banner-group p {
  margin: 4px 0 0;
  color: #475569;
  font-size: 14px;
  line-height: 1.5;
}
.obk-group-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.obk-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
.obk-card,
.obk-color-card,
.obk-banner-card {
  overflow: hidden;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #ffffff;
}
.obk-card {
  display: flex;
  height: 100%;
  flex-direction: column;
}
.obk-preview {
  display: flex;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  width: 100%;
  border: 0;
  border-bottom: 1px solid #e5e5e5;
  padding: 40px 24px;
  cursor: zoom-in;
  transition: opacity 160ms ease;
}
.obk-preview:hover { opacity: 0.9; }
.obk-preview-dark {
  background: #2b333f;
  background-image: none;
}
.obk-preview img {
  display: block;
  width: auto;
  max-width: 100%;
  max-height: 112px;
  object-fit: contain;
}
.obk-card-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
}
.obk-card-body h4,
.obk-color-card h4,
.obk-banner-card h4 {
  margin: 0;
  color: #171717;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}
.obk-button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.obk-button,
.obk-file-button,
.obk-copy-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 6px;
  border: 1px solid #d4d4d4;
  background: #ffffff;
  color: #262626;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.2;
  text-decoration: none;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease;
}
.obk-button,
.obk-file-button {
  min-height: 36px;
  padding: 8px 12px;
}
.obk-icon-button {
  width: 36px;
  padding: 8px;
}
.obk-button:hover,
.obk-file-button:hover {
  border-color: #a3a3a3;
  background: #fafafa;
}
.obk-button:disabled,
.obk-file-button:disabled,
.obk-control-button:disabled,
.obk-select:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.obk-button-dark {
  border-color: #2b333f;
  background: #2b333f;
  color: #ffffff;
}
.obk-button-dark,
.obk-button-dark *,
.obk-shell a.obk-button-dark,
.obk-shell a.obk-button-dark * {
  color: #ffffff;
}
.obk-button-dark:hover {
  border-color: #1d232b;
  background: #1d232b;
  color: #ffffff;
}
.obk-button-favicon {
  border-color: #0d2249;
  background: #0d2249;
  color: #ffffff;
}
.obk-button-favicon:hover {
  border-color: #1e293b;
  background: #1e293b;
  color: #ffffff;
}
.obk-copy-button {
  min-height: 30px;
  border-color: #e5e5e5;
  padding: 6px 10px;
  color: #404040;
  font-size: 12px;
}
.obk-copy-button:hover {
  border-color: #d4d4d4;
  background: #fafafa;
}
.obk-avatar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.obk-avatar-grid {
  display: grid;
  gap: 20px;
}
.obk-avatar-controls {
  position: relative;
  display: grid;
  gap: 48px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
  padding: 24px;
}
.obk-reset-button {
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
  color: #64748b;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: color 160ms ease;
}
.obk-reset-button:hover { color: #1d4ed8; }
.obk-avatar-control-group {
  display: flex;
  width: max-content;
  max-width: 100%;
  flex-direction: column;
  gap: 16px;
  justify-self: center;
}
.obk-control-title,
.obk-banner-control legend,
.obk-color-section-title {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.3;
  text-transform: uppercase;
}
.obk-chip-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px 12px;
}
.obk-chip {
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
.obk-chip-preview {
  display: flex;
  aspect-ratio: 1;
  width: 64px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}
.obk-chip:hover .obk-chip-preview {
  border-color: #64748b;
}
.obk-chip.is-selected .obk-chip-preview {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px #2563eb, 0 0 0 4px #ffffff;
}
.obk-chip-label {
  width: 64px;
  color: #334155;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.35;
}
.obk-chip-preview img {
  display: block;
  max-width: 42px;
  max-height: 42px;
  object-fit: contain;
}
.obk-shape-sample {
  display: block;
  width: 32px;
  height: 32px;
  background: #0d2249;
}
.obk-border-sample {
  display: block;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: #ffffff;
}
.obk-avatar-divider {
  display: none;
}
.obk-avatar-preview {
  display: flex;
  min-height: 320px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
  padding: 20px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}
.obk-avatar-surface {
  display: flex;
  aspect-ratio: 1;
  width: 100%;
  max-width: 256px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.obk-avatar-surface canvas {
  display: block;
  aspect-ratio: 1;
  width: 100%;
  height: auto;
}
.obk-avatar-range {
  display: flex;
  width: 100%;
  max-width: 256px;
  flex-direction: column;
  gap: 12px;
}
.obk-avatar-range span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.obk-avatar-range input {
  width: 100%;
  cursor: pointer;
  accent-color: #2563eb;
}
.obk-custom-color-label {
  display: flex;
  width: 100%;
  max-width: 220px;
  flex-direction: column;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.obk-custom-color-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.obk-custom-color-row input[type="color"] {
  width: 40px;
  height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  cursor: pointer;
  padding: 3px;
}
.obk-custom-color-row input[type="text"] {
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
.obk-status {
  min-height: 20px;
  margin: 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
}
.obk-color-group {
  margin-top: 48px;
}
.obk-color-sections,
.obk-color-section,
.obk-color-rows {
  display: flex;
  flex-direction: column;
}
.obk-color-sections { gap: 16px; margin-top: 20px; }
.obk-color-section { gap: 12px; }
.obk-color-rows { gap: 16px; }
.obk-color-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
.obk-color-card {
  display: block;
}
.obk-swatch {
  height: 112px;
  width: 100%;
  border-bottom: 1px solid #e5e5e5;
}
.obk-color-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}
.obk-banner-controls {
  width: 100%;
  margin-top: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
  padding: 12px;
}
.obk-banner-control-grid {
  display: grid;
  gap: 12px;
}
.obk-banner-control {
  min-width: 0;
  margin: 0;
  border: 0;
  padding: 0;
}
.obk-select {
  width: 100%;
  height: 32px;
  margin-top: 8px;
  border: 1px solid #d4d4d4;
  border-radius: 6px;
  background: #ffffff;
  color: #262626;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  padding: 0 10px;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease;
}
.obk-select:hover,
.obk-select:focus {
  border-color: #0d2249;
  background: #f8fafc;
  color: #020617;
  outline: none;
}
.obk-dot-group,
.obk-align-group {
  display: inline-flex;
  margin-top: 8px;
  border: 1px solid #d4d4d4;
  border-radius: 6px;
  background: #ffffff;
  padding: 4px;
}
.obk-control-button {
  display: flex;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    box-shadow 160ms ease,
    color 160ms ease;
}
.obk-dot-button { width: 28px; }
.obk-align-button { width: 32px; }
.obk-control-button:hover {
  background: #f1f5f9;
  box-shadow: inset 0 0 0 1px #64748b;
}
.obk-control-button.is-selected {
  background: #f1f5f9;
  box-shadow: inset 0 0 0 1px #0d2249;
}
.obk-align-button.is-selected {
  background: #0d2249;
  color: #ffffff;
  box-shadow: none;
}
.obk-color-dot {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.18);
}
.obk-banner-stack {
  display: flex;
  flex-direction: column;
  gap: 40px;
  margin-top: 48px;
}
.obk-banner-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.obk-banner-group h3 {
  margin: 0;
  color: #737373;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.4;
  text-transform: uppercase;
}
.obk-banner-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.obk-banner-card {
  max-width: 100%;
}
.obk-banner-preview {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-bottom: 1px solid #e5e5e5;
  background: #f1f5f9;
}
.obk-banner-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.obk-banner-card-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}
.obk-banner-card p {
  margin: 4px 0 0;
  color: #737373;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.5;
}
.obk-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
.obk-footer {
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
}
.obk-footer-inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 32px;
  padding-bottom: 32px;
}
.obk-footer-logo {
  display: flex;
  width: 160px;
  height: 48px;
  align-items: center;
}
.obk-footer-logo img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.obk-footer p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}
.obk-lightbox {
  position: fixed;
  inset: 0;
  z-index: 120;
  overflow-y: auto;
  background: rgba(0,0,0,0.7);
  padding: 16px;
}
.obk-lightbox-align {
  display: flex;
  min-height: 100%;
  align-items: center;
  justify-content: center;
}
.obk-lightbox-panel {
  width: 100%;
  max-width: 1024px;
  overflow: hidden;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35);
}
.obk-lightbox-preview {
  display: flex;
  min-height: 60vh;
  align-items: center;
  justify-content: center;
  background: #f7f7f7;
  padding: 40px 32px;
}
.obk-lightbox-checker {
  max-width: 100%;
  overflow: auto;
  border: 1px solid #d4d4d4;
  border-radius: 6px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
}
.obk-lightbox-checker img {
  display: block;
  width: auto;
  max-width: 100%;
  max-height: 70vh;
  height: auto;
}
.obk-lightbox-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-top: 1px solid #e5e5e5;
  padding: 20px;
}
.obk-lightbox-title {
  margin: 0;
  color: #171717;
  font-size: 18px;
  font-weight: 600;
}
.obk-lightbox-file {
  margin: 4px 0 0;
  color: #737373;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
}
.obk-shape-square { border-radius: 0; }
.obk-shape-rounded { border-radius: 22%; }
.obk-shape-round { border-radius: 999px; }
@media (min-width: 640px) {
  .obk-wrap {
    padding-right: 24px;
    padding-left: 24px;
  }
  .obk-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .obk-group-header {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
  .obk-section-heading-row {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
  .obk-color-row-2,
  .obk-color-row-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .obk-banner-control-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .obk-lightbox {
    padding: 32px;
  }
  .obk-lightbox-body {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
@media (min-width: 768px) {
  .obk-avatar-controls {
    grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
  }
  .obk-avatar-divider {
    position: relative;
    display: block;
    align-self: stretch;
    grid-column: 2;
    grid-row: 1 / span 3;
  }
  .obk-avatar-divider::before {
    position: absolute;
    top: -12px;
    bottom: -12px;
    left: 50%;
    width: 1px;
    content: "";
    transform: translateX(-50%);
    background: linear-gradient(to bottom, transparent, #e2e8f0, transparent);
  }
  .obk-avatar-col-left { grid-column: 1; }
  .obk-avatar-col-right { grid-column: 3; }
  .obk-avatar-row-1 { grid-row: 1; }
  .obk-avatar-row-2 { grid-row: 2; }
  .obk-avatar-row-3 { grid-row: 3; }
  .obk-footer-inner {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .obk-footer p {
    text-align: right;
  }
}
@media (min-width: 1024px) {
  .obk-wrap {
    padding-right: 32px;
    padding-left: 32px;
  }
  .obk-header-inner {
    grid-template-columns: minmax(0, 1fr) 360px;
    align-items: center;
  }
  .obk-hero-media {
    justify-content: flex-end;
  }
  .obk-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .obk-avatar-grid {
    grid-template-columns: minmax(0, 1fr) 384px;
    align-items: stretch;
  }
  .obk-color-row-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .obk-banner-control-grid {
    grid-template-columns: minmax(9rem, 1fr) auto auto auto minmax(9rem, 1fr);
    align-items: start;
  }
}
`

function getAssetDownloadHref(downloadUrl: string) {
  return downloadUrl
}

function assetFileLabel(asset: BrandKitAsset) {
  return asset.downloads.map((download) => download.fileName).join(' / ')
}

function getLightboxDownload(asset: BrandKitAsset) {
  return (
    asset.downloads.find((download) => download.format === 'PNG') ??
    asset.downloads.find((download) => download.format === 'SVG') ??
    asset.downloads[0]
  )
}

function getAssetSearchText(asset: BrandKitAsset) {
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
  const compact = getAssetSearchText(asset).replace(/[^a-z0-9]+/g, '')

  return compact.includes('wordmark')
}

function isIconAsset(asset: BrandKitAsset) {
  const text = getAssetSearchText(asset)
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

function normalizeHexColor(value: string) {
  const trimmed = value.trim()

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed
  if (/^[0-9a-f]{6}$/i.test(trimmed)) return `#${trimmed}`

  return '#ffffff'
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

function makeFixedBackgroundOptions(customHex: string): ColorOption[] {
  return [
    { color: null, key: 'transparent', label: 'Transparent' },
    { color: '#05070b', key: 'black', label: 'Black' },
    { color: '#ffffff', key: 'white', label: 'White' },
    { color: normalizeHexColor(customHex), key: 'custom', label: 'Custom' },
  ]
}

function makeFixedBorderOptions(
  colors: BrandKitColor[],
  customHex: string,
): ColorOption[] {
  const primary = findPrimaryColor(colors)

  return [
    { color: primary.hex, key: 'primary', label: 'Primary' },
    { color: '#05070b', key: 'black', label: 'Black' },
    { color: '#ffffff', key: 'white', label: 'White' },
    { color: normalizeHexColor(customHex), key: 'custom', label: 'Custom' },
  ]
}

function inferAvatarIconOptions(
  assets: BrandKitAsset[],
  colors: BrandKitColor[],
): AvatarIconOption[] {
  const primary = findPrimaryColor(colors)
  const colorCandidates = [
    ...colors.map((color, index) => ({
      color: color.hex,
      key: `brand-${index}-${color.hex.toLowerCase()}`,
      label: color.name,
      tokens: tokenize(color.name),
    })),
    {
      color: '#ffffff',
      key: 'white',
      label: 'White',
      tokens: ['white'],
    },
    {
      color: '#05070b',
      key: 'black',
      label: 'Black',
      tokens: ['black'],
    },
  ]
  const options: AvatarIconOption[] = []
  const seen = new Set<string>()

  for (const asset of assets) {
    const text = getAssetSearchText(asset)
    const candidate =
      colorCandidates.find((option) =>
        option.tokens.some((token) => token && text.includes(token)),
      ) ??
      (/\bprimary\b/.test(text)
        ? {
            color: primary.hex,
            key: 'primary',
            label: primary.name,
            tokens: ['primary'],
          }
        : null) ?? {
        color: primary.hex,
        key: `primary-${primary.hex.toLowerCase()}`,
        label: primary.name,
        tokens: ['primary'],
      }
    const key = `${candidate.key}:${asset.id}`

    if (seen.has(candidate.key)) continue

    options.push({
      asset,
      color: candidate.color,
      key,
      label: candidate.label,
    })
    seen.add(candidate.key)
  }

  return options.length
    ? options
    : assets.map((asset, index) => ({
        asset,
        color: primary.hex,
        key: `icon-${index}:${asset.id}`,
        label: primary.name,
      }))
}

function getColorOption(options: ColorOption[], key: string) {
  return options.find((option) => option.key === key) ?? options[0]
}

function getMaxBorderThickness(size: number) {
  return size * avatarMaxBorderRatio
}

function roundBorderThickness(thickness: number) {
  return Math.round(thickness / avatarBorderStep) * avatarBorderStep
}

function getAvatarBorderThickness(
  thickness: AvatarBorderThickness,
  size: number,
) {
  const ratio =
    avatarBorderThicknessOptions.find((option) => option.value === thickness)
      ?.ratio ?? 0

  return roundBorderThickness(getMaxBorderThickness(size) * ratio)
}

function getAvatarShapeClass(shape: AvatarShape) {
  if (shape === 'round') return 'obk-shape-round'
  if (shape === 'rounded') return 'obk-shape-rounded'

  return 'obk-shape-square'
}

function addAvatarShapePath(
  context: CanvasRenderingContext2D,
  size: number,
  shape: AvatarShape,
  inset = 0,
) {
  const edge = size - inset * 2
  const radius = Math.min(edge / 2, Math.max(0, size * 0.22 - inset))

  context.beginPath()

  if (shape === 'round') {
    context.arc(size / 2, size / 2, edge / 2, 0, Math.PI * 2)
    context.closePath()
    return
  }

  if (shape === 'rounded') {
    if (typeof context.roundRect === 'function') {
      context.roundRect(inset, inset, edge, edge, radius)
      context.closePath()
      return
    }

    context.moveTo(inset + radius, inset)
    context.lineTo(inset + edge - radius, inset)
    context.arcTo(inset + edge, inset, inset + edge, inset + radius, radius)
    context.lineTo(inset + edge, inset + edge - radius)
    context.arcTo(
      inset + edge,
      inset + edge,
      inset + edge - radius,
      inset + edge,
      radius,
    )
    context.lineTo(inset + radius, inset + edge)
    context.arcTo(inset, inset + edge, inset, inset + edge - radius, radius)
    context.lineTo(inset, inset + radius)
    context.arcTo(inset, inset, inset + radius, inset, radius)
    context.closePath()
    return
  }

  context.rect(inset, inset, edge, edge)
  context.closePath()
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = document.createElement('img')

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Could not load ${src}`))
    image.src = src
  })
}

async function drawAvatarCanvas({
  backgroundColor,
  borderColor,
  borderThickness,
  canvas,
  iconSrc,
  iconWidthPercent,
  shape,
  size,
  isCurrent = () => true,
}: {
  backgroundColor: string | null
  borderColor: string
  borderThickness: number
  canvas: HTMLCanvasElement
  iconSrc: string
  iconWidthPercent: number
  isCurrent?: () => boolean
  shape: AvatarShape
  size: number
}) {
  const context = canvas.getContext('2d')

  canvas.width = size
  canvas.height = size

  if (!context) throw new Error('Canvas is unavailable.')

  context.clearRect(0, 0, size, size)

  if (borderThickness > 0) {
    context.save()
    addAvatarShapePath(context, size, shape)
    addAvatarShapePath(context, size, shape, borderThickness)
    context.fillStyle = borderColor
    context.fill('evenodd')
    context.restore()
  }

  if (backgroundColor) {
    context.save()
    addAvatarShapePath(context, size, shape, borderThickness)
    context.clip()
    context.fillStyle = backgroundColor
    context.fill()
    context.restore()
  }

  const image = await loadCanvasImage(iconSrc)

  if (!isCurrent()) return

  const maxIconWidth = size * (iconWidthPercent / 100)
  const maxIconHeight = size * (iconWidthPercent / 100)
  const naturalWidth = image.naturalWidth || image.width
  const naturalHeight = image.naturalHeight || image.height
  const scale = Math.min(
    maxIconWidth / naturalWidth,
    maxIconHeight / naturalHeight,
  )
  const iconWidth = naturalWidth * scale
  const iconHeight = naturalHeight * scale

  context.drawImage(
    image,
    (size - iconWidth) / 2,
    (size - iconHeight) / 2,
    iconWidth,
    iconHeight,
  )
}

function createColorRows(manifest: BrandKitManifest): BrandColorRows {
  const colorMap = new Map(
    manifest.brandColors.map((color) => [color.name.toLowerCase(), color]),
  )
  const configuredRows = manifest.colorSections
    .map((section) => ({
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

  if (configuredRows.length) return configuredRows

  const rows: BrandKitColor[][] = []

  for (let index = 0; index < manifest.brandColors.length; index += 3) {
    rows.push(manifest.brandColors.slice(index, index + 3))
  }

  return [{ label: 'Primary', rows }]
}

function getDisplayColorSectionLabel(label: string) {
  return /^brand colors?$/i.test(label.trim()) ? 'Primary' : label
}

function formatAssetCount(count: number) {
  return `${count} ${count === 1 ? 'asset' : 'assets'} available`
}

function DownloadIcon() {
  return <Download aria-hidden className="obk-button-icon" />
}

function UploadIcon() {
  return <Upload aria-hidden className="obk-button-icon" />
}

function ResetIcon() {
  return <RotateCcw aria-hidden className="obk-button-icon" />
}

function AssetDownloadButton({
  download,
}: {
  download: BrandKitAsset['downloads'][number]
}) {
  return (
    <a
      className="obk-button obk-button-dark"
      download={download.fileName}
      href={getAssetDownloadHref(download.url)}
    >
      <DownloadIcon />
      <span>{download.format}</span>
    </a>
  )
}

function DownloadAllButton({ href, label = 'Download all' }: { href: string; label?: string }) {
  return (
    <a className="obk-button" download href={href}>
      <DownloadIcon />
      <span>{label}</span>
    </a>
  )
}

function AssetCard({
  asset,
  onPreview,
}: {
  asset: BrandKitAsset
  onPreview: (asset: BrandKitAsset) => void
}) {
  return (
    <article className="obk-card">
      <button
        className="obk-preview"
        onClick={() => onPreview(asset)}
        style={transparentPreviewStyle}
        type="button"
      >
        <img src={asset.previewUrl} alt={asset.title} loading="lazy" />
      </button>
      <div className="obk-card-body">
        <h4>{asset.title}</h4>
        <div className="obk-button-row">
          {asset.downloads.map((download) => (
            <AssetDownloadButton
              key={`${asset.id}-${download.fileName}`}
              download={download}
            />
          ))}
        </div>
      </div>
    </article>
  )
}

function AssetGroup({
  downloadHref,
  group,
  onPreview,
}: {
  downloadHref: string
  group: BrandKitAssetGroup
  onPreview: (asset: BrandKitAsset) => void
}) {
  return (
    <section className="obk-group">
      <div className="obk-group-header">
        <div>
          <h3>{group.label}</h3>
          {group.description ? <p>{group.description}</p> : null}
        </div>
        <div className="obk-group-actions">
          <span className="obk-asset-count">
            {formatAssetCount(group.items.length)}
          </span>
          <DownloadAllButton href={downloadHref} />
        </div>
      </div>
      <div className="obk-grid">
        {group.items.map((asset) => (
          <AssetCard asset={asset} key={asset.id} onPreview={onPreview} />
        ))}
      </div>
    </section>
  )
}

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1000)
  }

  return (
    <button
      className="obk-copy-button"
      onClick={() => void copy()}
      title={`Copy ${label}`}
      type="button"
    >
      <Copy aria-hidden className="obk-copy-icon" />
      <span>{copied ? 'Copied' : value}</span>
    </button>
  )
}

function ColorCard({ color }: { color: BrandKitColor }) {
  return (
    <article className="obk-color-card">
      <div className="obk-swatch" style={{ backgroundColor: color.hex }} />
      <div className="obk-color-body">
        <h4>{color.name}</h4>
        <div className="obk-button-row">
          <CopyButton label={`${color.name} hex`} value={color.hex} />
        </div>
      </div>
    </article>
  )
}

function AvatarIconColorChip({
  option,
  selected,
  onSelect,
}: {
  onSelect: () => void
  option: AvatarIconOption
  selected: boolean
}) {
  return (
    <button
      aria-pressed={selected}
      className={`obk-chip ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
      type="button"
    >
      <span
        className="obk-chip-preview"
        style={{ backgroundColor: normalizeHexColor(option.color) }}
      />
      <span className="obk-chip-label">{option.label}</span>
    </button>
  )
}

function AvatarColorChip({
  option,
  selected,
  onSelect,
}: {
  onSelect: () => void
  option: ColorOption
  selected: boolean
}) {
  return (
    <button
      aria-pressed={selected}
      className={`obk-chip ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
      type="button"
    >
      <span
        className="obk-chip-preview"
        style={
          option.color
            ? { backgroundColor: normalizeHexColor(option.color) }
            : transparentPreviewStyle
        }
      />
      <span className="obk-chip-label">{option.label}</span>
    </button>
  )
}

function AvatarShapeChip({
  label,
  selected,
  shape,
  onSelect,
}: {
  label: string
  onSelect: () => void
  selected: boolean
  shape: AvatarShape
}) {
  return (
    <button
      aria-pressed={selected}
      className={`obk-chip ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
      type="button"
    >
      <span className="obk-chip-preview">
        <span className={`obk-shape-sample ${getAvatarShapeClass(shape)}`} />
      </span>
      <span className="obk-chip-label">{label}</span>
    </button>
  )
}

function AvatarBorderThicknessChip({
  label,
  selected,
  thickness,
  onSelect,
}: {
  label: string
  onSelect: () => void
  selected: boolean
  thickness: AvatarBorderThickness
}) {
  const previewThickness =
    thickness === 'none'
      ? 1
      : Math.max(
          2,
          Math.round(
            (avatarBorderThicknessOptions.find(
              (option) => option.value === thickness,
            )?.ratio ?? 0) * 14,
          ),
        )

  return (
    <button
      aria-pressed={selected}
      className={`obk-chip ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
      type="button"
    >
      <span className="obk-chip-preview">
        <span
          className="obk-border-sample"
          style={{
            boxShadow:
              thickness === 'none'
                ? `inset 0 0 0 ${previewThickness}px #cbd5e1`
                : `inset 0 0 0 ${previewThickness}px #0d2249`,
          }}
        />
      </span>
      <span className="obk-chip-label">{label}</span>
    </button>
  )
}

function AvatarSizeChip({
  selected,
  size,
  onSelect,
}: {
  onSelect: () => void
  selected: boolean
  size: number
}) {
  return (
    <button
      aria-pressed={selected}
      className={`obk-chip ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
      type="button"
    >
      <span className="obk-chip-preview">{size}</span>
      <span className="obk-chip-label">{size}px</span>
    </button>
  )
}

function AvatarGenerator({
  assets,
  canUseDevActions,
  colors,
  endpoints,
}: {
  assets: BrandKitAsset[]
  canUseDevActions: boolean
  colors: BrandKitColor[]
  endpoints?: BrandKitPageEndpoints
}) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const iconOptions = useMemo(
    () => inferAvatarIconOptions(assets, colors),
    [assets, colors],
  )
  const [iconKey, setIconKey] = useState(iconOptions[0]?.key ?? '')
  const [background, setBackground] = useState('transparent')
  const [backgroundCustomHex, setBackgroundCustomHex] = useState('#4784de')
  const [border, setBorder] = useState('primary')
  const [borderCustomHex, setBorderCustomHex] = useState('#4784de')
  const [borderThickness, setBorderThickness] =
    useState<AvatarBorderThickness>('none')
  const [shape, setShape] = useState<AvatarShape>('square')
  const [padding, setPadding] = useState(18)
  const [avatarSize, setAvatarSize] = useState(1024)
  const [status, setStatus] = useState('')
  const [isInstallingFavicon, setInstallingFavicon] = useState(false)
  const backgroundOptions = useMemo(
    () => makeFixedBackgroundOptions(backgroundCustomHex),
    [backgroundCustomHex],
  )
  const borderOptions = useMemo(
    () => makeFixedBorderOptions(colors, borderCustomHex),
    [borderCustomHex, colors],
  )
  const selectedIconOption =
    iconOptions.find((option) => option.key === iconKey) ?? iconOptions[0] ?? null
  const selectedAsset = selectedIconOption?.asset ?? null
  const selectedBackground = getColorOption(backgroundOptions, background)
  const selectedBorder = getColorOption(borderOptions, border)
  const backgroundColor = selectedBackground?.color ?? null
  const borderColor = selectedBorder?.color ?? '#05070b'
  const borderThicknessPixels = getAvatarBorderThickness(
    borderThickness,
    avatarSize,
  )
  const iconWidthPercent = 100 - padding * 2
  const previewSurfaceStyle =
    !backgroundColor || shape !== 'square' ? transparentPreviewStyle : undefined
  const canInstallFavicon = canUseDevActions && Boolean(endpoints?.favicon)

  useEffect(() => {
    if (!selectedIconOption && iconOptions[0]) {
      setIconKey(iconOptions[0].key)
    }
  }, [iconOptions, selectedIconOption])

  useEffect(() => {
    const canvas = previewCanvasRef.current

    if (!canvas || !selectedAsset) return

    let isCurrent = true

    drawAvatarCanvas({
      backgroundColor,
      borderColor,
      borderThickness: borderThicknessPixels,
      canvas,
      iconSrc: selectedAsset.previewUrl,
      iconWidthPercent,
      shape,
      size: avatarSize,
      isCurrent: () => isCurrent,
    }).catch(() => {
      if (isCurrent) setStatus('Could not render avatar preview.')
    })

    return () => {
      isCurrent = false
    }
  }, [
    avatarSize,
    backgroundColor,
    borderColor,
    borderThicknessPixels,
    iconWidthPercent,
    selectedAsset,
    shape,
  ])

  function resetAvatarGenerator() {
    setIconKey(iconOptions[0]?.key ?? '')
    setBackground('transparent')
    setBackgroundCustomHex('#4784de')
    setBorder('primary')
    setBorderCustomHex('#4784de')
    setBorderThickness('none')
    setShape('square')
    setPadding(18)
    setAvatarSize(1024)
    setStatus('')
  }

  async function createAvatarCanvas(targetSize = avatarSize) {
    if (!selectedAsset) throw new Error('Choose an icon first.')

    const canvas = document.createElement('canvas')

    await drawAvatarCanvas({
      backgroundColor,
      borderColor,
      borderThickness: getAvatarBorderThickness(borderThickness, targetSize),
      canvas,
      iconSrc: selectedAsset.previewUrl,
      iconWidthPercent,
      shape,
      size: targetSize,
    })

    return canvas
  }

  async function downloadAvatar(targetSize = avatarSize, fileName?: string) {
    const canvas = await createAvatarCanvas(targetSize)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          resolve(result)
          return
        }

        reject(new Error('Could not export PNG.'))
      }, 'image/png')
    })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = objectUrl
    link.download = fileName ?? `brand-avatar-${targetSize}px.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }

  async function downloadFavicons() {
    for (const faviconSize of [16, 32, 180, 192, 512]) {
      await downloadAvatar(
        faviconSize,
        faviconSize === 180
          ? 'apple-touch-icon.png'
          : `favicon-${faviconSize}x${faviconSize}.png`,
      )
    }

    setStatus('Downloaded favicon PNGs.')
  }

  async function installFavicons() {
    if (!endpoints?.favicon) return

    setInstallingFavicon(true)
    setStatus('Installing favicon files...')

    try {
      const canvas = await createAvatarCanvas(1024)
      const response = await fetch(endpoints.favicon, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: canvas.toDataURL('image/png') }),
      })
      const result = (await response.json()) as {
        error?: string
        files?: string[]
      }

      if (!response.ok) {
        throw new Error(result.error ?? 'Could not install favicon files.')
      }

      setStatus(`Installed ${result.files?.length ?? 0} favicon files.`)
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Could not install favicon files.',
      )
    } finally {
      setInstallingFavicon(false)
    }
  }

  if (!assets.length) return null

  return (
    <section className="obk-avatar">
      <div>
        <h3 className="obk-avatar-title">Avatar Generator</h3>
        <p className="obk-avatar-intro">
          Make a profile-ready PNG from the approved icon.
        </p>
      </div>
      <div className="obk-avatar-grid">
        <div className="obk-avatar-controls">
          <button
            aria-label="Reset avatar generator"
            className="obk-reset-button"
            onClick={resetAvatarGenerator}
            title="Reset avatar generator"
            type="button"
          >
            <ResetIcon />
          </button>
          <div className="obk-avatar-control-group obk-avatar-col-left obk-avatar-row-1">
            <p className="obk-control-title">Icon</p>
            <div className="obk-chip-row">
              {iconOptions.map((option) => (
                <AvatarIconColorChip
                  key={option.key}
                  option={option}
                  selected={selectedIconOption?.key === option.key}
                  onSelect={() => setIconKey(option.key)}
                />
              ))}
            </div>
          </div>
          <div className="obk-avatar-control-group obk-avatar-col-left obk-avatar-row-2">
            <p className="obk-control-title">Background</p>
            <div className="obk-chip-row">
              {backgroundOptions.map((option) => (
                <AvatarColorChip
                  key={option.key}
                  option={option}
                  selected={selectedBackground?.key === option.key}
                  onSelect={() => setBackground(option.key)}
                />
              ))}
            </div>
            {background === 'custom' ? (
              <label className="obk-custom-color-label">
                Custom
                <span className="obk-custom-color-row">
                  <input
                    aria-label="Custom background color"
                    onChange={(event) =>
                      setBackgroundCustomHex(event.currentTarget.value)
                    }
                    type="color"
                    value={normalizeHexColor(backgroundCustomHex)}
                  />
                  <input
                    aria-label="Custom background hex"
                    onChange={(event) =>
                      setBackgroundCustomHex(event.currentTarget.value)
                    }
                    type="text"
                    value={backgroundCustomHex}
                  />
                </span>
              </label>
            ) : null}
          </div>
          <div className="obk-avatar-control-group obk-avatar-col-left obk-avatar-row-3">
            <p className="obk-control-title">Shape</p>
            <div className="obk-chip-row">
              {avatarShapeOptions.map((option) => (
                <AvatarShapeChip
                  key={option.value}
                  label={option.label}
                  shape={option.value}
                  selected={shape === option.value}
                  onSelect={() => setShape(option.value)}
                />
              ))}
            </div>
          </div>
          <div className="obk-avatar-divider" aria-hidden="true" />
          <div className="obk-avatar-control-group obk-avatar-col-right obk-avatar-row-1">
            <p className="obk-control-title">Border color</p>
            <div className="obk-chip-row">
              {borderOptions.map((option) => (
                <AvatarColorChip
                  key={option.key}
                  option={option}
                  selected={selectedBorder?.key === option.key}
                  onSelect={() => setBorder(option.key)}
                />
              ))}
            </div>
            {border === 'custom' ? (
              <label className="obk-custom-color-label">
                Custom
                <span className="obk-custom-color-row">
                  <input
                    aria-label="Custom border color"
                    onChange={(event) =>
                      setBorderCustomHex(event.currentTarget.value)
                    }
                    type="color"
                    value={normalizeHexColor(borderCustomHex)}
                  />
                  <input
                    aria-label="Custom border hex"
                    onChange={(event) =>
                      setBorderCustomHex(event.currentTarget.value)
                    }
                    type="text"
                    value={borderCustomHex}
                  />
                </span>
              </label>
            ) : null}
          </div>
          <div className="obk-avatar-control-group obk-avatar-col-right obk-avatar-row-2">
            <p className="obk-control-title">Border thickness</p>
            <div className="obk-chip-row">
              {avatarBorderThicknessOptions.map((option) => (
                <AvatarBorderThicknessChip
                  key={option.value}
                  label={option.label}
                  thickness={option.value}
                  selected={borderThickness === option.value}
                  onSelect={() => setBorderThickness(option.value)}
                />
              ))}
            </div>
          </div>
          <div className="obk-avatar-control-group obk-avatar-col-right obk-avatar-row-3">
            <p className="obk-control-title">Size</p>
            <div className="obk-chip-row">
              {avatarSizeOptions.map((size) => (
                <AvatarSizeChip
                  key={size}
                  size={size}
                  selected={avatarSize === size}
                  onSelect={() => setAvatarSize(size)}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="obk-avatar-preview">
          <span
            className={`obk-avatar-surface ${getAvatarShapeClass(shape)}`}
            style={previewSurfaceStyle}
          >
            <canvas ref={previewCanvasRef} aria-label="Avatar preview" />
          </span>
          <label className="obk-avatar-range">
            <span>Icon padding</span>
            <input
              max="34"
              min="0"
              onChange={(event) => setPadding(Number(event.currentTarget.value))}
              type="range"
              value={padding}
            />
          </label>
          <button
            className="obk-button obk-button-favicon"
            onClick={() => void downloadAvatar()}
            type="button"
          >
            <DownloadIcon />
            <span>Download PNG ({avatarSize}px)</span>
          </button>
          <button
            className="obk-button"
            onClick={() => void downloadFavicons()}
            type="button"
          >
            <DownloadIcon />
            <span>Download favicon PNGs</span>
          </button>
          {canInstallFavicon ? (
            <button
              className="obk-button"
              disabled={isInstallingFavicon}
              onClick={() => void installFavicons()}
              type="button"
            >
              <UploadIcon />
              <span>
                {isInstallingFavicon ? 'Installing favicon...' : 'Install as favicon'}
              </span>
            </button>
          ) : null}
          {status ? <p className="obk-status">{status}</p> : null}
        </div>
      </div>
    </section>
  )
}

function BannerPresetSelect({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean
  label: string
  onChange: (value: string) => void
  options: readonly { key: string; label: string }[]
  value: string
}) {
  return (
    <fieldset className="obk-banner-control">
      <legend>{label}</legend>
      <select
        className="obk-select"
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </fieldset>
  )
}

function BannerDotGroup({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean
  label: string
  onChange: (value: string) => void
  options: readonly { hex: string; key: string; label: string }[]
  value: string
}) {
  return (
    <fieldset className="obk-banner-control">
      <legend>{label}</legend>
      <div className="obk-dot-group">
        {options.map((option) => (
          <button
            aria-label={`${label}: ${option.label}`}
            className={`obk-control-button obk-dot-button ${
              value === option.key ? 'is-selected' : ''
            }`}
            disabled={disabled}
            key={option.key}
            onClick={() => onChange(option.key)}
            title={option.label}
            type="button"
          >
            <span
              className="obk-color-dot"
              style={{ backgroundColor: option.hex }}
            />
          </button>
        ))}
      </div>
    </fieldset>
  )
}

const bannerAlignmentIcons: Record<string, LucideIcon> = {
  center: AlignCenter,
  left: AlignLeft,
  right: AlignRight,
}

function BannerAlignmentGroup({
  disabled,
  onChange,
  options,
  value,
}: {
  disabled?: boolean
  onChange: (value: string) => void
  options: readonly { key: string; label: string }[]
  value: string
}) {
  return (
    <fieldset className="obk-banner-control">
      <legend>Align</legend>
      <div className="obk-align-group">
        {options.map((option) => {
          const Icon = bannerAlignmentIcons[option.key] ?? AlignCenter

          return (
            <button
              aria-label={`Align ${option.label.toLowerCase()}`}
              className={`obk-control-button obk-align-button ${
                value === option.key ? 'is-selected' : ''
              }`}
              disabled={disabled}
              key={option.key}
              onClick={() => onChange(option.key)}
              title={option.label}
              type="button"
            >
              <Icon aria-hidden className="obk-align-svg" />
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function BannerPresetControls({
  controls,
  endpoint,
  onUpdated,
}: {
  controls: BrandKitBannerControls
  endpoint: string
  onUpdated: () => void
}) {
  function getMarkColorOptions(markVariantKey: string) {
    const markVariant = controls.markVariants.find(
      (variant) => variant.key === markVariantKey,
    )

    if (markVariant?.colorOptions?.length) return markVariant.colorOptions
    if (!markVariant?.colorKeys?.length) return controls.colors

    const filtered = controls.colors.filter((color) =>
      markVariant.colorKeys?.includes(color.key),
    )

    return filtered.length ? filtered : controls.colors
  }

  function getDefaultMarkColor(markVariantKey: string) {
    return (
      getMarkColorOptions(markVariantKey)[0]?.key ??
      ''
    )
  }

  const defaultState = useMemo<BannerPresetState>(
    () => {
      const markVariant = controls.markVariants[0]?.key ?? ''

      return {
        alignment: 'center',
        backgroundColor: controls.colors[0]?.key ?? '',
        markColor: getDefaultMarkColor(markVariant),
        markVariant,
        pattern: controls.patterns[0]?.key ?? 'diagonal-sweep',
        secondaryColor: controls.colors[2]?.key ?? controls.colors[0]?.key ?? '',
      }
    },
    [controls],
  )
  const [state, setState] = useState(defaultState)
  const [isApplying, setApplying] = useState(false)
  const [status, setStatus] = useState('')
  const markColorOptions = getMarkColorOptions(state.markVariant)

  async function apply(nextState: BannerPresetState) {
    setApplying(true)
    setStatus('Updating banners...')

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextState),
      })
      const result = (await response.json()) as {
        error?: string
        files?: string[]
      }

      if (!response.ok) {
        throw new Error(result.error ?? 'Could not update banner presets.')
      }

      setStatus(`Updated ${result.files?.length ?? 0} banner files.`)
      onUpdated()
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Could not update banner presets.',
      )
    } finally {
      setApplying(false)
    }
  }

  function update<Key extends keyof BannerPresetState>(
    key: Key,
    value: BannerPresetState[Key],
  ) {
    const nextState = { ...state, [key]: value }

    if (key === 'markVariant') {
      const nextMarkColorOptions = getMarkColorOptions(String(value))

      if (!nextMarkColorOptions.some((option) => option.key === nextState.markColor)) {
        nextState.markColor = nextMarkColorOptions[0]?.key ?? ''
      }
    }

    setState(nextState)
    void apply(nextState)
  }

  return (
    <div className="obk-banner-controls">
      <div className="obk-banner-control-grid">
        <BannerPresetSelect
          disabled={isApplying}
          label="Mark"
          onChange={(value) => update('markVariant', value)}
          options={controls.markVariants}
          value={state.markVariant}
        />
        <BannerDotGroup
          disabled={isApplying}
          label="Color"
          onChange={(value) => update('markColor', value)}
          options={markColorOptions}
          value={state.markColor}
        />
        <BannerAlignmentGroup
          disabled={isApplying}
          onChange={(value) => update('alignment', value)}
          options={controls.alignments}
          value={state.alignment}
        />
        <BannerDotGroup
          disabled={isApplying}
          label="Base"
          onChange={(value) => update('backgroundColor', value)}
          options={controls.colors}
          value={state.backgroundColor}
        />
        <BannerPresetSelect
          disabled={isApplying}
          label="Pattern"
          onChange={(value) => update('pattern', value)}
          options={controls.patterns}
          value={state.pattern}
        />
      </div>
      {status ? <p className="obk-status">{status}</p> : null}
    </div>
  )
}

function BannerCard({
  asset,
  canUpload,
  endpoint,
  isCustom,
  previewVersion,
  onCustomStateChange,
  onUpdated,
}: {
  asset: BrandKitBannerAsset
  canUpload: boolean
  endpoint?: string
  isCustom: boolean
  onCustomStateChange: (assetId: string, isCustom: boolean) => void
  onUpdated: () => void
  previewVersion: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')
  const [isReplacing, setReplacing] = useState(false)
  const [isResetting, setResetting] = useState(false)
  const previewUrl = previewVersion
    ? `${asset.previewUrl}?v=${previewVersion}`
    : asset.previewUrl
  const previewWidth = Math.round(asset.width * bannerPreviewScale)

  async function replaceBanner(file: File) {
    if (!endpoint) return

    const formData = new FormData()

    formData.append('assetId', asset.id)
    formData.append('file', file)
    setReplacing(true)
    setStatus('Replacing banner...')

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })
      const result = (await response.json()) as {
        error?: string
        isCustom?: boolean
      }

      if (!response.ok) {
        throw new Error(result.error ?? 'Could not replace banner image.')
      }

      onCustomStateChange(asset.id, result.isCustom ?? true)
      setStatus('Custom banner uploaded.')
      onUpdated()
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Could not replace banner image.',
      )
    } finally {
      setReplacing(false)
    }
  }

  async function resetBanner() {
    if (!endpoint) return

    setResetting(true)
    setStatus('Resetting banner...')

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', assetId: asset.id }),
      })
      const result = (await response.json()) as {
        error?: string
        isCustom?: boolean
      }

      if (!response.ok) {
        throw new Error(result.error ?? 'Could not reset banner image.')
      }

      onCustomStateChange(asset.id, result.isCustom ?? false)
      setStatus('Banner reset to default.')
      onUpdated()
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Could not reset banner image.',
      )
    } finally {
      setResetting(false)
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]

    event.currentTarget.value = ''
    if (file) void replaceBanner(file)
  }

  return (
    <article className="obk-banner-card" style={{ width: previewWidth }}>
      <div
        className="obk-banner-preview"
        style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
      >
        <img src={previewUrl} alt={asset.title} loading="lazy" />
      </div>
      <div className="obk-banner-card-body">
        <div>
          <h4>{asset.title}</h4>
          <p>{asset.description}</p>
        </div>
        <div className="obk-button-row">
          {asset.downloads.map((download) => (
            <AssetDownloadButton
              key={`${asset.id}-${download.fileName}`}
              download={download}
            />
          ))}
          {canUpload ? (
            <>
              <input
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="obk-file-input"
                onChange={handleFileChange}
                ref={inputRef}
                type="file"
              />
              <button
                className="obk-file-button"
                disabled={isReplacing}
                onClick={() => inputRef.current?.click()}
                type="button"
              >
                <UploadIcon />
                <span>{isReplacing ? 'Uploading...' : 'Upload Custom'}</span>
              </button>
              {isCustom ? (
                <button
                  aria-label="Reset to default"
                  className="obk-file-button obk-icon-button"
                  disabled={isReplacing || isResetting}
                  onClick={() => void resetBanner()}
                  title="Reset to default"
                  type="button"
                >
                  <ResetIcon />
                </button>
              ) : null}
            </>
          ) : null}
        </div>
        {status ? <p className="obk-status">{status}</p> : null}
      </div>
    </article>
  )
}

function BannerGroup({
  canUseDevActions,
  customBannerIds,
  endpoints,
  group,
  previewVersion,
  onCustomStateChange,
  onUpdated,
}: {
  canUseDevActions: boolean
  customBannerIds: ReadonlySet<string>
  endpoints?: BrandKitPageEndpoints
  group: BrandKitBannerGroup
  onCustomStateChange: (assetId: string, isCustom: boolean) => void
  onUpdated: () => void
  previewVersion: number
}) {
  return (
    <section className="obk-banner-group">
      <div>
        <h3>{group.label}</h3>
        {group.description ? <p>{group.description}</p> : null}
      </div>
      <div className="obk-banner-list">
        {group.items.map((asset) => (
          <BannerCard
            asset={asset}
            canUpload={canUseDevActions && Boolean(endpoints?.bannerUpload)}
            endpoint={endpoints?.bannerUpload}
            isCustom={customBannerIds.has(asset.id)}
            key={asset.id}
            onCustomStateChange={onCustomStateChange}
            onUpdated={onUpdated}
            previewVersion={previewVersion}
          />
        ))}
      </div>
    </section>
  )
}

function Lightbox({
  asset,
  onClose,
}: {
  asset: BrandKitAsset | null
  onClose: () => void
}) {
  const lightboxDownload = asset ? getLightboxDownload(asset) : null

  useEffect(() => {
    if (!asset) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', closeOnEscape)

    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [asset, onClose])

  if (!asset) return null

  return (
    <div
      aria-modal="true"
      className="obk-lightbox"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="dialog"
    >
      <div className="obk-lightbox-align">
        <div className="obk-lightbox-panel">
          <div className="obk-lightbox-preview">
            <div className="obk-lightbox-checker" style={transparentPreviewStyle}>
              <img
                src={lightboxDownload?.url ?? asset.previewUrl}
                alt={asset.title}
              />
            </div>
          </div>
          <div className="obk-lightbox-body">
            <div>
              <h2 className="obk-lightbox-title">{asset.title}</h2>
              <p className="obk-lightbox-file">
                {lightboxDownload?.fileName ?? assetFileLabel(asset)}
              </p>
            </div>
            <div className="obk-button-row">
              <button className="obk-button" onClick={onClose} type="button">
                Close
              </button>
              {asset.downloads.map((download) => (
                <AssetDownloadButton
                  key={`${asset.id}-${download.fileName}`}
                  download={download}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function BrandKitPage({
  bannerControls,
  canUseDevActions = true,
  endpoints,
  manifest,
}: BrandKitPageProps) {
  const [selectedAsset, setSelectedAsset] = useState<BrandKitAsset | null>(null)
  const [bannerPreviewVersion, setBannerPreviewVersion] = useState(0)
  const [customBannerIds, setCustomBannerIds] = useState(
    () =>
      new Set(
        manifest.bannerGroups.flatMap((group) =>
          group.items.filter((asset) => asset.isCustom).map((asset) => asset.id),
        ),
      ),
  )
  const avatarAssets = useMemo(
    () => findAvatarAssets(manifest.assetGroups),
    [manifest.assetGroups],
  )
  const brandColorRows = useMemo(() => createColorRows(manifest), [manifest])
  const assetCount = useMemo(
    () =>
      manifest.assetGroups.reduce((total, group) => total + group.items.length, 0),
    [manifest.assetGroups],
  )
  const bannerAssetCount = useMemo(
    () =>
      manifest.bannerGroups.reduce(
        (total, group) => total + group.items.length,
        0,
      ),
    [manifest.bannerGroups],
  )
  const totalAssetCount = assetCount + bannerAssetCount
  const heroAsset = useMemo(
    () => findHeroAsset(manifest.assetGroups),
    [manifest.assetGroups],
  )
  const footerAsset = useMemo(
    () => findFooterAsset(manifest.assetGroups),
    [manifest.assetGroups],
  )
  const currentYear = new Date().getFullYear()
  const brandLabel = manifest.brand.shortName ?? manifest.brand.name
  const homeUrl = manifest.brand.homeUrl ?? '/'
  const allDownloadHref = `${manifest.route}/download/all`
  const bannerDownloadHref = `${manifest.route}/download/banners`
  const canInstallFavicons =
    canUseDevActions && process.env.NODE_ENV !== 'production'
  const canUseBannerActions = canUseDevActions
  const canUseCustomBannerUploads =
    canUseDevActions && process.env.NODE_ENV !== 'production'

  function updateCustomBannerState(assetId: string, isCustom: boolean) {
    setCustomBannerIds((current) => {
      const next = new Set(current)

      if (isCustom) {
        next.add(assetId)
      } else {
        next.delete(assetId)
      }

      return next
    })
  }

  function scrollToSection(
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) {
    event.preventDefault()

    const target = document.getElementById(sectionId)

    if (!target) return

    window.history.pushState(null, '', `#${sectionId}`)
    target.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="obk-shell">
      <style>{styles}</style>
      <header className="obk-header">
        <div className="obk-wrap obk-header-inner">
          <div>
            <a className="obk-brand-link" href={homeUrl}>
              {brandLabel}
            </a>
            <h1 className="obk-title">Brand Kit</h1>
            <p className="obk-copy">{deterministicIntro}</p>
            <nav className="obk-nav" aria-label="Brand Kit sections">
              <a
                className="obk-nav-link"
                href="#logos"
                onClick={(event) => scrollToSection(event, 'logos')}
              >
                <ArrowDown aria-hidden className="obk-nav-icon" />
                <span>Logos</span>
              </a>
              <a
                className="obk-nav-link"
                href="#colors"
                onClick={(event) => scrollToSection(event, 'colors')}
              >
                <ArrowDown aria-hidden className="obk-nav-icon" />
                <span>Colors</span>
              </a>
              {manifest.bannerGroups.length ? (
                <a
                  className="obk-nav-link"
                  href="#banners"
                  onClick={(event) => scrollToSection(event, 'banners')}
                >
                  <ArrowDown aria-hidden className="obk-nav-icon" />
                  <span>Banners</span>
                </a>
              ) : null}
              <span className="obk-asset-count">
                {formatAssetCount(totalAssetCount)}
              </span>
              {manifest.downloads.allAssets ? (
                <DownloadAllButton href={allDownloadHref} />
              ) : null}
            </nav>
          </div>
          {heroAsset ? (
            <div className="obk-hero-media">
              <div className="obk-hero-asset">
                <img src={heroAsset.previewUrl} alt={heroAsset.title} />
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <main>
        <section className="obk-section obk-section-muted" id="logos">
          <div className="obk-wrap obk-section-inner">
            <div className="obk-section-heading">
              <p className="obk-eyebrow">Logos</p>
              <h2>Approved marks</h2>
            </div>
            <div className="obk-stack">
              {manifest.assetGroups.map((group) => (
                <AssetGroup
                  downloadHref={`${manifest.route}/download/${group.key}`}
                  group={group}
                  key={group.key}
                  onPreview={setSelectedAsset}
                />
              ))}
              <AvatarGenerator
                assets={avatarAssets}
                canUseDevActions={canInstallFavicons}
                colors={manifest.brandColors}
                endpoints={endpoints}
              />
            </div>
          </div>
        </section>

        <section className="obk-section" id="colors">
          <div className="obk-wrap obk-section-inner">
            <div className="obk-section-heading">
              <p className="obk-eyebrow">Colors</p>
              <h2>Color system</h2>
            </div>
            <div className="obk-color-group">
              <div>
                <h3>Brand Colors</h3>
                <p>Core digital colors for product and web work.</p>
              </div>
              <div className="obk-color-sections">
                {brandColorRows.map((section) => (
                  <section className="obk-color-section" key={section.label}>
                    <h4 className="obk-color-section-title">{section.label}</h4>
                    <div className="obk-color-rows">
                      {section.rows.map((row, index) => (
                        <div
                          className={`obk-color-row obk-color-row-${Math.min(
                            row.length,
                            3,
                          )}`}
                          key={`${section.label}-${index}`}
                        >
                          {row.map((color) => (
                            <ColorCard color={color} key={color.name} />
                          ))}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </section>

        {manifest.bannerGroups.length ? (
          <section className="obk-section-banners" id="banners">
            <div className="obk-wrap obk-section-inner">
              <div className="obk-section-heading-row">
                <div className="obk-section-heading">
                  <p className="obk-eyebrow">Banners</p>
                  <h2>Social profile assets</h2>
                  <p>Ready-to-use PNG cover images sized for each platform.</p>
                </div>
                <div className="obk-group-actions obk-section-heading-actions">
                  <span className="obk-asset-count">
                    {formatAssetCount(bannerAssetCount)}
                  </span>
                  {manifest.downloads.bannerAssets ? (
                    <DownloadAllButton href={bannerDownloadHref} />
                  ) : null}
                </div>
              </div>
              {canUseBannerActions && endpoints?.bannerPresets && bannerControls ? (
                <BannerPresetControls
                  controls={bannerControls}
                  endpoint={endpoints.bannerPresets}
                  onUpdated={() => setBannerPreviewVersion(Date.now())}
                />
              ) : null}
              <div className="obk-banner-stack">
                {manifest.bannerGroups.map((group) => (
                  <BannerGroup
                    canUseDevActions={canUseCustomBannerUploads}
                    customBannerIds={customBannerIds}
                    endpoints={endpoints}
                    group={group}
                    key={group.key}
                    onCustomStateChange={updateCustomBannerState}
                    onUpdated={() => setBannerPreviewVersion(Date.now())}
                    previewVersion={bannerPreviewVersion}
                  />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="obk-footer">
        <div className="obk-wrap obk-footer-inner">
          {footerAsset ? (
            <div className="obk-footer-logo">
              <img src={footerAsset.previewUrl} alt={footerAsset.title} />
            </div>
          ) : null}
          <p>
            &copy; {currentYear} {manifest.brand.name}. All rights reserved.
          </p>
        </div>
      </footer>
      <Lightbox asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  )
}
