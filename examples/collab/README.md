# Example: the Collab look

A prototype of the Collab Hub sign-in design (Figma file `sqfQl1fw2iiIlcDTI4wzQ8`, frame `299:1307`) built from
the two extension points this theme offers, with no change to the theme itself:

| Piece | File | What it carries |
| --- | --- | --- |
| Theme customization preset | [`collab-preset.json`](collab-preset.json) | Company name, logo and console logo, browser icon, Admin welcome mark, wordmark, light and dark palettes, card radius, button shape, register title |
| Child theme | [`theme/`](theme/) | Inter, the orbit backdrop and its animation, the card shadow, the lockup and type sizes, the remember-me row, the login title and button wording, the console accents |

The preset is data in the realm's database; the child theme is files in Keycloak's themes folder. Each page
load applies both: the realm selects the `collab` theme, which runs the Nebari code, which applies the
published preset and then loads `collab.css`.

See [Theme customization](../../docs/theme-customization.md) and [Child themes](../../docs/child-themes.md).

## Layout

```text
collab-preset.json          the preset, as Export theme writes it
compose.collab.yml          mounts theme/ into the compose loop's Keycloak as the `collab` theme
setup.sh                    selects the theme on the realm and publishes the preset
theme/
  login/
    theme.properties        parent=nebari, brand=collab, styles, messageOverrides
    messages/messages_en.properties
    resources/css/collab.css
    resources/img/orbit-1.svg, orbit-3.svg    exported from the Figma frame
    resources/fonts/inter.woff2               Inter variable, latin (@fontsource-variable/inter 5.3.0, OFL)
  admin/    theme.properties, resources/css/collab.css, resources/fonts/inter.woff2
  account/  theme.properties, resources/css/collab.css, resources/fonts/inter.woff2
```

## Try it in the compose loop

From the repository root:

```bash
docker compose -f docker-compose.yml -f examples/collab/compose.collab.yml up -d --build keycloak
examples/collab/setup.sh
```

Then open `http://localhost:8080/realms/nebari/account`. Edits under `theme/` show on reload.

To go back, revert the realm first, then restart without the override. The other order leaves the realm
pointing at a theme that is no longer there:

```bash
examples/collab/setup.sh --revert
docker compose up -d keycloak
```

The preset stays published after `--revert`; discard it under **Theme customization**.

## The backdrop

`.nebari-login-wrapper` draws two glows as radial gradients (`--collab-glow`, `--collab-glow-core`). Its
`::before` and `::after` each hold one orbit SVG, centred 280px right and 170px below the page centre, and
rotate in opposite directions once every 300s. `prefers-reduced-motion` stops them.

## Prototype shortcuts

These work but depend on the parent's markup and class names, which are not a contract:

- the backdrop overrides `.nebari-login-wrapper::before` and `::after`;
- the subtitle is CSS `content`, so it cannot be translated;
- "Forgot password?" is positioned onto the remember-me row, and only when that row is shown.

## Values not taken from Figma

- `primaryHover` in both palettes; the design has no hover state.
- The whole dark palette and the dark glow; there is no dark sign-in frame, so they come from the dark console
  and signed-out frames.
- The logos are 128px PNG renders of the Figma mark, because the preset accepts raster images only.
