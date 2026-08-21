# Theme presets

Every `*.json` file in this directory is offered in the admin console's
**Theme customization → ⋮ → Import theme…** dialog.

The list is built with `import.meta.glob('/custom_themes/*.json')`, so committing
a file here is all it takes — there is no index to update. The files are inlined
into the bundle at build time, so they ship inside the theme JAR.

## Why this directory exists

A published theme is stored in the realm's localization messages, which means it
lives in Keycloak's database. That survives a container restart, but **not** a
fresh deployment: `realm-export.json` carries no `localizationTexts`, so a clean
instance starts from `DEFAULT_BRANDING_CONFIG`.

Committing a theme here is what makes it survive. It ships inside the theme JAR
and can be re-imported into any realm.

## Adding a preset

1. Build the theme in the console, then **⋮ → Export theme as JSON**.
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
bounds `cardRadius`, and restricts images to `data:` images or `http(s)` URLs.
A file that fails to parse is skipped with an error in the dialog rather than
breaking the page.

`nebari-default.json` is generated from `DEFAULT_BRANDING_CONFIG`; regenerate it
rather than hand-editing if those defaults change.
