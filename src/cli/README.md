# CLI Notes

CLI commands:

```bash
npx open-brandkit init --install --build
npx open-brandkit build
npx open-brandkit sync
npx open-brandkit doctor
```

`init` runs the Next.js App Router installer wizard. It creates a config file, detects or asks for logo/color inputs, writes Next.js adapter files, adds `brandkit:build` to `package.json`, and can immediately run the build.

`build` reads `brandkit.config.ts` and writes the generated `/brandkit` page, manifest, copied logos, banner PNGs, and zip downloads.

`sync` should eventually regenerate derived assets such as banners or favicon outputs without touching adapter files.

`doctor` should inspect configured logo/color paths and report missing required assets.
