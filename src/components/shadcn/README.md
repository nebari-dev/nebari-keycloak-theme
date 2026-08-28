# Stock shadcn/ui components

These are unmodified [shadcn/ui](https://ui.shadcn.com) components (`new-york`
style, `neutral` base), built on Radix primitives. They exist **separately** from
`src/components/ui/`, which holds the Nebari design-system registry components
built on Base UI.

| Directory | Registry | Primitive layer | Used by |
| --- | --- | --- | --- |
| `src/components/ui/` | `@nebari` | Base UI | the `nebari` login theme, Admin Console |
| `src/components/shadcn/` | shadcn/ui | Radix | the `template` login theme |

## Why they are separate

The `template` theme is a **starting point for customers to customize**. Basing
it on stock shadcn rather than the Nebari registry means a customer can run
`npx shadcn@latest add <component>` and get components that match what is already
here — no Nebari brand tokens, no Base UI API differences, nothing to unpick.

The two sets are not interchangeable: Base UI's `<FieldError match={…}>` and
Radix's control APIs differ, which is why the `template` theme ships its own
page implementations under `src/login/template/` rather than sharing the
`nebari` theme's pages.

## Editing

Treat these as upstream-managed, exactly like `src/components/ui/`. To restyle,
pass `className` at the call site. Regenerating a file with the shadcn CLI must
target this directory, not `src/components/ui/` — the CLI reads
`aliases.ui` from `components.json`, which points at the Nebari directory, so
always pass an explicit path or move the file afterwards.

Stock shadcn expects its initializer to apply `border-border` to every element.
The generated Card, Alert and outline Button therefore specify border width but
not border colour. The equivalent base rule in `src/theme.css` is deliberately
scoped to `[data-login-theme="template"]`; do not make it global, because that
would change the Nebari theme and both Keycloak consoles. Inputs opt into
`bg-muted` in the template page compositions (and the profile page's class map),
so the Theme customization `inputBackground` token is visible without modifying
the upstream component files.

The shipped neutral palette uses neutral-500 control borders and mode-specific
error reds. Keep the browser contrast assertions in `tests/visual.spec.ts` when
changing those defaults: control boundaries must remain at least 3:1 and normal
error text at least 4.5:1.
