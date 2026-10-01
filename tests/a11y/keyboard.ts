import { expect, type Page } from "@playwright/test";
import { knownViolationsFor, type A11yTarget } from "./known-violations";

/**
 * Keyboard checks that hold for any page, whatever its markup:
 *
 * - every visible control can be reached with Tab (WCAG 2.1.1),
 * - every stop shows a visible focus indicator (2.4.7),
 * - Shift+Tab walks the same stops backwards, so nothing traps focus (2.1.2).
 *
 * They read the rendered page rather than class names, so they apply unchanged
 * to the login pages and to the vendored consoles.
 */

export type FocusStop = {
    /** Stable per element for the lifetime of the page. */
    key: string;
    /** A human-readable description for failure messages. */
    label: string;
    /** Whether focusing it changed how it, its pseudo-elements or its wrapper are drawn. */
    hasIndicator: boolean;
    /** The radio group it belongs to, if any. */
    radioGroup?: string;
    /** The id of the known violation that excuses a missing indicator, if any. */
    excusedBy?: string;
};

export const UNREACHABLE_RULE = "keyboard-unreachable";
export const NO_FOCUS_INDICATOR_RULE = "keyboard-no-focus-indicator";

/** Where focus is when the document itself, not an element, holds it. */
const DOCUMENT_STOP = "#document";

/** Upper bound, so a page that keeps generating focus targets cannot hang a test. */
const MAX_STOPS = 400;

/** One full trip around the Tab cycle. */
export type Walk = {
    stops: FocusStop[];
    /**
     * Controls that were disabled when the walk began. Some enable themselves
     * as focus moves — PatternFly's tab-scroll buttons do once the tab list
     * scrolls — so a walk can legitimately meet them when an earlier one didn't.
     */
    disabledAtStart: Set<string>;
};

/**
 * Tabs until focus comes back to an element it has already visited and returns
 * that cycle. The starting point doesn't matter: a full cycle visits every stop.
 */
export async function tabThrough(page: Page, target: A11yTarget, key: "Tab" | "Shift+Tab" = "Tab"): Promise<Walk> {
    const disabledAtStart = new Set(await snapshotUnfocusedStyles(page));

    const excuses = selectorsFor(target, NO_FOCUS_INDICATOR_RULE);
    const stops: FocusStop[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < MAX_STOPS; i++) {
        await page.keyboard.press(key);

        const stop = await describeFocusedElement(page, excuses);

        if (stop.key === DOCUMENT_STOP) {
            continue;
        }

        if (!/^\d+$/.test(stop.key)) {
            throw new Error(`Focus stop got a malformed key "${stop.key}"; the walk can't be trusted`);
        }

        if (seen.has(stop.key)) {
            return { stops, disabledAtStart };
        }

        seen.add(stop.key);
        stops.push(stop);
    }

    throw new Error(`Focus never cycled back after ${MAX_STOPS} Tab presses`);
}

/**
 * Every control that was visible and enabled both before and after the walk
 * should appear among its stops. A control that only enables itself partway
 * through, or disables itself as focus approaches — PatternFly's tab-scroll
 * buttons do both as the tab list scrolls — wasn't skipped; its job is done by
 * the controls Tab does reach.
 */
export function expectAllControlsReachable(controls: Control[], stops: FocusStop[]) {
    const reached = new Set(stops.map(stop => stop.key));

    const unreachable = controls.filter(
        control =>
            control.excusedBy === undefined &&
            !reached.has(control.key) &&
            !control.standInKeys.some(key => reached.has(key))
    );

    expect(
        unreachable.map(control => control.label),
        "controls that Tab never reaches"
    ).toEqual([]);
}

export function expectVisibleFocusIndicators(stops: FocusStop[]) {
    expect(
        stops.filter(stop => !stop.hasIndicator && stop.excusedBy === undefined).map(stop => stop.label),
        "focus stops without a visible focus indicator"
    ).toEqual([]);
}

/**
 * Walks the cycle both ways and checks they are mirror images. A trap, or a
 * stop only reachable in one direction, breaks the symmetry. A stop one walk
 * met and the other didn't is only allowed if it was disabled when the other
 * walk began.
 */
