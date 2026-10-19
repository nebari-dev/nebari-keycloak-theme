# Theme presets

Every `*.json` file in this directory is offered in the admin console's
**Theme customization → ⋮ → Import theme…** dialog.

The list is built with `import.meta.glob('/custom_themes/*.json')`, so committing
a file here is all it takes — there is no index to update. The files are inlined
into the bundle at build time, so they ship inside the theme JAR.

## What belongs here

The presets this repository ships for every deployment: today, each theme's own
defaults, so a realm can be returned to the unbranded look. A deployment's own
brand does not belong here. It is exported from the editor and imported or seeded
into that deployment's realms, or built as a child theme; see
[Theme customization](../docs/theme-customization.md#seeding-a-preset-so-a-realm-starts-branded)
and [Child themes](../docs/child-themes.md).

A realm with nothing published, including every realm on a fresh database, uses
the active theme's `defaultBranding` from the catalog.

## Adding a preset

1. Build the theme in the console, then **Theme options (the options menu) &rarr; Export theme as JSON**.
2. Save it into this directory and give it a descriptive filename — the filename
   is the preset's id.

   In Chromium the export opens a save dialog, so you can pick this folder
   directly and the browser will offer it again next time. Firefox and Safari
   have no such API, so the file lands in the browser's download folder and has
   to be moved here.
3. Set a useful `name` and `description`; those are what the dialog lists.

## File format

```json
{
  "nebariThemeExport": 1,
  "name": "Shown in the import dialog",
  "description": "Shown under the name",
  "exportedAt": "2026-08-20",
  "themeName": "nebari",
  "config": { "...": "a BrandingConfig" }
}
```

A bare `BrandingConfig` (no envelope) is also accepted, so a hand-written file
works — it just imports as "Imported theme".

Presets are untrusted input like any other import: `parseThemeExport` runs every
config through `normalizeBrandingConfig`, which clamps colours to `#rrggbb`,
bounds `cardRadius`, and accepts images only as HTTPS URLs or PNG, JPEG or WebP
data URIs (no SVG).
A file that fails to parse is skipped with an error in the dialog rather than
breaking the page.

Current configs use version 2 image sets:

```json
{
  "version": 2,
  "logo": { "light": "https://…/logo-dark-text.png", "dark": "https://…/logo-white-text.png" },
  "backgroundImage": { "light": "", "dark": "" }
}
```

Either appearance may be empty and will fall back to the other. Version 1 files
with a single `logo` or `backgroundImage` string remain valid; normalization
copies that image to both appearances, and the next export writes version 2.

`nebari-default.json` mirrors `DEFAULT_BRANDING_CONFIG` and
`template-default.json` mirrors `TEMPLATE_BRANDING_CONFIG`. They are kept by hand,
so update them when those defaults change. Fields a file leaves out take the
defaults during normalization: neither file has an `advanced` block, so both
import with the advanced settings at their defaults.

The template preset is an unbranded but complete starting point. Its input
surface differs from its card, its neutral border maintains at least 3:1
non-text contrast in both appearances, and its text colours meet the normal-text
contrast target. Preserve those relationships when updating the preset; the
browser assertions in `tests/visual.spec.ts` guard the shipped defaults.

The `themeName` field records which theme a preset was built for. It is
descriptive — presets are not filtered by it, so a palette exported from one
theme can be imported into another.
