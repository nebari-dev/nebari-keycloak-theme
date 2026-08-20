import { XIcon } from "lucide-react";
import { createElement, type ComponentProps, type ReactNode } from "react";
import { Badge as NebariBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NebariVariant = NonNullable<ComponentProps<typeof NebariBadge>["variant"]>;

/**
 * PatternFly names label colours; Nebari names roles. Only the colours that
 * carry meaning in the Admin Console map onto a semantic token — `red` is the
 * one true destructive, `green` reads as success and `orange`/`gold` as
 * warning. The remaining hues (`cyan`, `purple`) exist for visual variety
 * rather than status, so they collapse onto the neutral chip instead of
 * inventing tokens the design system does not define.
 */
const COLOR_MAP = {
    blue: { variant: "default" },
    cyan: { variant: "secondary" },
    green: { variant: "ghost", className: "bg-success text-success-foreground" },
    orange: { variant: "ghost", className: "bg-warning text-warning-foreground" },
    gold: { variant: "ghost", className: "bg-warning text-warning-foreground" },
    purple: { variant: "secondary" },
    red: { variant: "destructive" },
    grey: { variant: "secondary" }
} as const satisfies Record<string, { variant: NebariVariant; className?: string }>;

type PatternFlyLabelProps = {
    /** Defaults to `grey`, matching PatternFly. */
    color?: keyof typeof COLOR_MAP;
    /** PatternFly's `outline` swaps the fill for a border. */
    variant?: "outline" | "filled";
    isCompact?: boolean;
    icon?: ReactNode;
    /** Renders a trailing dismiss button. */
    onClose?: (event: React.MouseEvent) => void;
    closeBtnAriaLabel?: string;
    href?: string;
    children?: ReactNode;
    className?: string;
} & Omit<ComponentProps<typeof NebariBadge>, "variant" | "children" | "className" | "render">;

/** Nebari `Badge` behind PatternFly's `Label` API. */
export function Label({
    color = "grey",
    variant,
    isCompact,
    icon,
    onClose,
    closeBtnAriaLabel = "Close",
    href,
    className,
    children,
    ...props
}: PatternFlyLabelProps) {
    const mapped = COLOR_MAP[color] ?? COLOR_MAP.grey;
    const isOutline = variant === "outline";

    return (
        <NebariBadge
            {...props}
            className={cn(
                !isOutline && "className" in mapped ? (mapped as { className?: string }).className : undefined,
                isCompact && "px-1.5 py-0 text-[11px]",
                className
            )}
            render={href === undefined ? undefined : createElement("a", { href })}
            variant={isOutline ? "outline" : mapped.variant}
        >
            {icon}
            {children}
            {onClose !== undefined && (
                <button
                    aria-label={closeBtnAriaLabel}
                    className="-mr-0.5 ml-0.5 inline-flex size-3.5 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none hover:bg-foreground/15 focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={onClose}
                    type="button"
                >
                    <XIcon aria-hidden className="size-2.5" />
                </button>
            )}
        </NebariBadge>
    );
}

export type { PatternFlyLabelProps };
