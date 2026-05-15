# Next.js Example

Placeholder for a future working example.

This example should eventually prove the package can power a `/brandkit` route without copying Sequel-specific code.

For now, the static build path can be exercised from the repo root:

```bash
npm run build
node dist/cli/index.js build --config brandkit.config.example.ts
```

That generates `public/brandkit/index.html`, which a Next.js app can serve at `/brandkit/` from its public directory.

The richer App Router integration is now exposed through `open-brandkit/next`. A host app should add:

```text
app/brandkit/page.tsx
app/brandkit/favicon/route.ts
app/brandkit/banners/route.ts
app/brandkit/banners/presets/route.ts
app/brandkit/download/[group]/route.ts
```

The concrete route snippets live in `src/adapters/next/README.md`.