export async function expectNoFocusTrap(page: Page, target: A11yTarget, forward: Walk) {
    const backward = await tabThrough(page, target, "Shift+Tab");
    const inForward = new Set(forward.stops.map(stop => stop.key));
    const inBackward = new Set(backward.stops.map(stop => stop.key));

    const forwardStops = forward.stops.filter(
        stop => inBackward.has(stop.key) || !backward.disabledAtStart.has(stop.key)
    );
    const backwardStops = backward.stops.filter(
        stop => inForward.has(stop.key) || !forward.disabledAtStart.has(stop.key)
    );

    // Compared by element, not by label: two different stops can share a
    // label, such as two unnamed icon buttons, and merging them would hide a
    // stop that only one direction reaches.
    expect(sequence([...backwardStops].reverse()), "Shift+Tab should retrace the Tab order").toEqual(
        sequence(forwardStops)
    );
}

/** Runs the three checks above on the page as it currently stands. */
export async function expectKeyboardAccessible(page: Page, target: A11yTarget) {
    const excuses = selectorsFor(target, UNREACHABLE_RULE);
    const controlsBefore = await listVisibleControls(page, excuses);
    const walk = await tabThrough(page, target);
    const stillAvailable = new Set((await listVisibleControls(page, excuses)).map(control => control.key));

    expect(walk.stops.length, "the page should have at least one focusable control").toBeGreaterThan(0);
    expectAllControlsReachable(
        controlsBefore.filter(control => stillAvailable.has(control.key)),
        walk.stops
    );
    expectVisibleFocusIndicators(walk.stops);
    await expectNoFocusTrap(page, target, walk);
}

function selectorsFor(target: A11yTarget, rule: string): { id: string; selector: string }[] {
    return knownViolationsFor(target)
        .filter(violation => violation.rule === rule && violation.selector !== undefined)
        .map(violation => ({ id: violation.id, selector: violation.selector! }));
}

/**
 * The cycle as a comparable list, one entry per element, labelled for the
 * failure message. A radio group counts once: with nothing checked, Tab enters
 * it at its first radio and Shift+Tab at its last, which is correct behaviour,
 * not a trap. Only consecutive stops in the same group are merged.
 */
function sequence(stops: FocusStop[]): string[] {
    const entries = normalizeCycle(stops).map(stop =>
        stop.radioGroup === undefined ? `${stop.label} #${stop.key}` : `radio group "${stop.radioGroup}"`
    );

    return entries.filter((entry, index) => !entry.startsWith("radio group") || entry !== entries[index - 1]);
}

/** Rotates a cycle to start at its smallest key, so two walks compare equal. */
function normalizeCycle(stops: FocusStop[]): FocusStop[] {
    if (stops.length === 0) {
        return stops;
    }

    const smallest = [...stops].sort((a, b) => Number(a.key) - Number(b.key))[0];
    const start = stops.indexOf(smallest);

    return [...stops.slice(start), ...stops.slice(0, start)];
}

// Everything below runs in the browser. The functions are self-contained
// because Playwright serialises them into the page.

/**
 * Records how every control looks while unfocused. Transitions and smooth
 * scrolling are switched off first: a style read straight after blur() or
 * focus() would otherwise catch a transition mid-way, and a page that reacts to
 * scrolling — PatternFly's tab-scroll buttons enable and disable themselves as
 * the tab list scrolls — would still be reacting when the next stop is read.
 * Focus is dropped so an autofocused field is not recorded in its focused state.
 */
async function snapshotUnfocusedStyles(page: Page): Promise<string[]> {
    await page.addStyleTag({
        content: "*, *::before, *::after { transition: none !important; scroll-behavior: auto !important; }"
    });

    return page.evaluate(() => {
        (document.activeElement as HTMLElement | null)?.blur();

        const w = window as unknown as {
            __a11yNextKey?: number;
            __a11yStyles?: Map<Element, string>;
        };

        const styleSignature = (element: Element): string => {
            const read = (target: Element | null, pseudo?: string) => {
                if (target === null) {
                    return "";
                }

                const style = getComputedStyle(target, pseudo);

                return [
                    style.content,
                    style.opacity,
                    style.visibility,
                    style.transform,
                    style.outlineStyle,
                    style.outlineWidth,
                    style.outlineColor,
                    style.outlineOffset,
                    style.boxShadow,
                    style.borderTopColor,
                    style.borderBottomColor,
                    style.borderTopWidth,
                    style.borderBottomWidth,
                    style.backgroundColor,
                    style.color,
                    style.textDecorationLine
                ].join("|");
            };

            // Many components draw their ring on a wrapper through
            // :focus-within, or on a pseudo-element, so all of them count as
            // part of the indicator.
            return [
                read(element),
                read(element, "::before"),
                read(element, "::after"),
                read(element.parentElement),
                read(element.parentElement, "::before"),
                read(element.parentElement, "::after")
            ].join("#");
        };

        (window as unknown as { __a11yStyleSignature: typeof styleSignature }).__a11yStyleSignature =
            styleSignature;

        w.__a11yNextKey ??= 0;
        w.__a11yStyles = new Map();

        const disabled: string[] = [];

        for (const element of document.querySelectorAll("*")) {
            if (!(element instanceof HTMLElement)) {
                continue;
            }

            if (element.tabIndex >= 0) {
                w.__a11yStyles.set(element, styleSignature(element));
            }

            if (element.matches(":disabled")) {
                element.dataset.a11yKey ??= String(w.__a11yNextKey++);
                disabled.push(element.dataset.a11yKey);
            }
        }

        return disabled;
    });
}

