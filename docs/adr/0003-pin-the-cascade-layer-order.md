# 0003 — Pin one cascade-layer order and wrap PatternFly in its own layer

- **Status:** ACCEPTED
- **Date:** 2026-08-31 (recorded afterwards, in September 2026)
- **Implemented in:** #15

## Context

The consoles load two styling systems at once: Tailwind, which puts everything it emits in cascade layers, and
PatternFly, which ships its CSS unlayered.

**Unlayered CSS beats every cascade layer, whatever the selector specificity.** So PatternFly's global reset
&mdash; `*, ::before, ::after { padding: 0 }` and its font rule &mdash; was beating every Tailwind utility,
stripping design-system components of their padding, font size and layout inside the consoles.

PatternFly's component CSS is imported from inside `node_modules` by `@patternfly/react-styles`, not from a
stylesheet this repo controls, so `@import ... layer()` isn't available.

## Decision

Declare one order at the top of `src/theme.css`:

```css
@layer theme, base, patternfly, components, utilities;
```

and wrap every PatternFly stylesheet in the `patternfly` layer at build time, with a Vite plugin
(`patternflyCssLayer` in `vite.config.ts`).

The plugin repeats the order statement at the top of each PatternFly file. A layer's position is fixed the first
time the browser sees its name, and PatternFly's CSS can load before `theme.css`; without the repetition,
`patternfly` could be registered as the first, weakest layer.

## Because

This is the only position that works:

- **above `base`**, so Tailwind's preflight doesn't strip PatternFly's own padding and borders
- **below `utilities`**, so a utility on a design-system component still beats PatternFly's reset

## Consequences

- **Every new rule needs a layer decision.** Unlayered rules in this repo also beat everything. Two have caused
  bugs: login-page element selectors such as `a` and `input[type="text"]` leaked into the consoles and overrode
  components, and an unlayered rule in `src/admin/index.css` beat Tailwind's `hidden` and pinned an error icon onto
  every valid field.
- **Scoping has a specificity trap.** Login-page rules are confined with `:where(.nebari-login-wrapper)`, which
  adds no specificity. A bare `:not([data-slot])` next to it does &mdash; it counts as an attribute selector
  &mdash; and was enough to turn the social sign-in buttons purple. It has to be written
  `:where(:not([data-slot]))`.
- The plugin changes every PatternFly stylesheet the build emits. It was verified against a real build output at
  the time; a PatternFly change that introduces `@import` would need it revisited.
