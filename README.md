# Open BrandKit

Open BrandKit turns the brand files you already have into a polished, shareable
brand kit page for your website.

Most teams eventually need the same little portal: approved logos, colors,
favicons, social images, avatars, and download buttons. Those assets usually end
up scattered across folders, design files, old Slack threads, and "which one is
current?" conversations.

Open BrandKit exists so a website repo can become the source of truth. Put the
approved brand files in the project, run the installer, and your site gets a
`/brandkit` page that stays tied to the assets you actually ship.

## What It Creates

Open BrandKit can generate a brand kit with:

- Logo lockups, wordmarks, and icons grouped into clear sections.
- Download buttons for approved assets.
- Brand color cards pulled from a source file.
- Avatar and favicon generation from your icon files.
- Ready-to-use social banner images.
- ZIP downloads for asset groups.
- A generated manifest for the brand kit page.

The page has an opinionated default design on purpose. A new install should feel
complete immediately, with the brand inputs doing the changing: your name, your
logos, your icons, your wordmarks, and your colors.

## What It Works With

Open BrandKit currently works best with:

- A Next.js App Router site.
- Logos and icons stored in your repo, usually under `public/logos`.
- SVG or PNG brand assets.
- A color source file in Markdown, JSON, CSV, or TypeScript config.
- Vercel or any host that can serve a normal Next.js app.

It can also generate static files under `public/brandkit`, but the full
interactive experience uses the Next.js adapter.

## What It Does Not Do

Open BrandKit does not design your brand for you. It expects approved source
files to already exist.

It also does not yet support every framework. The core build logic is written to
be reusable, but the installer and interactive page are focused on Next.js first.

The social banner preset controls can run on production when you wire the Next
routes. Custom banner uploads, resets, and favicon installation stay local-only
because they write files that cannot be saved back to your repo from a deployed
site.

## Prepare Your Assets

Start with a folder of approved brand files. Clear filenames help Open BrandKit
group things correctly.

Example:

```text
public/logos/acme-logo.svg
public/logos/acme-logo-white.svg
public/logos/acme-wordmark-black.svg
public/logos/acme-wordmark-blue.svg
public/logos/acme-icon-green.svg
public/logos/acme-icon-white.svg
```

Useful filename words:

- `logo` for full logo lockups.
- `wordmark` for text-only marks.
- `icon`, `symbol`, or `favicon` for compact marks.
- color words like `blue`, `black`, `white`, `green`, or your own color names.

Then add a color source file.

Example Markdown:

```md
| Name | Hex |
| --- | --- |
| Acme Blue | #2457ff |
| Acme Green | #32d583 |
| Acme Black | #101828 |
```

## Install

From the root of an existing Next.js app:

```bash
npx open-brandkit init --install --build
```

The installer asks for your brand name, logo folder, color file, route, and app
directory. By default, the brand kit lives at:

```text
/brandkit
```

For a noninteractive install:

```bash
npx open-brandkit init \
  --yes \
  --install \
  --framework next \
  --brand "Acme" \
  --short-name Acme \
  --logos public/logos \
  --colors docs/brand-colors.md \
  --route /brandkit \
  --app-dir src/app \
  --build
```

Use `app` instead of `src/app` if your project does not use a `src` directory.

## What Gets Added

Open BrandKit writes a small set of files into your app:

```text
brandkit.config.ts
src/app/brandkit/page.tsx
src/app/brandkit/layout.tsx
src/app/brandkit/favicon/route.ts
src/app/brandkit/banners/route.ts
src/app/brandkit/banners/presets/route.ts
src/app/brandkit/download/[group]/route.ts
public/brandkit/*
```

It also adds a script:

```json
{
  "scripts": {
    "brandkit:build": "open-brandkit build"
  }
}
```

## Use It

Start your app:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000/brandkit
```

When you change logos or colors, rebuild the brand kit:

```bash
npm run brandkit:build
```

The build output includes the Open BrandKit version that generated the files, so
it is easier to troubleshoot installs across projects.

## Customize

Most customization lives in `brandkit.config.ts`.

Use it to change:

- Brand name and description.
- Logo source folder.
- Color source file.
- Logo grouping rules.
- Banner presets.
- Banner mark variants.
- Output paths.

The defaults are meant to be useful without heavy configuration. If your source
files are named clearly, Open BrandKit should infer a good first version.

## Asset Variant Colors

In the social banner generator, the "Color" control selects a mark file. It does
not recolor the artwork.

That means a logo like this:

```text
acme-logo.svg
acme-logo-blue.svg
acme-logo-white.svg
```

becomes three selectable logo variants. Open BrandKit uses filename hints and SVG
fill colors to choose reasonable color dots for those options.

## Deploy

Commit the generated files and deploy your site as usual.

On Vercel, `/brandkit` works like any other Next.js route once the files are in
the repo.

## Status

Open BrandKit is early. The main path today is:

```text
existing Next.js app + local brand assets -> generated /brandkit page
```
