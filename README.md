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

Open BrandKit is source-available. You can use it in personal, internal,
client, agency, and commercial projects, but you cannot repackage or resell Open
BrandKit itself as a standalone or competing product.

Open BrandKit is currently early alpha software. It is published on npm, but the
installer and generated page may still change quickly before a stable release.
See the
[full changelog](https://github.com/campbell17/open-brandkit/blob/main/CHANGELOG.md)
for recent release notes.

## What's New in 0.6.3

- Fixed hydration warnings when saved social banner preferences from an older
  install are still present in the browser.
- Lowered the BrandKit overlay z-index to `1000000` so local development
  warnings and popovers can appear above it.

## 0.6.2 Changes

- Split social banner Options into separate Color and Align boxes so larger mark
  color sets have room while alignment stays compact.

## 0.6.1 Changes

- Added a Download PDF flow for a print-styled Brand Kit version with fixed
  Letter landscape sheets.
- The printable version focuses on approved logos, icons, web colors, and print
  colors, with 3-column print shade pages and values visible on-page.
- Removed project-specific guidance blocks from the printable PDF layout.
- Social banner choices now persist across refreshes.
- Added a back-to-top button for longer Brand Kit pages.
- Reworked the banner lock as an "Allow public changes" toggle: local dev
  controls stay usable, while locked public pages hide banner preset controls.
- `brandkit build` now writes `public/brandkit/print.html`.
- Fresh Next installs now include a `/brandkit/print` route.

See the
[full changelog](https://github.com/campbell17/open-brandkit/blob/main/CHANGELOG.md)
for earlier releases.

## What It Creates

Open BrandKit can generate a brand kit with:

- Logo lockups, wordmarks, and icons grouped into clear sections.
- Download buttons for approved assets.
- Brand color cards pulled from a source file.
- Avatar and favicon generation from your icon files.
- Ready-to-use social banner images.
- A print-styled PDF flow for approved marks and color references.
- ZIP downloads for asset groups.
- A generated manifest for the brand kit page.

The page has an opinionated default design on purpose. A new install should feel
complete immediately, with the brand inputs doing the changing: your name, your
logos, your icons, your wordmarks, and your colors.

## What It Works With

Open BrandKit currently works best with:

- A Next.js 14 or newer App Router site.
- Tailwind CSS 3 or 4.
- Logos and icons stored in your repo, usually under `public/logos`.
- SVG brand assets. PNG downloads are generated automatically during build.
- A color source file in Markdown, JSON, CSV, or TypeScript config.
- Vercel or any host that can serve a normal Next.js app.

The generated Next.js page is Tailwind-first. Having Tailwind installed is only
half of the requirement: your app also needs to include Open BrandKit's shipped
components when Tailwind builds its CSS. During `init`, Open BrandKit tries to
wire that up for you.

For Tailwind 3, the installer adds Open BrandKit to the `content` paths in
`tailwind.config.*`. For Tailwind 4, it adds an `@source` directive to your app
stylesheet. If `/brandkit` loads but looks unstyled, this scan path is the first
thing to check.

The installer patches common Tailwind setups automatically. If your Tailwind
configuration is highly custom, generated, or split across unusual files, Open
BrandKit may leave it untouched and print the exact scan/source line to add by
hand.

In older Pages Router projects that do not already have a Tailwind stylesheet,
the installer creates a small route-local stylesheet for `/brandkit` and wires it
to Tailwind 4 with a PostCSS config. This keeps the rest of the site on its
existing CSS/Sass setup while giving the generated brand kit the Tailwind
utilities it needs.

## What It Does Not Do

Open BrandKit does not design your brand for you. It expects approved source
files to already exist.

It also does not yet support every framework. The public installer and
interactive page are focused on Next.js first.

The social banner preset controls can run on production when you wire the Next
routes. Custom banner uploads, resets, and favicon installation stay local-only
because they write files that cannot be saved back to your repo from a deployed
site.

Set `socialBanners.locked` to `true` when public pages should hide banner preset
controls by default. Local admins/designers can use the "Allow public changes"
toggle in the generated page to change that public state. Local development
controls stay usable so generated/chosen banner images can still be updated.

If `socialBanners.colors` is omitted, Open BrandKit derives `primary`, `accent`,
and `light` banner colors from the loaded brand color source. This keeps banner
backgrounds tied to the same color file as the web and print swatches.

## Prepare Your Assets

Start with a folder of approved brand files. Clear filenames help Open BrandKit
group things correctly.

SVG files are the best source format. Open BrandKit copies the SVGs and generates
matching PNG downloads during `brandkit build`. If you already have hand-tuned
PNGs, you can put them in the same folder with the same filename stem and Open
BrandKit will use those instead of generating replacements.

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
## Brand Colors

### Primary Colors

| Name | Hex |
| --- | --- |
| Acme Blue | #2457ff |
| Acme Green | #32d583 |

### Secondary Colors

| Name | Hex |
| --- | --- |
| Acme Black | #101828 |
| Acme Gray | #667085 |
```

Primary colors render as a two-column section. Secondary colors render as a
three-column section. Use those headings when you want Open BrandKit to lay out
the color system like the default brand kit.

For print swatches, use the exact heading `## Print Color Shades`. Open BrandKit
uses that heading to render Pantone-style chips with RGB, CMYK, and hex values
instead of ordinary brand color cards. See
`examples/acme-studio-color-system.md` for a fuller color-system example.

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
  --install \
  --brand "Acme" \
  --short-name Acme \
  --logos public/logos \
  --colors docs/brand-colors.md \
  --route /brandkit \
  --app-dir src/app \
  --build
```

Use `app` instead of `src/app` if your project does not use a `src` directory.

After install, your app should have Tailwind pointed at the package code. The
installer handles the common Tailwind 3 and Tailwind 4 setups automatically, but
custom Tailwind setups may need a manual check.

## What Gets Added

Open BrandKit writes a small set of files into your app:

```text
brandkit.config.ts
<app-dir>/layout.tsx
<app-dir>/brandkit/page.tsx
<app-dir>/brandkit/layout.tsx
<app-dir>/brandkit/open-brandkit.css
<app-dir>/brandkit/favicon/route.ts
<app-dir>/brandkit/banners/route.ts
<app-dir>/brandkit/banners/presets/route.ts
<app-dir>/brandkit/download/[group]/route.ts
<app-dir>/brandkit/print/route.ts
public/brandkit/*
```

Depending on your existing Tailwind setup, it may also update
`tailwind.config.*`, add an `@source` directive to an existing Tailwind
stylesheet, or create `postcss.config.cjs` for Tailwind 4.

If your project is an older Pages Router app with no App Router root layout yet,
the installer also creates `<app-dir>/layout.tsx` so the `/brandkit` route can
hydrate normally.

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
- Banner controls, including whether public pages should allow banner changes.
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

If the deployed page appears unstyled, make sure the deployed app is using the
same Tailwind scan/source change that worked locally. Open BrandKit's styles are
compiled by the host app, not loaded from a separate stylesheet.

## License

Open BrandKit is source-available.

You may use it commercially in your own projects, internal company work, client
work, agency projects, websites, and products. You may charge for services,
implementation, design, hosting, or client work that uses Open BrandKit as part
of a larger project.

You may not sell, sublicense, repackage, redistribute, publish, or offer Open
BrandKit itself as a standalone product, competing package, hosted installer,
template marketplace item, or software-as-a-service product whose value derives
primarily from Open BrandKit.

See `LICENSE` for the full terms.

## Status

Open BrandKit is early alpha software. The main path today is:

```text
existing Next.js app + local brand assets -> generated /brandkit page
```

If you want to pin the alpha dist-tag explicitly, use `open-brandkit@alpha`.

## Up Next

Additional installation paths are planned, including Astro and other static or
framework-specific setups. For now, the public installer is intentionally focused
on Next.js App Router projects so the generated brand kit matches the full
interactive experience.
