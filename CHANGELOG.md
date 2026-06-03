# Changelog

Open BrandKit is early alpha software, so releases are still moving quickly.
This changelog focuses on what changed for people installing or updating the
package.

## 0.6.3

- Fixed a hydration warning caused by loading saved social banner preferences
  from `localStorage` during the first client render.
- Lowered the Next BrandKit root z-index to `1000000` so local development
  warnings, popovers, and modals can still appear above it.

## 0.6.2

- Split the social banner Options control into separate Color and Align boxes so
  larger mark color sets have room to grow while alignment stays compact.

## 0.6.1

- Added a Download PDF flow that opens a fixed Letter landscape Brand Kit page
  and uses the browser print dialog for saving as PDF.
- Added a dedicated printable layout for approved logos, icons, web colors, and
  print colors, with 3-column sheets and all values visible on-page.
- Removed project-specific PDF guidance blocks so the printable version stays
  generic across brands.
- Social banner colors can now be omitted from config; Open BrandKit derives
  `primary`, `accent`, and `light` from the loaded brand color source.
- Social banner preset choices now persist across refreshes.
- Added a back-to-top button that appears after scrolling down the Brand Kit
  page.
- Reworked the banner lock control as an "Allow public changes" toggle. Local
  development controls stay available, while locked public pages hide banner
  preset controls.
- `brandkit build` now writes `print.html` next to the generated static page.
- Fresh Next installs now include a `/brandkit/print` route powered by
  `createBrandKitPrintHandler`.

## 0.6.0

- Archive download buttons now provide explicit zip filenames that match the
  generated asset group, banner, or all-assets archive.
- Avatar icon swatches now show the actual approved icon artwork instead of a
  plain color block.
- The BrandKit masthead now shows a back-arrow affordance on the brand link and
  surfaces the Open BrandKit package version.
- Added `socialBanners.locked` and a local banner lock toggle for
  admins/designers who want to hide banner controls and keep generated or chosen
  banner images fixed.
- Avatar slider controls now use the primary brand color.
- Improvements to the banner controls: mark thumbnails replaced dropdowns,
  Options/Base/Pattern controls now use compact swatch grids, pattern choices
  now show as numbered swatches, and the layout wraps later with centered rows.
- Social banner controls now expose six pattern choices: Sweep, Corner, Stack,
  Glow, Ribbon, and Split.
- Social banner previews now keep selected swatches aligned with initial
  previews and use the same blended color treatment as generated banner PNGs.

## 0.5.9

- Social profile banner color controls now order logo mark colors as White,
  Black, then Primary when those options are available.
- Social profile banner previews now use the same default white mark color on
  initial render instead of waiting for a control change.
- Fresh installs and generated banner builds now share the same mark color
  defaulting logic, so dark social banner patterns start with a white logo mark
  when an approved white asset exists.

## 0.5.8

- Avatar generator icon swatches now correctly distinguish Primary, Black, and
  White colorways even when brand names or filenames contain overlapping color
  words.
- Social profile banner controls now prefer a white logo mark by default on dark
  preset backgrounds.
- Lightbox overlays now close when clicking outside the content panel.
- The BrandKit masthead link now displays the full brand name instead of the
  short name.

## 0.5.7

- Next.js route handlers now validate BrandKit configs with the shared schema
  before favicon, banner upload, and banner preset actions run.
- Banner and favicon route handlers now support the same config normalization as
  the build flow, improving behavior with generated TypeScript configs.

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
