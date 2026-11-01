import { Children, isValidElement, type ReactNode } from "react";

/**
 * The text a React subtree renders, as far as it can be read without rendering
 * it: strings and numbers, collected through the `children` of host and
 * component elements alike. A component that produces its text from other
 * props contributes nothing, which errs towards leaving a label alone.
 */
export function textOf(node: ReactNode): string {
    return Children.toArray(node)
        .map(child => {
            if (typeof child === "string" || typeof child === "number") {
                return String(child);
            }
            if (isValidElement<{ children?: ReactNode }>(child)) {
                return textOf(child.props.children);
            }
            return "";
        })
        .join(" ");
}

function words(text: string): string[] {
    return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function contains(haystack: string[], needle: string[]): boolean {
    for (let start = 0; start + needle.length <= haystack.length; start++) {
        if (needle.every((word, offset) => word === haystack[start + offset])) {
            return true;
        }
    }
    return false;
}

/**
 * WCAG 2.5.3 (Label in Name): a control with visible text must have that text
 * in its accessible name, so a speech user can say what they see. Keycloak sets
 * an `aria-label` that drops it in two common shapes, both fixed here:
 *
 * - A select toggle labelled with its field name ("Protocol") that shows the
 *   selected value ("OpenID Connect"). The name becomes "Protocol: OpenID
 *   Connect".
 * - A button labelled with a shorter form ("Add") of its visible text ("Add
 *   valid redirect URIs"). The `aria-label` is dropped so the visible text
 *   names it.
 *
 * Matching is by whole words, in order, case-insensitively, the same
 * comparison axe's `label-content-name-mismatch` rule makes. Returns the
 * `aria-label` to render, or `undefined` to render none.
 */
export function labelIncludingVisibleText(
    ariaLabel: string | undefined,
    visibleText: string
): string | undefined {
    const label = words(ariaLabel ?? "");
    const text = words(visibleText);

    if (ariaLabel === undefined || label.length === 0 || text.length === 0 || contains(label, text)) {
        return ariaLabel;
    }
    if (contains(text, label)) {
        return undefined;
    }
    return `${ariaLabel}: ${visibleText.trim()}`;
}
