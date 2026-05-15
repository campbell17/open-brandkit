# Extraction Plan

## 1. Define The Build Contract

The host project should configure:

- brand name and short name
- public route path
- generated output path
- logo source directory
- logo groups and matching rules
- color sources
- color display sections
- banner mark variants and colors
- social banner presets
- optional avatar generator defaults
- optional favicon output targets

The package should not assume Next.js, Tailwind, or a specific brand. The core contract is "source files in, website artifacts out."

## 2. Extract Core Logic

Core should be framework-neutral:

- discover asset files
- group assets
- infer download formats
- parse color files
- render deterministic banners
- create zip archives
- create a manifest
- create a static `/brandkit` fallback page
- validate config

Core should not import React or Next.js.

## 3. Add Framework Adapters

Start with Next.js because the Sequel implementation is Next.js.

Current first-pass API:

```ts
import {
  BrandKitPage,
  getBrandKitNextPageProps,
} from 'open-brandkit/next'
import config from '@/brandkit.config'

export default async function BrandKitRoute() {
  return <BrandKitPage {...(await getBrandKitNextPageProps(config))} />
}
```

Route handlers use helpers such as `createBrandKitFaviconHandler(config)` and `createBrandKitBannerPresetHandler(config)`.

The adapter sits on top of the generated manifest and core build logic rather than owning the source parsing itself.

## 4. Build A Minimal Example

The example should use fake/generic brand assets, not Sequel.

It should prove:

- `/brandkit` renders
- logo downloads work
- color copy works
- banners render
- dev-only write actions are hidden in production

The repo now has a neutral Acme fixture, a static build output path, and a first-pass Next adapter. A richer example app can use the same fixture config.

## 5. Package For Open Source

Before public release:

- choose final package name
- replace `private: true`
- add tests
- add CI
- add license
- add contribution notes
- add example screenshots
- write install docs
- decide whether the canonical install command is `npx open-brandkit init`, `npx @scope/open-brandkit init`, or both
