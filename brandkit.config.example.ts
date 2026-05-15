import { defineBrandKitConfig } from './src/core/config.js'

export default defineBrandKitConfig({
  brand: {
    name: 'Acme Studio',
    shortName: 'Acme',
    description: 'Approved assets, colors, avatars, and social banners.',
  },
  route: '/brandkit',
  logos: {
    sourceDir: 'public/brandkit-source/logos',
    groups: [
      {
        key: 'logo-lockups',
        label: 'Logo Lockups',
        match: ['logo'],
        description: 'Primary logo lockups in approved colorways.',
      },
      {
        key: 'wordmarks',
        label: 'Wordmarks',
        match: ['wordmark', 'word-mark', 'word'],
        description: 'Text-first marks for wide placements.',
      },
      {
        key: 'icons',
        label: 'Icons',
        match: ['icon', 'symbol', 'favicon', 'brand-mark'],
        description: 'Symbol-only marks for compact surfaces.',
      },
    ],
  },
  colors: {
    sources: [
      {
        type: 'markdown-table',
        path: 'examples/acme-studio-color-system.md',
      },
    ],
  },
  socialBanners: {
    markVariants: [
      {
        key: 'logo',
        label: 'Logo',
        assetPath: 'public/brandkit-source/logos/acme-logo.svg',
        colorAssets: {
          blue: 'public/brandkit-source/logos/acme-logo.svg',
        },
        colorOptions: [{ key: 'blue', label: 'Blue', hex: '#4784de' }],
        colorKeys: ['blue'],
        scale: 0.34,
      },
      {
        key: 'wordmark',
        label: 'Wordmark',
        assetPath: 'public/brandkit-source/logos/acme-wordmark.svg',
        colorAssets: {
          dark: 'public/brandkit-source/logos/acme-wordmark.svg',
        },
        colorOptions: [{ key: 'dark', label: 'Dark', hex: '#0d2249' }],
        colorKeys: ['dark'],
        scale: 0.26,
      },
      {
        key: 'icon',
        label: 'Icon',
        assetPath: 'public/brandkit-source/logos/acme-icon.svg',
        colorAssets: {
          blue: 'public/brandkit-source/logos/acme-icon.svg',
          white: 'public/brandkit-source/logos/acme-icon-white.svg',
        },
        colorOptions: [
          { key: 'blue', label: 'Blue', hex: '#4784de' },
          { key: 'white', label: 'White', hex: '#ffffff' },
        ],
        colorKeys: ['blue', 'white'],
        scale: 0.18,
      },
    ],
    colors: [
      { key: 'dark', label: 'Dark', hex: '#0d2249' },
      { key: 'blue', label: 'Blue', hex: '#4784de' },
      { key: 'white', label: 'White', hex: '#ffffff' },
    ],
    presets: [
      {
        key: 'x-profile-header',
        label: 'X / Twitter profile header',
        width: 1500,
        height: 500,
        backgroundColor: 'dark',
        accentColor: 'blue',
        markColor: 'blue',
        secondaryColor: 'white',
        pattern: 'diagonal-sweep',
      },
      {
        key: 'linkedin-personal-background',
        label: 'LinkedIn personal background',
        width: 1584,
        height: 396,
        backgroundColor: 'dark',
        accentColor: 'blue',
        markColor: 'blue',
        secondaryColor: 'white',
        pattern: 'radial-glow',
      },
      {
        key: 'linkedin-organization-cover',
        label: 'LinkedIn organization cover',
        width: 4200,
        height: 700,
        backgroundColor: 'dark',
        accentColor: 'blue',
        markColor: 'white',
        secondaryColor: 'white',
        markVariant: 'icon',
        pattern: 'wave',
      },
      {
        key: 'facebook-page-cover',
        label: 'Facebook page cover',
        width: 851,
        height: 315,
        backgroundColor: 'blue',
        accentColor: 'dark',
        markColor: 'blue',
        secondaryColor: 'white',
        pattern: 'split-field',
      },
    ],
  },
})
