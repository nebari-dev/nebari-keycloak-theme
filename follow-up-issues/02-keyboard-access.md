# Make every control reachable and in order by keyboard

**Labels:** UI/UX/DX

### Summary

The accessibility suite from #6 finds three keyboard problems: two on the sign-in page and one in the Admin
console. Each is excused in `tests/a11y/known-violations.ts` and points here.

### Problems

- [ ] **Admin, client settings: multi-value fields can't be edited by keyboard** (priority,
      `admin-multi-line-input-buttons-unreachable`). The Add and Remove buttons of every multi-value field
      (Valid redirect URIs, Web origins…) have `tabIndex={-1}`. A keyboard user can type one value but can never
      add a second or remove one (WCAG 2.1.1). The Add button's `aria-label="Add"` also hides its visible text,
      "Add valid redirect URIs", from speech-input users (2.5.3). **Upstream:**
      `admin/components/multi-line-input/MultiLineInput.tsx`. A shim can't tell these buttons apart from
      legitimate `tabIndex={-1}` uses, so the fix means owning the file
      (`npx keycloakify own --path "admin/components/multi-line-input/MultiLineInput.tsx"`), removing
      `tabIndex={-1}` from both buttons and the `aria-label` from Add. Add it to the table in
      `docs/ownership.md`, and report the bug upstream so the file can be handed back.
- [ ] **Login: the show/hide password button can't be reached by keyboard**
      (`login-password-toggle-unreachable`). `src/components/nebari/PasswordField.tsx` sets `tabIndex={-1}` on
      the toggle, so keyboard and switch users can't check what they typed (2.1.1). **Ours:** remove
      `tabIndex={-1}`, and update the component's doc comment, which describes the toggle as deliberately out
      of the Tab order.
- [ ] **Login: Tab order is set by hand** (`login-positive-tabindex`). `src/login/pages/Login.tsx` keeps
      Keycloak's positive `tabIndex` values (2–5) on username, password, remember me and Sign In, so Tab order
      doesn't follow the page (axe `tabindex`). **Ours, needs a UX decision:** removing them makes Tab follow
      the DOM: username → "Forgot password?" → password → show/hide → remember me → Sign In. That puts
      "Forgot password?" between the two fields. Agree on the order before changing it.

### Acceptance Criteria

- [ ] Every control on client settings and on the sign-in page is reachable with Tab and Shift+Tab
- [ ] The three entries are removed from `tests/a11y/known-violations.ts`
- [ ] `npm run test:a11y` and `npm run test:a11y:consoles` pass; the console change is checked in the compose
      loop
- [ ] Login screenshot baselines are unchanged, or the changes are reviewed

### Out of Scope

- Keyboard behaviour of console screens the suite doesn't visit