async function describeFocusedElement(
    page: Page,
    excuses: { id: string; selector: string }[]
): Promise<FocusStop> {
    return page.evaluate(
        async ([documentStop, excuses]) => {
            // Let the page finish reacting to the focus move — scroll handlers
            // run on the next frame — so every walk sees the same page.
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            let element: Element | null = document.activeElement;

            // Descend into open shadow roots.
            while (element?.shadowRoot?.activeElement) {
                element = element.shadowRoot.activeElement;
            }

            if (element === null || element === document.body || element === document.documentElement) {
                return { key: documentStop, label: documentStop, hasIndicator: true };
            }

            const w = window as unknown as {
                __a11yNextKey: number;
                __a11yStyles: Map<Element, string>;
                __a11yStyleSignature: (element: Element) => string;
            };

            if (!(element as HTMLElement).dataset.a11yKey) {
                (element as HTMLElement).dataset.a11yKey = String(w.__a11yNextKey++);
            }

            const name =
                element.getAttribute("aria-label") ??
                (element as HTMLInputElement).labels?.[0]?.textContent ??
                element.getAttribute("title") ??
                element.getAttribute("placeholder") ??
                element.textContent ??
                "";
            const role = element.getAttribute("role") ?? element.tagName.toLowerCase();
            const label = `${role} "${name.trim().replace(/\s+/g, " ").slice(0, 60)}"`;

            const before = w.__a11yStyles.get(element);
            // An element that appeared after the snapshot has no "before" to
            // compare with; give it the benefit of the doubt rather than a
            // false failure, and let the next scan of that state catch it.
            const hasIndicator = before === undefined || before !== w.__a11yStyleSignature(element);

            const radioGroup =
                element instanceof HTMLInputElement && element.type === "radio" && element.name
                    ? element.name
                    : undefined;

            return {
                key: (element as HTMLElement).dataset.a11yKey!,
                label,
                hasIndicator,
                radioGroup,
                excusedBy: excuses.find(excuse => element!.matches(excuse.selector))?.id
            };
        },
        [DOCUMENT_STOP, excuses] as const
    );
}

export type Control = {
    key: string;
    label: string;
    /**
     * Stops that count as reaching this control: the other radios in its
     * group, or, for a control taken out of the Tab order, whatever stands in
     * for it — a focusable ancestor such as a table row that opens its name
     * link on Enter, or a combobox input for its toggle button.
     */
    standInKeys: string[];
    /** The id of the known violation that excuses it, if any. */
    excusedBy?: string;
};

