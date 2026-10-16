import { useState, type ComponentProps } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Input } from "@/components/shadcn/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<ComponentProps<typeof Input>, "type"> & {
    showLabel: string;
    hideLabel: string;
};

/**
 * Password field with a show/hide toggle, built from the stock shadcn `Input`.
 *
 * The toggle is a real button, but `tabIndex={-1}` keeps it out of sequential
 * navigation, matching the Nebari theme's `PasswordField`. The login pages set
 * positive tabindexes on the surrounding fields, so a focusable toggle would
 * otherwise sort after the submit button — landing between "Sign in" and the
 * end of the form rather than beside the field it belongs to. It stays
 * reachable by pointer and by screen-reader navigation.
 */
export function PasswordInput({
    className,
    showLabel,
    hideLabel,
    ...props
}: PasswordInputProps) {
    const [isRevealed, setIsRevealed] = useState(false);

    return (
        <div className="relative">
            <Input
                {...props}
                type={isRevealed ? "text" : "password"}
                className={cn("bg-muted pr-10", className)}
            />
            <button
                type="button"
                tabIndex={-1}
                onClick={() => setIsRevealed(current => !current)}
                aria-label={isRevealed ? hideLabel : showLabel}
                aria-pressed={isRevealed}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md outline-none focus-visible:ring-[3px]"
            >
                {isRevealed ? (
                    <EyeOffIcon className="size-4" aria-hidden="true" />
                ) : (
                    <EyeIcon className="size-4" aria-hidden="true" />
                )}
            </button>
        </div>
    );
}
