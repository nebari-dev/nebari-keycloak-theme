# Customization

## Colours and tokens

All tokens live in [`src/theme.css`](../src/theme.css), in three groups:

| Tokens | Where they come from | Change them when |
| --- | --- | --- |
| `--primary`, `--background`, `--foreground`, `--accent`, `--radius`, &hellip; | The `@nebari` design-system theme | You want every component, in every theme, to change |
| `--nebari-purple`, `--nebari-blue`, `--nebari-teal`, &hellip; | Nebari's brand palette | You are changing a brand colour |
| `--header-background`, `--header-foreground`, `--header-border`, `--header-action-hover` | This repo; the registry doesn't ship them | You are changing the console header only |

Light and dark values sit side by side in the same file. Change both, and check the result in both modes &mdash;
the [screenshot tests](development.md#screenshot-tests) cover dark mode on the sign-in page only.

PatternFly components that stay on PatternFly pick these tokens up through the bridge in
[`src/admin/index.css`](../src/admin/index.css), so a token change reaches them too.

## Logo

The login card renders two SVGs and shows one per colour mode, from
[`src/login/Template.tsx`](../src/login/Template.tsx):

| File | Shown in |
| --- | --- |
| `public/logo/nebari-logo-light.svg` | Light mode |
| `public/logo/nebari-logo-dark.svg` | Dark mode |

Replace those files, keeping the names. The mark on the Admin welcome tab is a separate, owned asset at
`src/admin/assets/icon.svg`.

## Translations

Login-page text comes from Keycloak's message bundles, overridden in
[`src/login/i18n.ts`](../src/login/i18n.ts):

```ts
const { useI18n, ofTypeI18n } = i18nBuilder
    .withThemeName<ThemeName>()
    .withCustomTranslations({
        en: {
            loginTitle: "Sign in to {0}",
            doLogIn: "Sign In",
            // add keys here, or add another locale alongside `en`
        }
    })
    .build();
```

Use it in a page through `msg("key")` or `msgStr("key")`. Don't hardcode user-facing strings in a page, and
don't post-process a translated string &mdash; a regex that strips a prefix off one locale's wording won't match
another's. Add a custom key instead.

The consoles use Keycloak's own translations and aren't customised here.

## Login pages

### Changing an existing page

Pages live in [`src/login/pages/`](../src/login/pages/) and are built from design-system components. Preview
your change at http://localhost:5173/?preview=&lt;name&gt; &mdash; the names are listed in
[Quick start](quick-start.md#the-dev-server-login-pages).

The update-profile page, and registration when the realm has User Profile enabled, render their fields through
Keycloakify's `UserProfileFormFields`. That takes CSS class names rather than components, so those fields are
styled by the `.nebari-*` classes in `theme.css`. If you change how an input looks, change it in both places.

### Adding a page

A page this theme doesn't implement still works &mdash; it falls through to Keycloakify's default, unstyled. To
style one:

1. Create it in `src/login/pages/`, using an existing page as the template.
2. Add a `case` for its `.ftl` page id in [`src/login/KcPage.tsx`](../src/login/KcPage.tsx).
3. Add a preview for it in `getKcContextMockForPreview` in
   [`src/login/KcContext.ts`](../src/login/KcContext.ts).
4. Add the preview name to [`tests/visual.spec.ts`](../tests/visual.spec.ts), then generate its baseline on
   Linux &mdash; see [Development](development.md#regenerate-baselines-on-linux).

## Design-system components

Components come from the [Nebari design registry](https://nebari-dev.github.io/nebari-design/), registered as
`@nebari` in [`components.json`](../components.json):

```bash
npx shadcn add @nebari/<name>
```

**Never edit anything under `src/components/ui/` or the registry hooks in `src/hooks/`.** `shadcn add`
regenerates them, so a local edit is silently lost on the next upgrade &mdash; that has already happened once
here. Change a component at the call site instead:

- pass `className`
- swap the rendered element with Base UI's `render` prop
- or wrap it in a component of your own under `src/components/nebari/`

The registry uses `@/ui/...` import paths internally. The `@/ui/*` alias in `tsconfig.json` and
`vite.config.ts` exists so those files can be installed without editing them &mdash; app code should keep using
`@/components/ui/...`.

## The consoles

The Admin and Account consoles are restyled mostly without touching their views &mdash; see
[Architecture](architecture.md#the-consoles-swapping-components-underneath). The places you're most likely to
change:

| To change | Edit |
| --- | --- |
| How a PatternFly component looks everywhere | Its adapter in [`src/components/patternfly/`](../src/components/patternfly/) |
| Something that stays on PatternFly | A rule in [`src/admin/index.css`](../src/admin/index.css) &mdash; mind the [cascade layer](architecture.md#cascade-layers) |
| The Admin sidebar | [`src/admin/PageNav.tsx`](../src/admin/PageNav.tsx), which is owned and [guarded](development.md#checkpage-nav-sync) |
| Standard list screens | [`KeycloakDataTable.tsx`](../src/shared/keycloak-ui-shared/controls/table/KeycloakDataTable.tsx), which covers 48 of them |
| The profile menu in both headers | [`src/components/nebari/ProfileMenu.tsx`](../src/components/nebari/ProfileMenu.tsx) |

Anything else probably means owning a new file. Read [Ownership](ownership.md) first.
