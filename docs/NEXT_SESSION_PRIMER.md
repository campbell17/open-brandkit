# Next Session Primer

You are working in `/Users/tim/Projects/open-brandkit`.

This repo is a fresh scaffold for extracting the Brand Kit system built inside `/Users/tim/Projects/sequel-website` into a standalone, open-source package.

## What This Is

The Sequel website now has a mature `/brandkit` page with:

- logo asset discovery and grouped downloads
- color cards from a Markdown color source
- copy-to-clipboard color chips with toast feedback
- avatar generator controls
- favicon installation from the generated avatar
- social banner previews/downloads
- local-dev-only banner replacement uploads
- local-dev-only deterministic banner preset controls
- deterministic visual styling that should carry into every Open BrandKit install

The goal here is to generalize that into a package that another project can install and configure.

## Important Principle

Do not make this package Sequel-specific.

Use Sequel only as the reference implementation. Extract patterns, names, data shapes, and workflow ideas, but replace Sequel assumptions with config.

## Reference Files In Sequel

Start by reading these files in `/Users/tim/Projects/sequel-website`:

- `src/components/brandkit/brandkit-page.tsx`
- `docs/brandkit-style-contract.md`
- `src/lib/brandkit/sequel.ts`
- `src/lib/brandkit/avatar-generator-config.ts`
- `src/lib/brandkit/banner-renderer.ts`
- `src/app/brandkit/banners/route.ts`
- `src/app/brandkit/banners/presets/route.ts`
- `src/app/brandkit/download/[group]/route.ts`
- `src/app/brandkit/favicon/route.ts`
- `docs/sequel-color-system.md`
- `public/brandkit/logos`
- `public/brandkit/banners`

There was also an Eventide Brand Kit reference earlier in the work. If needed, inspect `/Users/tim/Projects/eventide` for the original design patterns and documentation.

## Current Direction

The product center is now the installer/build script:

```bash
open-brandkit init --install --build
```

The build command should turn configured logo files and color sources into website artifacts under the host repo's public assets, so `/brandkit` exists after the host site deploys.
The init command should also wire Next App Router files automatically when it detects or is told `--framework next`.

## Suggested Next Real Work

1. Harden the new `buildBrandKit` pipeline with tests.
2. Build a minimal Next.js example app that consumes `open-brandkit/next`.
3. Test the Next route handlers for favicon install, banner upload, banner presets, and downloads.
4. Add visual regression coverage so the static page and React adapter keep matching the style contract.
5. Decide npm package naming and release flow.

## Current Scaffold State

This repo has:

- package metadata
- TypeScript config
- `brandkit.config.example.ts`
- core type/config/assets/colors/banner/build files
- CLI installer wizard plus `build` entry point
- `open-brandkit/next` page-safe adapter with page component and manifest loader
- `open-brandkit/next/server` route-handler adapter for server-only filesystem/image work
- neutral Acme logo fixtures
- generated static `/brandkit` smoke-test output when `build` is run
- CLI notes
- a small fixture color Markdown file
- a deterministic style contract in `docs/STYLE_CONTRACT.md`

It does not yet have:

- tests
- working example app
- visual regression checks

## Guardrails Learned From Sequel

- Public brand pages should be download-friendly and not expose local write actions in production.
- Local-dev write actions are useful for maintaining generated favicon/banner files.
- Banners should be deterministic controls, not LLM image generation.
- Generated banner downloads should not include helper labels or pixel text baked into the artwork.
- Per-mark color options matter: logo, wordmark, and icon often have different valid variant sets.
- Full-logo variants may include two-tone marks; wordmark/icon variants may not.
- The banner alignment control should place left/right marks near true edges, not merely off-center.
