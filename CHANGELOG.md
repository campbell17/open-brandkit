# Changelog

Open BrandKit is early alpha software, so releases are still moving quickly.
This changelog focuses on what changed for people installing or updating the
package.

## 0.5.6

- Generated PNG downloads are now created automatically from SVG logo, wordmark,
  and icon files during `brandkit build`.
- Existing same-stem PNG source files are respected, so hand-tuned PNGs can still
  be supplied when needed.
- Logo, wordmark, and icon preview sizing is more stable in cards and in the
  lightbox.
- The README now explains the SVG-to-PNG build behavior.

## 0.5.5

- Social banner controls now update previews on deployed sites without trying to
  read or write the production filesystem.
- Local development still uses the banner route handlers to regenerate banner
  files on disk.

## 0.5.4

- The avatar generator now downloads a single favicon kit zip instead of several
  individual PNG files.
- The favicon kit includes `favicon.ico`, Apple touch icons, Android Chrome
  icons, and the generated PNG favicon sizes.

## 0.5.3

- The generated BrandKit page now renders as a standalone full-viewport surface
  so host app headers and footers do not bleed into `/brandkit`.

## 0.5.2

- Improved installs in older or hybrid Next.js projects by creating a minimal
  App Router layout when needed.
- Fixed control hydration issues seen in some Next.js 14 projects.

## 0.5.1

- Improved Tailwind setup handling for older Next.js projects.
- Added better support for route-local BrandKit styling when the host app has an
  unusual CSS setup.

## 0.5.0

- Relaxed the Next.js peer dependency to support Next.js 14 and newer.
- Continued hardening the installer flow for real external project installs.

## 0.4.x

- Public npm publishing flow was introduced.
- The installer, generated Next.js routes, Tailwind wiring, and BrandKit build
  flow were refined through live test installs.

