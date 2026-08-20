/**
 * This file has been claimed for ownership from @keycloakify/keycloak-ui-shared version 260502.0.0.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "shared/@patternfly/react-core/index.tsx" --revert
 */

/* eslint-disable react-refresh/only-export-components */

/*
 * Every Admin Console view imports PatternFly through this module — 356 of them,
 * and none reach for `@patternfly/react-core` directly. That makes this the one
 * place where a component can be swapped for its Nebari design-system
 * equivalent without editing (and thereby freezing against upstream) hundreds
 * of vendored files.
 *
 * The star export below keeps every PatternFly component available; the named
 * exports after it shadow the handful that now render Nebari components. ES
 * module semantics give an explicit export precedence over a star export, so
 * ordering here is not what selects the winner — the explicit name always does.
 *
 * Adapters live in `src/components/patternfly/`, which also documents what is
 * deliberately left on PatternFly and why.
 */

export * from "@patternfly/react-core";

import { Button as PatternFlyButton, type ButtonProps as PatternFlyButtonProps } from "@patternfly/react-core";
import {
    Button as NebariBackedButton,
    type PatternFlyButtonProps as NebariBackedButtonProps
} from "@/components/patternfly/Button";

export { TextInput, TextArea, Switch, Checkbox } from "@/components/patternfly/FormControls";
export { Label } from "@/components/patternfly/Label";

/**
 * `variant="control"` is the one variant that stays on PatternFly: those
 * buttons are built to sit flush against an `InputGroup`, sharing its border,
 * and a rounded Nebari button visibly detaches from the field it belongs to.
 */
export function Button({ variant, ...props }: PatternFlyButtonProps) {
    if (variant === "control") {
        return <PatternFlyButton variant={variant} {...props} />;
    }

    return <NebariBackedButton {...(props as NebariBackedButtonProps)} variant={variant} />;
}
