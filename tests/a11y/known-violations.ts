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

/** Filed as follow-ups to #6; replace with the issue links once they exist. */
const PENDING_ISSUE = "to be filed (follow-up to #6)";

export const knownViolations: readonly KnownViolation[] = [
    {
        id: "login-positive-tabindex",
        rule: "tabindex",
        surfaces: ["login"],
        selector: ".nebari-login-card [tabindex]:not([tabindex='0']):not([tabindex='-1'])",
        reason:
            "The sign-in form keeps Keycloak's positive tabindex values (2–5), so Tab order is set by " +
            "hand instead of by the DOM. Removing them moves 'Forgot password?' between the username " +
            "and password fields, which is a UX decision, not a mechanical fix.",
        issue: PENDING_ISSUE
    },
    {
        id: "login-password-toggle-unreachable",
        rule: "keyboard-unreachable",
        surfaces: ["login"],
        selector: "[data-slot='input-wrapper']:has(> input[type='password'], > input[type='text']) [data-slot='input-end-adornment'] > button[tabindex='-1']",
        reason:
            "PasswordField sets tabIndex={-1} on the show/hide button (src/components/nebari/PasswordField.tsx), " +
            "so keyboard and switch users cannot reveal what they typed.",
        issue: PENDING_ISSUE
    },

    // Collab palette. One cause each: a colour pair that doesn't reach 4.5:1.
    {
        id: "collab-primary-button-contrast",
        rule: "color-contrast",
        surfaces: ["login", "admin", "account"],
        themes: ["collab"],
        colors: [{ foreground: "#ffffff", background: "#4d75fe" }],
        reason:
            "White on Collab's primary blue #4d75fe is 3.96:1. It's the brand's primary action colour, " +
            "so the fix — a darker primary or dark button text — is a design decision.",
        issue: PENDING_ISSUE
    },
    {
        id: "collab-login-alert-contrast",
        rule: "color-contrast",
        surfaces: ["login"],
        themes: ["collab"],
        colors: [
            { foreground: "#b9c7f6", background: "#3b58aa" },
            { foreground: "#ffad96", background: "#465098" },
            { foreground: "#4d75fe", background: "#2545a0" }
        ],
        reason:
            "On the verify-email, info and error pages: alert text is 3.97:1 (info) and 4.07:1 (error), and " +
            "a link inside an alert is 2.17:1.",
        issue: PENDING_ISSUE
    },
    {
        id: "collab-admin-light-input-text",
        rule: "color-contrast",
        surfaces: ["admin"],
        themes: ["collab"],
        colors: [
            { foreground: "#151515", background: "#022791" },
            { foreground: "#151515", background: "#3250a6" },
            { foreground: "#151515", background: "#4762af" },
            { foreground: "#151515", background: "#556eb5" }
        ],
        reason:
            "In the light scheme, some PatternFly inputs keep their default near-black text (#151515) on " +
            "Collab's dark blue fields — as low as 1.47:1, effectively unreadable. Collab forces a dark " +
            "palette but these fields still follow the light one.",
        issue: PENDING_ISSUE
    },
    {
        id: "collab-admin-muted-text",
        rule: "color-contrast",
        surfaces: ["admin"],
        themes: ["collab"],
        colors: [
            { foreground: "#b9c7f6", background: "#3250a6" },
            { foreground: "#e0e0e0", background: "#4762af" }
        ],
        reason: "Muted and empty-state text, 4.43:1 and 4.37:1: just under the threshold.",
        issue: PENDING_ISSUE
    },

    // Nebari palette.
    {
        id: "nebari-admin-dark-info-alert-title",
        rule: "color-contrast",
        surfaces: ["admin"],
        themes: ["nebari"],
        colors: [{ foreground: "#2b9af3", background: "#353538" }],
        reason: "PatternFly's info-alert title colour on Nebari's dark alert background is 4.08:1.",
        issue: PENDING_ISSUE
    },
    {
        id: "account-current-nav-item-contrast",
        rule: "color-contrast",
        surfaces: ["account"],
        colors: [{ foreground: "#7c3aed", background: "#e8e1f5" }],
        reason:
            "The current Account nav item is 4.48:1 in the light scheme. It is also Nebari purple in the " +
            "Collab theme, which means Nebari's palette is leaking into Collab there.",
        issue: PENDING_ISSUE
    },

    // Vendored console markup: fixing these here would mean owning upstream files.
    {
        id: "admin-user-list-kebab-unnamed",
        rule: "button-name",
        surfaces: ["admin"],
        selector: "[data-slot='keycloak-data-table'] .pf-v5-c-toolbar__item > .pf-v5-c-menu-toggle.pf-m-plain:not([aria-label]):not([aria-labelledby])",
        reason:
            "The user list's toolbar kebab is an icon-only MenuToggle with no aria-label " +
            "(upstream components/users/UserDataTableToolbarItems.tsx), so screen readers announce an unnamed button.",
        issue: PENDING_ISSUE
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
        issue: PENDING_ISSUE
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
        issue: PENDING_ISSUE
    },
    {
        id: "account-groups-row-checkbox-unnamed",
        rule: "aria-toggle-field-name",
        surfaces: ["account"],
        selector: ".pf-v5-c-data-list [role='checkbox'][aria-disabled='true']:not([aria-label]):not([aria-labelledby])",
        reason:
            "Each row on the Account Groups page has a disabled 'direct membership' checkbox with no label " +
            "(upstream groups/Groups.tsx).",
        issue: PENDING_ISSUE
    }
];

export function knownViolationsFor({ surface, theme }: A11yTarget): KnownViolation[] {
    return knownViolations.filter(
        violation =>
            violation.surfaces.includes(surface) &&
            (violation.themes === undefined || violation.themes.includes(theme))
    );
}
