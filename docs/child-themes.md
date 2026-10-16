# Extending with a child theme

[Theme customization](theme-customization.md) covers what a realm admin can change at runtime. For a brand that
needs more (its own CSS, its own logo files, its own login wording), build a **child theme**: a Keycloak theme
that declares this one as its parent and adds only what differs. It lives in its own repository, ships as an
image built `FROM` this one, and picks up every release of this theme by bumping that base tag. Nothing is
forked, and no file of this repository is copied.

[`examples/child-theme/`](../examples/child-theme/) is a complete one, `acme`.

## How it works

Keycloak resolves a theme's templates, resources and messages child first, then falls back to the parent. A
child with no templates of its own therefore runs this theme unchanged, under its own name. Four hooks in this
theme let it do more:

| `theme.properties` key | Effect | Where |
| --- | --- | --- |
| `parent=nebari` | Inherit everything from the Nebari theme (or `parent=template` for the unbranded one) | Keycloak itself |
| `brand=<name>` | Stamped on `<html>` as `data-brand="<name>"`, so the child's CSS can scope its rules to this brand. The theme name compiled into this build is always the parent's, so this is how a child identifies itself | All three |
| `styles=<paths>` | Stylesheets from the child's own `resources/`, loaded after this theme's CSS and kept last | All three |
| `messageOverrides=<keys>` | Login strings the child overrides in `messages/messages_<locale>.properties` | Login pages |

`brand` must be a lowercase identifier (`a-z`, digits and `-`, up to 40 characters), and each `styles` entry a
relative `.css` path. Anything else is ignored. See [`src/themes/childTheme.ts`](../src/themes/childTheme.ts).

## Layout

One folder per Keycloak theme type, each with the same `theme.properties` keys:

```text
acme/
  login/
    theme.properties
    messages/messages_en.properties
    resources/css/acme.css
    resources/dist/logo/nebari-logo-light.svg
    resources/dist/logo/nebari-logo-dark.svg
  account/
    theme.properties
    resources/css/acme.css
    resources/dist/logo/...
  admin/
    theme.properties
    resources/css/acme.css
    resources/dist/logo/...
```

The image copies it into Keycloak's themes folder. Themes there are read at runtime, so no `kc.sh build` is
needed for them:

```dockerfile
FROM quay.io/nebari/nebari-keycloak-theme:<pinned tag>
COPY acme /opt/keycloak/themes/acme
```

A realm then selects `acme` as its login, account and admin theme.

## What a child can change

**Colours, fonts and spacing: override the design tokens.** Scope the overrides to the child's brand:

```css
:root[data-brand="acme"] {
    --primary: #0f766e;
    --primary-hover: #115e59;
    --ring: #0f766e;
    --header-background: #0f766e;
    --header-foreground: #ffffff;
}
```

The tokens are the custom properties on `:root` in [`src/theme.css`](../src/theme.css), the same ones
[Theme customization](theme-customization.md) sets. On the Nebari login pages a child brand switches on the
same token-driven rules the editor uses (`[data-branded]`), so overriding a token reaches the colours there that
are otherwise fixed to the Nebari design. The Account console's stylesheet still uses literal colours in places
(see [Known gaps](theme-customization.md#known-gaps)), so a token override reaches it only partly.

The attributes on `<html>` are stable to select on: `data-brand`, `data-kc-theme-type` (`login`, `account` or
`admin`) and `data-theme` (`light` or `dark`). Class names inside the pages are not a contract and can change
in any release.

**Logos: ship a file at the same path.** The login card and both console headers load
`dist/logo/nebari-logo-light.svg` and `-dark.svg` from the active theme's resources, so the child's files at
`resources/dist/logo/` replace them. Only files under `logo/` work this way. The bundled JavaScript and CSS have
hashed names that change every release.

**Login wording: list the keys you override.** The login pages bundle their text, so a key in the child's
`messages_<locale>.properties` only takes effect when it is also listed in `messageOverrides`:

```properties
# login/theme.properties
messageOverrides=loginAccountTitle registerTitle
```

```properties
# login/messages/messages_en.properties
loginAccountTitle=Sign in to Acme
registerTitle=Create your Acme account
```

Keycloak resolves each listed key as it would for any theme, so a realm's own localization override still wins
over the child's file.

**Runtime branding still applies.** A realm on `acme` can open Theme customization like any other, and a
published config is applied on top of the child's styles.

## What a child cannot change

Markup and pages: there is no template override hook. A child that ships its own `login.ftl` replaces the React
application entirely and is no longer a child of this theme in any useful sense.

## Trying one locally

The compose loop can mount a child theme in place, with no image build. Save this as a second compose file and
pass both:

```yaml
# compose.child.yml
services:
  keycloak:
    volumes:
      - ./examples/child-theme/acme:/opt/keycloak/themes/acme:ro
```

```bash
docker compose -f docker-compose.yml -f compose.child.yml up -d --build keycloak
```

Then set the `nebari` realm's themes to `acme` under **Realm settings &rarr; Themes**. Edits to the child's files
show up on reload.
