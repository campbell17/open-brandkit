import type { BrandKitConfig } from 'open-brandkit'

export default {
  "brand": {
    "name": "Test Brand",
    "shortName": "Test",
    "description": "Approved assets, colors, avatars, and social banners for Test Brand."
  },
  "route": "/brandkit",
  "logos": {
    "sourceDir": "public/logos",
    "groups": [
      {
        "key": "logo-lockups",
        "label": "Logo Lockups",
        "match": [
          "logo"
        ],
        "description": "Primary logo lockups in approved colorways."
      },
      {
        "key": "wordmarks",
        "label": "Wordmarks",
        "match": [
          "wordmark",
          "word-mark",
          "word"
        ],
        "description": "Text-first marks for wide placements."
      },
      {
        "key": "icons",
        "label": "Icons",
        "match": [
          "icon",
          "symbol",
          "favicon",
          "brand-mark"
        ],
        "description": "Symbol-only marks for compact surfaces."
      }
    ]
  },
  "colors": {
    "sources": [
      {
        "type": "markdown-table",
        "path": "docs/colors.md"
      }
    ]
  },
  "socialBanners": {
    "markVariants": [
      {
        "key": "logo",
        "label": "Logo",
        "assetPath": "public/logos/logo.svg",
        "scale": 0.34
      }
    ],
    "colors": [
      {
        "key": "primary",
        "label": "Primary",
        "hex": "#0d2249"
      },
      {
        "key": "accent",
        "label": "Accent",
        "hex": "#4784de"
      },
      {
        "key": "light",
        "label": "Light",
        "hex": "#ffffff"
      }
    ],
    "presets": [
      {
        "key": "x-profile-header",
        "label": "X / Twitter profile header",
        "width": 1500,
        "height": 500,
        "backgroundColor": "primary",
        "accentColor": "accent",
        "markColor": "light",
        "secondaryColor": "light",
        "pattern": "diagonal-sweep"
      },
      {
        "key": "linkedin-personal-background",
        "label": "LinkedIn personal background",
        "width": 1584,
        "height": 396,
        "backgroundColor": "primary",
        "accentColor": "accent",
        "markColor": "light",
        "secondaryColor": "light",
        "pattern": "radial-glow"
      },
      {
        "key": "linkedin-organization-cover",
        "label": "LinkedIn organization cover",
        "width": 4200,
        "height": 700,
        "backgroundColor": "primary",
        "accentColor": "accent",
        "markColor": "light",
        "secondaryColor": "light",
        "pattern": "wave"
      },
      {
        "key": "facebook-page-cover",
        "label": "Facebook page cover",
        "width": 851,
        "height": 315,
        "backgroundColor": "primary",
        "accentColor": "accent",
        "markColor": "light",
        "secondaryColor": "light",
        "pattern": "split-field"
      }
    ]
  }
} satisfies BrandKitConfig
