# Fix colour contrast below 4.5:1 in the Nebari consoles

**Labels:** UI/UX/DX

### Summary

The accessibility suite from #6 finds two text colour pairs below the WCAG 2.2 AA contrast minimum of 4.5:1
(1.4.3). Both are excused in `tests/a11y/known-violations.ts` and point here. Both are in this repository's CSS,
so no vendored file has to be owned.

### Problems

- [ ] **Account console, light scheme: the current nav item** (`account-current-nav-item-contrast`).
      `#7c3aed` on `#e8e1f5` is 4.48:1, on every Account page (`.pf-m-current` and the `aria-current="page"` link).
      Set in `src/account/nebari-account.css`, rule `.pf-v5-c-nav__link.pf-m-current`. Nebari's darker brand
      violet, `--nebari-purple-dark` (`#6d28d9`), is 5.59:1 on the same background. The hover state, `#7c3aed` on
      a 7% tint, is 4.7:1 and already passes.
- [ ] **Admin console, dark scheme: the info-alert title** (`nebari-admin-dark-info-alert-title`).
      `#2b9af3` on `#353538` is 4.08:1, seen on Realm settings → Email. PatternFly's dark theme colours the title
      with `--pf-v5-global--info-color--100`. `src/admin/index.css` restyles the danger, warning and success
      alerts with theme tokens but not info. Setting `--pf-v5-c-alert--m-info__title--Color` for info alerts in
      the dark scheme, for example to `var(--foreground)`, fixes it.

### Acceptance Criteria

- [ ] Both colour pairs reach at least 4.5:1
- [ ] Both entries are removed from `tests/a11y/known-violations.ts`
- [ ] `npm run test:a11y:consoles` passes against a rebuilt image (`docker compose up -d --build keycloak`)
- [ ] The Collab theme's Account and Admin consoles look unchanged, checked in the compose loop
- [ ] The helper test "excuse a known violation only where it is known" in `tests/a11y/helpers.spec.ts` uses
      `nebari-admin-dark-info-alert-title` as its fixture; point it at a remaining colour entry, or rework it if
      none is left

### Out of Scope

- Contrast on the login pages, which already passes in both brands and both colour schemes
