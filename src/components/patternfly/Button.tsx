import { Children, createElement, isValidElement, type ElementType, type ReactNode } from "react";
import { Button as NebariButton, type ButtonProps as NebariButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NebariVariant = NonNullable<NebariButtonProps["variant"]>;
type NebariSize = NonNullable<NebariButtonProps["size"]>;

/**
 * PatternFly's variants describe intent; Nebari's describe appearance. Both of
 * PatternFly's bordered-on-surface variants (`secondary`, `tertiary`) land on
 * `outline` because Nebari draws that distinction with `size` instead, and
 * `warning` falls back to `default` with the warning tokens applied below —
 * Nebari has no warning variant, and the Admin Console only uses it on a
 * handful of destructive-adjacent confirmations.
 */
const VARIANT_MAP = {
    primary: "default",
    secondary: "outline",
    tertiary: "outline",
    danger: "destructive",
    warning: "default",
    link: "link",
    plain: "ghost",
    stateful: "ghost"
} as const satisfies Record<string, NebariVariant>;

type PatternFlyVariant = keyof typeof VARIANT_MAP | "control";

const SIZE_MAP = {
    sm: "sm",
    default: "default",
    lg: "lg"
} as const satisfies Record<string, NebariSize>;

type PatternFlyButtonProps = {
    variant?: PatternFlyVariant;
    size?: keyof typeof SIZE_MAP;
    /** PatternFly's disabled flag. Mapped onto the native `disabled`. */
    isDisabled?: boolean;
    /** Marks the button busy without removing it from the tab order. */
    isAriaDisabled?: boolean;
    isLoading?: boolean;
    /** Announced while `isLoading`; becomes the Nebari spinner's label. */
    spinnerAriaValueText?: string;
    /** Leading (or, with `iconPosition`, trailing) icon element. */
    icon?: ReactNode;
    iconPosition?: "left" | "right" | "start" | "end";
    /** Collapses a link button to bare inline text, for use inside a sentence. */
    isInline?: boolean;
    isBlock?: boolean;
    /**
     * PatternFly's polymorphism escape hatch. Accepts a tag name (`"a"`), a
     * component (`Link`), or a render function — all three appear in the Admin
     * Console — and is translated to Base UI's `render` prop.
     */
    component?: ElementType;
    children?: ReactNode;
    className?: string;
} & Omit<NebariButtonProps, "variant" | "size" | "render" | "loading" | "children" | "className">;

/** Text content means the button is not icon-only, so it keeps a text size. */
function hasTextContent(children: ReactNode): boolean {
    return Children.toArray(children).some(child => !isValidElement(child));
}

function resolveSize(
    variant: PatternFlyVariant | undefined,
    size: keyof typeof SIZE_MAP | undefined,
    children: ReactNode
): NebariSize | undefined {
    if (size !== undefined) {
        return SIZE_MAP[size];
    }

    // A `plain` PatternFly button is the icon-only affordance (kebabs, close
    // and copy buttons). Only give it a square icon size when there is no text
    // beside the glyph, or labelled plain buttons would be clipped.
    if (variant === "plain" && !hasTextContent(children)) {
        return "icon";
    }

    return undefined;
}

/**
 * Renders the Nebari `Button` behind PatternFly's `Button` API.
 *
 * `variant="control"` is passed through to PatternFly untouched: those buttons
 * are built to sit flush against an `InputGroup` and a rounded Nebari button
 * would visibly detach. That case is handled by the caller in
 * `src/shared/@patternfly/react-core/index.tsx`.
 */
export function Button({
    variant,
    size,
    isDisabled,
    isAriaDisabled,
    isLoading,
    spinnerAriaValueText,
    icon,
    iconPosition = "start",
    isInline,
    isBlock,
    component,
    className,
    children,
    disabled,
    type,
    ...props
}: PatternFlyButtonProps) {
    const trailingIcon = iconPosition === "right" || iconPosition === "end";

    const content = (
        <>
            {icon !== undefined && !trailingIcon && icon}
            {children}
            {icon !== undefined && trailingIcon && icon}
        </>
    );

    let render: NebariButtonProps["render"];

    if (typeof component === "string") {
        render = createElement(component);
    } else if (component !== undefined) {
        // `component` is often an inline `(props) => <Link {...props} to={…} />`
        // in the Admin Console, so it has to be invoked rather than cloned.
        render = renderProps => createElement(component, renderProps);
    } else {
        // `type` has to be baked into the render element rather than passed as a
        // prop: Base UI gives the render element's own props precedence, so the
        // Nebari default of `<button type="button" />` would otherwise swallow a
        // caller's `type="submit"` and every form submit button would silently
        // stop submitting.
        render = createElement("button", { type: type ?? "button" });
    }

    return (
        <NebariButton
            {...props}
            className={cn(
                variant === "warning" &&
                    "bg-warning text-warning-foreground hover:bg-warning/85 active:bg-warning/85",
                // PatternFly's inline link is bare text in a sentence: no button
                // box, no padding, and it sits on the surrounding text baseline.
                isInline && "h-auto p-0 align-baseline",
                isBlock && "w-full",
                className
            )}
            disabled={disabled ?? isDisabled}
            loading={isLoading}
            render={render}
            size={resolveSize(variant, size, children)}
            variant={variant === undefined ? undefined : VARIANT_MAP[variant as keyof typeof VARIANT_MAP]}
            {...(isAriaDisabled ? { "aria-disabled": true } : {})}
            {...(isLoading && spinnerAriaValueText !== undefined
                ? { "aria-label": props["aria-label"] ?? spinnerAriaValueText }
                : {})}
        >
            {content}
        </NebariButton>
    );
}

export type { PatternFlyButtonProps };
