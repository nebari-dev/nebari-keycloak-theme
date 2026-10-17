/**
 * Accessibility problems that exist today and are tracked, so the suite can
 * stay green while still failing on anything new.
 *
 * Every entry is as narrow as it can be: one rule, on the surfaces and themes
 * where it occurs, matched by a CSS selector or, for contrast, by the exact
 * colour pair. A matching element somewhere else, or the same element failing a
 * different rule, still fails. Each entry names why it is excused and the issue
 * that will fix it — when that issue is closed, delete the entry so the check
 * guards the fix.
 *
 * Don't add an entry to make a failing test pass. Fix the problem, or file an
 * issue first and link it here.
 */

export type Surface = "login" | "admin" | "account";

/** What a check is looking at: which kind of page, in which theme. */
export type A11yTarget = { surface: Surface; theme: string };

export type KnownViolation = {
    id: string;
    /** An axe rule id, or one of the keyboard rules exported from keyboard.ts. */
    rule: string;
    surfaces: readonly Surface[];
    /** Omit to apply in every theme. */
    themes?: readonly string[];
    /** The offending element must match this selector. */
    selector?: string;
    /** For color-contrast: the offending foreground/background pairs, as axe reports them. */
    colors?: readonly { foreground: string; background: string }[];
    reason: string;
    /** The follow-up issue that will fix it. */
    issue: string;
};

const ISSUES = "https://github.com/nebari-dev/nebari-keycloak-theme/issues";
const KEYBOARD_ISSUE = `${ISSUES}/69`;
const NAMES_ISSUE = `${ISSUES}/70`;

export const knownViolations: readonly KnownViolation[] = [
    {
        id: "login-positive-tabindex",
        rule: "tabindex",
        surfaces: ["login"],
        selector:
            ":is(.nebari-login-card, [data-login-theme='template'] [data-slot='card']) " +
            "[tabindex]:not([tabindex='0']):not([tabindex='-1'])",
        reason:
            "The sign-in form keeps Keycloak's positive tabindex values (2–5), so Tab order is set by " +
            "hand instead of by the DOM. Removing them moves 'Forgot password?' between the username " +
            "and password fields, which is a UX decision, not a mechanical fix.",
        issue: KEYBOARD_ISSUE
    },
    {
        id: "login-password-toggle-unreachable",
        rule: "keyboard-unreachable",
        surfaces: ["login"],
        selector:
            ":is([data-slot='input-wrapper']:has(> input[type='password'], > input[type='text']) " +
            "[data-slot='input-end-adornment'] > button[tabindex='-1'], " +
            "[data-login-theme='template'] div:has(> input) > button[tabindex='-1'][aria-pressed])",
        reason:
            "The show/hide button has tabIndex={-1} in both themes (src/components/nebari/PasswordField.tsx, " +
            "src/login/template/PasswordInput.tsx), so keyboard and switch users cannot reveal what they typed. " +
            "It is kept out of the Tab order because the positive tabindexes above would otherwise sort it after " +
            "the submit button; it is fixed with them.",
        issue: KEYBOARD_ISSUE
    },

    // Vendored console markup: fixing these here would mean owning upstream files.
    {
        id: "admin-user-list-kebab-unnamed",
        rule: "button-name",
        surfaces: ["admin"],
        selector:
            "[data-slot='keycloak-data-table'] .pf-v5-c-toolbar__item > .pf-v5-c-menu-toggle.pf-m-plain:not([aria-label]):not([aria-labelledby])",
        reason:
            "The user list's toolbar kebab is an icon-only MenuToggle with no aria-label " +
            "(upstream components/users/UserDataTableToolbarItems.tsx), so screen readers announce an unnamed button.",
        issue: NAMES_ISSUE
    },
    {
        id: "admin-action-menu-state",
        rule: "menu-expanded-state",
        surfaces: ["admin"],
        selector: "[data-testid='action-dropdown']",
        reason:
            "The page-header Action menu's toggle keeps aria-expanded=false while its menu is open, because " +
            "upstream components/view-header/ViewHeader.tsx doesn't pass isExpanded to MenuToggle. The menu " +
            "itself works by keyboard; only the announced state is wrong.",
        issue: NAMES_ISSUE
    },
    {
        id: "admin-multi-line-input-buttons-unreachable",
        rule: "keyboard-unreachable",
        surfaces: ["admin"],
        selector: "button[tabindex='-1']:is([data-testid$='-addValue'], [data-testid^='remove'])",
        reason:
            "Upstream components/multi-line-input/MultiLineInput.tsx sets tabIndex={-1} on its Add and Remove " +
            "buttons, so on client settings a keyboard user can enter one redirect URI or web origin but can never " +
            "add a second or remove one. This blocks the task outright (WCAG 2.1.1). Its aria-label 'Add' also hides " +
            "the visible text 'Add valid redirect URIs' from speech-input users (2.5.3).",
        issue: KEYBOARD_ISSUE
    },
    {
        id: "account-groups-row-checkbox-unnamed",
        rule: "aria-toggle-field-name",
        surfaces: ["account"],
        selector:
            ".pf-v5-c-data-list [role='checkbox'][aria-disabled='true']:not([aria-label]):not([aria-labelledby])",
        reason:
            "Each row on the Account Groups page has a disabled 'direct membership' checkbox with no label " +
            "(upstream groups/Groups.tsx).",
        issue: NAMES_ISSUE
    }
];

export function knownViolationsFor({ surface, theme }: A11yTarget): KnownViolation[] {
    return knownViolations.filter(
        violation =>
            violation.surfaces.includes(surface) &&
            (violation.themes === undefined || violation.themes.includes(theme))
    );
}
