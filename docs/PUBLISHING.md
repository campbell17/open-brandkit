# Publishing

Open BrandKit publishes to npm through GitHub Actions and npm Trusted
Publishing. The workflow uses OIDC, so releases do not need an npm token or a
one-time password in the terminal.

## One-Time Setup

On npmjs.com, open the `open-brandkit` package settings and configure a Trusted
Publisher:

- Provider: GitHub Actions
- Organization or user: `campbell17`
- Repository: `open-brandkit`
- Workflow filename: `publish.yml`
- Environment name: `npm`

On GitHub, create an environment named `npm` under repository settings. Add a
required reviewer if you want each publish to need an approval click before it
runs.

After one trusted publish succeeds, npm recommends changing the package's
publishing access to require two-factor authentication and disallow traditional
tokens. Trusted publishing continues to work because it uses short-lived OIDC
credentials instead of stored npm tokens.

## Release Flow

1. Bump the version in `package.json` and `package-lock.json`.
2. Run the local checks:

   ```bash
   npm run build
   npm run typecheck
   npm audit --omit=dev
   npm pack
   ```

3. Commit and push the release changes to `main`.
4. In GitHub, go to Actions -> Publish to npm -> Run workflow.
5. Choose the `main` branch and start the workflow.
6. Approve the `npm` environment if GitHub asks for approval.

The workflow installs dependencies, builds, typechecks, audits production
dependencies, prints the package contents with `npm pack --dry-run`, and runs
`npm publish --access public`.

Trusted publishing requires npm CLI 11.5.1 or newer and Node 22.14.0 or newer.
The workflow uses Node 24 to satisfy that requirement. For public packages
published from public GitHub repositories, npm automatically adds provenance.

References:

- https://docs.npmjs.com/trusted-publishers
- https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages
