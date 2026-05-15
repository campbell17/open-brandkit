# Open BrandKit

Open BrandKit is an early-stage installer and build package that turns brand
source files into a working `/brandkit` page inside an existing website repo.

Current package version: `0.1.2`.

The intended developer story is:

```bash
npx open-brandkit init --install --build
```

After installation, the host site can serve:

```text
https://example.com/brandkit
```

with deterministic brand-kit styling, logo downloads, color cards, generated
social banners, avatar generation, favicon generation, a manifest, and zip
downloads.

The rendered page intentionally follows the deterministic style contract
extracted from the Sequel Brand Kit reference. New installs should vary by brand
inputs only: brand name, logo files, icon files, wordmarks, colors, and generated
assets. See `docs/STYLE_CONTRACT.md`.

## Current State

Open BrandKit now has a working package shape:

- Framework-neutral core logic in `src/core`.
- CLI `init` and `build` commands in `src/cli`.
- Next.js App Router adapter in `src/adapters/next`.
- Deterministic Brand Kit UI rendered by `BrandKitPage`.
- Generated `/brandkit` static assets and `brandkit.manifest.json`.
- Logo lockup, wordmark, and icon grouping.
- Brand color extraction from Markdown tables, JSON, CSV, or literal config.
- Avatar generator controls for icon, shape, background, border color, and border thickness.
- Social banner generator controls for mark, mark asset variant, base color, alignment, and pattern.
- Favicon generation and install handler.
- Dev-time banner replacement, banner preset regeneration, favicon install, and downloads through Next route handlers.

The package is not ready for npm publishing yet. It is currently being developed
from the GitHub repo and local package tarballs.

## Inputs

The minimum useful inputs are intentionally small:

- A folder of approved logo assets.
- A color source file.

Logo assets can include logo lockups, wordmarks, and icons. The installer
classifies files by filename tokens such as `logo`, `wordmark`, `icon`,
`symbol`, and `favicon`.

For social banners, the mark color selector is really an asset variant selector.
The installer creates one option per detected mark file and uses filename tokens
or SVG fill colors to choose a reasonable swatch. For example:

```text
public/logos/acme-logo.svg
public/logos/acme-logo-blue.svg
public/logos/acme-logo-white.svg
public/logos/acme-wordmark-black.svg
public/logos/acme-icon-green.svg
```

Optional config can add custom grouping rules, banner presets, mark variants,
output paths, descriptions, and display metadata.

## Install Into Next

In a Next.js app that already has logos and colors:

```bash
npx open-brandkit init --install --build
```

The wizard asks for:

- Brand name.
- Short brand name.
- Logo directory.
- Colors file.
- Route, defaulting to `/brandkit`.
- Next app directory, usually `app` or `src/app`.

It writes:

- `brandkit.config.ts`
- `app/brandkit/page.tsx` or `src/app/brandkit/page.tsx`
- route handlers for favicon install, banner upload, banner preset regeneration, and downloads
- `package.json` script wiring
- generated `public/brandkit` assets when `--build` is used

For noninteractive setup:

```bash
npx open-brandkit init \
  --yes \
  --install \
  --framework next \
  --brand "Acme Studio" \
  --short-name Acme \
  --logos public/logos \
  --colors docs/brand-colors.md \
  --route /brandkit \
  --app-dir src/app \
  --build
```

Existing files are skipped unless `--force` is passed.

After changing source logos or colors, run:

```bash
npm run brandkit:build
```

The build output includes the Open BrandKit version used, which helps confirm
which package build generated the assets.

## Build Command

For local package development:

```bash
npm install
npm run build
node dist/cli/index.js build --config brandkit.config.example.ts
```

That writes:

```text
public/brandkit/index.html
public/brandkit/brandkit.manifest.json
public/brandkit/logos/*
public/brandkit/banners/*
public/brandkit/downloads/*.zip
```

The static HTML output is useful for previewing and for simple hosts. The full
Sequel-style interactive experience in a Next app uses the Next adapter and
route handlers.

## Next.js Adapter

The installer writes the route files automatically. They can also be wired
manually.

Page route:

```tsx
import { BrandKitPage, getBrandKitNextPageProps } from 'open-brandkit/next'

import config from '@/brandkit.config'

export default async function BrandKitRoute() {
  const props = await getBrandKitNextPageProps(config)
  const route = config.route ?? '/brandkit'

  return (
    <BrandKitPage
      {...props}
      endpoints={{
        bannerPresets: `${route}/banners/presets`,
        bannerUpload: `${route}/banners`,
        favicon: `${route}/favicon`,
      }}
    />
  )
}
```

Favicon route:

```ts
import { createBrandKitFaviconHandler } from 'open-brandkit/next/server'

import config from '@/brandkit.config'

export const runtime = 'nodejs'
export const { POST } = createBrandKitFaviconHandler(config)
```

Banner preset route:

```ts
import { createBrandKitBannerPresetHandler } from 'open-brandkit/next/server'

import config from '@/brandkit.config'

export const runtime = 'nodejs'
export const { POST } = createBrandKitBannerPresetHandler(config)
```

Download route:

```ts
import { createBrandKitDownloadHandler } from 'open-brandkit/next/server'

export const runtime = 'nodejs'
export const { GET } = createBrandKitDownloadHandler()
```

Keep route handlers on `open-brandkit/next/server`. The page route should import
from `open-brandkit/next`; server routes use Sharp native bindings for favicon
and banner operations.

Write actions are blocked in production.

## Repository Layout

```text
src/core/          Framework-neutral config, parsing, asset discovery, rendering, build logic
src/cli/           init/build command entry point
src/adapters/next/ Next.js App Router adapter
docs/              Product notes, extraction notes, and style contract
fixtures/          Brand-neutral color fixture inputs
public/brandkit-source/
                   Brand-neutral logo fixtures for local example builds
```

## Publishing Shape

Before public npm release:

- Flip `private` off in `package.json`.
- Decide whether the package should publish as `open-brandkit` or under a scope.
- Add tests around asset classification, config loading, banner rendering, and Next route handlers.
- Add a real example Next app.
- Tighten README install paths for npm users instead of local tarball testers.
- Decide whether host apps should commit generated `public/brandkit` artifacts or regenerate them in CI.