async function listVisibleControls(page: Page, excuses: { id: string; selector: string }[]): Promise<Control[]> {
    return page.evaluate(excuses => {
        const w = window as unknown as { __a11yNextKey?: number };

        // This can run before the first walk, which is otherwise where the
        // counter starts. Without it every key would be "NaN", every element
        // would look like the same stop, and every check would pass.
        w.__a11yNextKey ??= 0;
        const controlSelector = [
            "a[href]",
            "button",
            "input:not([type=hidden])",
            "select",
            "textarea",
            "summary",
            "[contenteditable=true]",
            // Custom controls announce themselves by role. One without a
            // tabindex is clickable with a mouse and nothing else.
            ...["button", "link", "checkbox", "switch", "textbox", "searchbox", "combobox", "slider", "spinbutton"].map(
                role => `[role=${role}]`
            )
        ].join(",");

        // Roles a composite widget's items have. A composite keeps one item in
        // the Tab order and moves between the rest with the arrow keys, so its
        // other items are tabindex -1 on purpose. The item role is required:
        // PatternFly gives every table role="grid" without arrow-key
        // navigation, so being inside a grid proves nothing.
        const compositeItem = [
            "tab",
            "menuitem",
            "menuitemcheckbox",
            "menuitemradio",
            "option",
            "treeitem",
            "row",
            "gridcell",
            "radio"
        ]
            .map(role => `[role=${role}]`)
            .join(",");

        // Ancestors that can stand in for a control taken out of the Tab
        // order: a table row that opens its name link on Enter, and the like.
        // A focusable scroll container doesn't qualify.
        const standInAncestor = ["tr", ...["row", "button", "link", "option", "treeitem", "gridcell"].map(role => `[role=${role}]`)].join(",");

        const keyOf = (element: HTMLElement) => {
            if (!element.dataset.a11yKey) {
                element.dataset.a11yKey = String(w.__a11yNextKey!++);
            }

            return element.dataset.a11yKey;
        };

        const isVisible = (element: HTMLElement) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);

            return (
                rect.width > 1 &&
                rect.height > 1 &&
                style.visibility !== "hidden" &&
                style.opacity !== "0" &&
                element.closest("[inert], [aria-hidden=true]") === null
            );
        };

        const controls: Control[] = [];

        // Anything else with a tabindex is a focus target too, but only in the
        // Tab order if it asks to be: -1 on a container, such as a skip
        // link's destination, means "focusable from script" and is fine.
        for (const element of document.querySelectorAll<HTMLElement>(`${controlSelector},[tabindex]`)) {
            if (element.tabIndex < 0 && !element.matches(controlSelector)) {
                continue;
            }

            // :disabled also covers controls inside a disabled <fieldset>.
            const isDisabled = element.matches(":disabled") || element.getAttribute("aria-disabled") === "true";

            // Out of the Tab order is only legitimate for a composite's item,
            // or a control in a toolbar that really does keep one control in
            // the Tab order. Anywhere else a visible control there is mouse-only.
            const toolbar = element.parentElement?.closest<HTMLElement>("[role=toolbar]");
            const isRovingChild =
                element.tabIndex < 0 &&
                (element.matches(compositeItem) ||
                    (toolbar != null &&
                        [...toolbar.querySelectorAll<HTMLElement>(controlSelector)].some(other => other.tabIndex === 0)));

            if (isDisabled || isRovingChild || !isVisible(element)) {
                continue;
            }

            const standInKeys: string[] = [];

            // Only one radio per group is in the Tab order; the rest are
            // reached with the arrow keys.
            if (element instanceof HTMLInputElement && element.type === "radio" && element.name) {
                standInKeys.push(
                    ...[...document.querySelectorAll<HTMLElement>(`input[type=radio][name="${CSS.escape(element.name)}"]`)].map(keyOf)
                );
            }

            if (element.tabIndex < 0) {
                const ancestor = element.parentElement?.closest<HTMLElement>(standInAncestor);

                if (ancestor != null && ancestor.tabIndex >= 0 && ancestor.hasAttribute("tabindex")) {
                    standInKeys.push(keyOf(ancestor));
                }

                // A combobox's open button is out of the Tab order by design:
                // its input takes focus and opens the list with the arrow
                // keys. Only a popup toggle beside exactly one combobox counts.
                const isPopupToggle = element.hasAttribute("aria-expanded") || element.hasAttribute("aria-haspopup");
                const comboboxes = element.parentElement?.querySelectorAll<HTMLElement>("[role=combobox]") ?? [];

                if (isPopupToggle && comboboxes.length === 1 && comboboxes[0].tabIndex >= 0) {
                    standInKeys.push(keyOf(comboboxes[0]));
                }
            }

            const name = (
                element.getAttribute("aria-label") ??
                (element as HTMLInputElement).labels?.[0]?.textContent ??
                element.textContent ??
                ""
            )
                .trim()
                .replace(/\s+/g, " ")
                .slice(0, 60);

            controls.push({
                key: keyOf(element),
                label: `${element.getAttribute("role") ?? element.tagName.toLowerCase()} "${name}"`,
                standInKeys,
                excusedBy: excuses.find(excuse => element.matches(excuse.selector))?.id
            });
        }

        return controls;
    }, excuses);
}
