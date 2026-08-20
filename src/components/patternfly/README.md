# PatternFly → Nebari adapters

The Admin Console ships ~520 vendored views from `@keycloakify/keycloak-admin-ui`,
and every one of them reaches PatternFly through a single re-export shim at
[`src/shared/@patternfly/react-core/index.tsx`](../../shared/@patternfly/react-core/index.tsx)
— 356 admin files, plus 41 in `src/shared/keycloak-ui-shared` (`FormSubmitButton`,
`KeycloakDataTable`, the dynamic user-profile fields). No file imports
`@patternfly/react-core` directly.

That shim is the seam. Each module here presents a PatternFly component's public
API and renders a Nebari design-system component instead, so one export swap
restyles every call site at once — no per-view edits, and no `keycloakify own`
on hundreds of files that would then be frozen against upstream updates.

Two rules shape everything in this folder:

1. **`src/components/ui/*` is upstream-managed.** The Nebari registry
   regenerates those files on `shadcn add`, so they are never edited. Adaptation
   happens here, at the call site, via `className` and the Base UI `render`
   prop — which is exactly what the registry's own skill prescribes.
2. **The PatternFly API is the contract.** Callers keep passing `isDisabled`,
   `onChange={(event, value) => …}`, `component={Link}` and so on. Each adapter
   translates; it never asks the 520 views to change.

## What is deliberately *not* adapted

Some PatternFly components carry behaviour that the visual layer can't replace,
so they stay on PatternFly and are restyled through the token bridge in
[`src/admin/index.css`](../../admin/index.css) instead:

| Component | Why it stays |
| --- | --- |
| `Table` / `Th` / `Td` | `KeycloakDataTable` drives sorting, row selection, expandable and tree rows, drag handles and the actions kebab through PatternFly-specific props. Swapping the elements would keep the look and lose the behaviour. |
| `Radio` | Base UI's radio needs a `RadioGroup` ancestor for roving focus. PatternFly's `Radio` is standalone and the views render bare ones in loops, so a drop-in swap would break keyboard navigation. |
| `Select` / `MenuToggle` | Popper placement, typeahead and chip state are managed inside PatternFly. |
| `Modal` | Focus trapping, portal and scroll locking. |
| `Alert` (toasts) | `AlertGroup` owns the toast queue and timers. |
| `Tooltip` | Nebari's `TooltipTrigger` anchors itself through a ref on the rendered element. The registry components take `ref` as a plain prop — the React 19 convention — and this app is on React 18, where a function component cannot receive one, so the anchor would come back null and the tooltip would not position. `PageHeader.tsx` works around this for its one menu trigger by rendering a DOM element; doing the same across 16 tooltip call sites is not worth the churn until the app moves to React 19. |
| `variant="control"` buttons | Designed to sit flush inside a PatternFly `InputGroup`; rounded Nebari corners would detach them. |
