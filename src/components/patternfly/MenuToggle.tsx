import {
    MenuToggle as PatternFlyMenuToggle,
    type MenuToggleElement,
    type MenuToggleProps
} from "@patternfly/react-core";
import { forwardRef } from "react";
import { labelIncludingVisibleText, textOf } from "./accessibleName";

/**
 * PatternFly's `MenuToggle`, unchanged except for its `aria-label`.
 *
 * Keycloak's select controls label the toggle with the field name while it
 * shows the selected value, so the visible text is missing from the accessible
 * name (WCAG 2.5.3). This adds it; see `labelIncludingVisibleText`. An
 * `aria-labelledby` is left alone, since it already decides the name.
 */
export const MenuToggle = forwardRef<MenuToggleElement, MenuToggleProps>(function MenuToggle(props, ref) {
    const ariaLabel =
        props["aria-labelledby"] === undefined
            ? labelIncludingVisibleText(props["aria-label"], textOf(props.children))
            : props["aria-label"];

    return <PatternFlyMenuToggle {...props} aria-label={ariaLabel} ref={ref} />;
});
