# Next.js Adapter

The Next adapter makes a host App Router project render the generated Brand Kit manifest with app-integrated dev tools.

The expected flow in a host repo:

```bash
npx open-brandkit init --install --build
```

The installer writes the route files below. They are documented here for review and for projects that want to customize the generated wiring.

## Page Route

```tsx
// app/brandkit/page.tsx
import { BrandKitPage, getBrandKitNextPageProps } from 'open-brandkit/next'

import config from '@/brandkit.config'

export default async function BrandKitRoute() {
  const props = await getBrandKitNextPageProps(config)

  return (
    <BrandKitPage
      {...props}
      endpoints={{
        bannerPresets: '/brandkit/banners/presets',
        bannerUpload: '/brandkit/banners',
        favicon: '/brandkit/favicon',
      }}
    />
  )
}
```

## Favicon Install Route

```ts
// app/brandkit/favicon/route.ts
import { createBrandKitFaviconHandler } from 'open-brandkit/next/server'

import config from '@/brandkit.config'

export const runtime = 'nodejs'
export const { POST } = createBrandKitFaviconHandler(config)
```

## Banner Upload Route

```ts
// app/brandkit/banners/route.ts
import { createBrandKitBannerUploadHandler } from 'open-brandkit/next/server'

import config from '@/brandkit.config'

export const runtime = 'nodejs'
export const { POST } = createBrandKitBannerUploadHandler(config)
```

## Banner Preset Route

```ts
// app/brandkit/banners/presets/route.ts
import { createBrandKitBannerPresetHandler } from 'open-brandkit/next/server'

import config from '@/brandkit.config'

export const runtime = 'nodejs'
export const { POST } = createBrandKitBannerPresetHandler(config)
```

## Download Route

```ts
// app/brandkit/download/[group]/route.ts
import { createBrandKitDownloadHandler } from 'open-brandkit/next/server'

export const runtime = 'nodejs'
export const { GET } = createBrandKitDownloadHandler()
```

## Responsibilities

- `BrandKitPage` renders logos, colors, avatar generation, favicon download/install controls, banners, banner replacement, and banner preset controls.
- `getBrandKitNextPageProps` loads `public/brandkit/brandkit.manifest.json` and derives serializable banner controls from `brandkit.config.ts`.
- Write actions are blocked in production.
- Core parsing and generation stay in `src/core`; this adapter consumes the generated manifest and calls core build helpers when regenerating banner presets.
