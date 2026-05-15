# Brand Kit Style Contract

Open BrandKit follows its own deterministic Brand Kit layout by default. Generated installs should differ only by brand inputs: logo files, icon files, colors, brand name, and generated banner images.

Reusable code must not include project-specific names, copy, or asset paths.

## Deterministic Defaults

- Page shell: slate-50 background, slate-950 text, white header/footer.
- Content width: 1280px max container with responsive side padding.
- Header: white with slate-200 bottom border, two-column desktop grid, brand icon preview on the right when an icon is available.
- Header copy: `Approved marks, avatar-ready presets, social profile assets, and the current color system.`
- Header navigation: text links with down-arrow indicators, plus asset count and optional Download all button.
- UI icons are deterministic Lucide icons: `ArrowDown`, `Download`, `Upload`, `Copy`, `RotateCcw`, `AlignLeft`, `AlignCenter`, and `AlignRight`.
- Logos section: slate-50 with slate-200 bottom border.
- Avatar generator: inside the Logos section after logo groups.
- Colors section: white.
- Banners section: slate-50 with slate-200 top and bottom borders.
- Footer: white with slate-200 top border, brand mark at left when available.

## Components

- Asset cards use white surfaces, neutral-200 borders, 8px radius, 220px checkerboard previews for every mark variant, and primary dark download buttons with white text.
- Logo groups render in this order when present: Logo Lockups, Wordmarks, Icons. `wordmark`, `word mark`, `word-mark`, and `word_mark` must resolve to Wordmarks before any broad icon/mark matcher runs. Missing group descriptions fall back to deterministic generic copy.
- The logo lightbox uses a black overlay, white panel, large checkerboard preview, close button, and all asset download actions.
- Color cards use a full-width 112px swatch and a compact hex copy button.
- The color section uses `Brand Colors` as the group heading and `Primary` as the default color subsection heading.
- Avatar controls use chip groups for icon color, background, shape, border color, border thickness, and size; the preview panel includes icon padding, PNG download, favicon downloads, and local favicon install when a Next route handler is wired.
- Avatar icon-color chips are inferred from available icon files and brand colors. Wordmark-looking assets must never be used by the avatar generator. The chips do not show the icon artwork; the artwork appears in the preview.
- Avatar background options are Transparent, Black, White, and Custom.
- Avatar border color options are Primary, Black, White, and Custom.
- Banner controls use the Open BrandKit control shape: mark select, mark color dots, alignment segmented buttons, base/pattern color dots, and pattern select.
- Banner mark choices are inferred from available logo lockup, wordmark, and icon source files during install.
- Banner Color changes the selected mark color only. Banner Base changes the generated background/pattern system.
- Banner cards preserve generated aspect ratio and display at 50% of their pixel width.

## Brand Inputs

The following are the only expected visual differences between installs:

- Brand name and home URL.
- Logo and icon files discovered by the build.
- Color names and values loaded from configured color sources.
- Banner presets and generated banner image output.
- Optional brand description in metadata; the visible Brand Kit intro remains deterministic.
