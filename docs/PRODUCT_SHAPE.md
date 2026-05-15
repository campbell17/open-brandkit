# Product Shape

Open BrandKit should feel like a small installable system rather than a site template.

The center of the product is the build/install script. The website route is the outcome.

The website route should not become a host-app-specific design exercise. It follows the deterministic Brand Kit style contract in `docs/STYLE_CONTRACT.md`, with only brand inputs changing between installs.

## User Story

A maintainer has a website or app repo with logos and colors already checked in. They run one command, answer a few questions, and get a polished `/brandkit` page with downloads, colors, avatars, favicon helpers, and generated social assets.

The repo is already connected to GitHub, Vercel, or another deploy system. Open BrandKit should fit into that existing workflow rather than becoming a separate hosted app.

## Minimum Inputs

- A folder containing logo assets.
- One color source, ideally JSON, Markdown table, CSV, or config literals.

## Nice-To-Have Inputs

- Preferred logo grouping rules.
- Mark variants for social banners.
- Avatar/favicons enabled or disabled.
- Generated banner dimensions.

## Generated Outputs

- `/brandkit` page assets that can be served by the host website.
- Manifest JSON for adapters and future UI components.
- Logo cards and download metadata.
- Zip archives for grouped downloads.
- Color cards with copy interactions.
- Avatar generator.
- Favicon PNG generation.
- Social profile banner images.

## Installation Goal

```bash
npx open-brandkit init --install --build
```

`init` should create a starter config and framework adapter files for the host framework.

`build` should read `brandkit.config.ts`, the configured logo directory, and the configured color source, then write the generated Brand Kit artifacts into the host website.

## First Adapter

Next.js App Router.

Reason: Sequel’s Brand Kit already exists there and has proven route handlers for downloads, favicon output, banner replacement, and banner preset rendering.

The static build output is useful as the universal fallback. The first Next adapter now covers local-dev write actions such as installing favicon files directly into a Next app and replacing generated banner assets from the browser.
