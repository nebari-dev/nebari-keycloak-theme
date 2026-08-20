import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PasswordFieldProps = Omit<ComponentProps<typeof Input>, "type" | "endAdornment"> & {
    /** Accessible name for the reveal toggle, e.g. `msgStr("showPassword")`. */
    showLabel: string;
    hideLabel: string;
};

/**
 * A password `Input` with a reveal toggle, shared by every login page that asks
 * for one.
 *
 * The toggle lives in the `Input`'s `endAdornment` slot rather than beside the
 * field, so the control keeps one border and one focus ring. It is deliberately
 * `type="button"` and outside the tab order after the field itself — revealing a
 * password is a convenience, not a step in filling the form.
 */
export function PasswordField({ showLabel, hideLabel, ...props }: PasswordFieldProps) {
    const [isVisible, setIsVisible] = useState(false);

    /* The invalid state puts a triangle-alert in the same trailing slot, so the
     * toggle stands down rather than overlapping it. */
    const isInvalid = props["aria-invalid"] === true || props["aria-invalid"] === "true";

    return (
        <Input
            {...props}
            endAdornment={isInvalid ? undefined : (
                <Button
                    aria-label={isVisible ? hideLabel : showLabel}
                    onClick={() => setIsVisible(visible => !visible)}
                    size="icon-sm"
                    tabIndex={-1}
                    variant="ghost"
                >
                    {isVisible ? <EyeOff /> : <Eye />}
                </Button>
            )}
            type={isVisible ? "text" : "password"}
        />
    );
}
