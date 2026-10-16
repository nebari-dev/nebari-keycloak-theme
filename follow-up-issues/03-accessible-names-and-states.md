# Give console controls their accessible names and states

**Labels:** UI/UX/DX

### Summary

The accessibility suite from #6 finds three console controls that screen readers announce wrongly (WCAG 4.1.2).
All three come from vendored Keycloak markup. Each is excused in `tests/a11y/known-violations.ts` and points
here.

### Problems

- [ ] **Admin, Users list: the toolbar kebab has no name** (`admin-user-list-kebab-unnamed`). It is an
      icon-only `MenuToggle variant="plain"` without `aria-label`, so it is announced as "button" (axe
      `button-name`). **Upstream:** `admin/components/users/UserDataTableToolbarItems.tsx`. It can be fixed
      without owning the file: wrap `MenuToggle` in the PatternFly shim (`src/shared/@patternfly/react-core`) so
      an icon-only plain toggle with no `aria-label` or `aria-labelledby` gets the console's "action"
      translation.
- [ ] **Admin, page header: the Action menu reports "collapsed" while open** (`admin-action-menu-state`).
      `components/view-header/ViewHeader.tsx` doesn't pass `isExpanded` to its `MenuToggle`, so
      `aria-expanded` stays `false`. The menu itself works by keyboard. **Upstream**, fixable in the shim: wrap
      `Dropdown` so it passes its `isOpen` to a `MenuToggle` that has no `isExpanded`.
- [ ] **Account, Groups: each row's checkbox has no name** (`account-groups-row-checkbox-unnamed`). The
      disabled "direct membership" checkbox has no label (axe `aria-toggle-field-name`). **Upstream:**
      `account/groups/Groups.tsx`. The adapter can't invent a name for an unlabelled call site, so the fix
      means owning the file and adding, for example, `aria-label={`${t("directMembership")}: ${group.path}`}`.
      Add it to `docs/ownership.md`, and report the bug upstream.

### Acceptance Criteria

- [ ] Each control is announced with a name and, for the menu, the right expanded state
- [ ] Shim wrappers match PatternFly's public API exactly: props pass through, refs are forwarded, and anything a
      caller sets explicitly wins
- [ ] The three entries are removed from `tests/a11y/known-violations.ts`
- [ ] `npm run test:a11y:consoles` passes against a rebuilt image, and the change is checked in the compose loop

### Out of Scope

- Names and states on console screens the suite doesn't visit
