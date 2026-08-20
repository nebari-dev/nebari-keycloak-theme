import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { ChevronDownIcon, LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { ThemeMode } from "@/hooks/use-nebari-theme";
import { cn } from "@/lib/utils";

/**
 * Hover/press treatment for controls sitting directly on the header bar. They
 * cannot use the plain `ghost` hover, because `--accent` is tuned for the page
 * surface rather than the header's own background.
 */
const HEADER_ACTION =
    "hover:bg-header-action-hover hover:no-underline focus-visible:ring-offset-0 active:bg-header-action-hover data-[popup-open]:bg-header-action-hover data-[popup-open]:no-underline";

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof SunIcon }[] = [
    { value: "light", label: "Light", icon: SunIcon },
    { value: "dark", label: "Dark", icon: MoonIcon },
    { value: "system", label: "System", icon: MonitorIcon }
];

/**
 * Light / Dark / System as a menu radio group rather than tabs. It only looks
 * like a segmented control: `role="tab"` would promise an associated `tabpanel`
 * that does not exist, and tab key handling would fight the menu's own
 * arrow-key navigation. "Pick exactly one of three" is what `menuitemradio`
 * means.
 */
function ThemePicker({
    themeMode,
    setThemeMode
}: {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
}) {
    return (
        <MenuPrimitive.RadioGroup
            className="my-2 flex gap-1 rounded-md bg-muted p-0.5"
            onValueChange={value => setThemeMode(value as ThemeMode)}
            value={themeMode}
        >
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <MenuPrimitive.RadioItem
                    className={cn(
                        "flex flex-1 cursor-pointer select-none items-center justify-center gap-1.5 rounded-[5px] px-2 py-1 font-medium text-xs outline-none",
                        "text-muted-foreground data-[highlighted]:bg-background/60",
                        "data-[checked]:bg-background data-[checked]:text-foreground data-[checked]:shadow-xs",
                        "focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                    closeOnClick={false}
                    key={value}
                    value={value}
                >
                    <Icon aria-hidden className="size-3.5 shrink-0" />
                    {label}
                </MenuPrimitive.RadioItem>
            ))}
        </MenuPrimitive.RadioGroup>
    );
}

/**
 * Initials fall back to the username so the trigger is never an empty circle.
 * The registry has no avatar component yet, so this is composed from tokens
 * rather than forked from one.
 */
export function Avatar({ picture, name }: { picture?: string | null; name: string }) {
    /* Truthiness, not `!== undefined`: PatternFly's masthead passes the raw
     * `picture` claim, which can arrive as `null` or an empty string and would
     * otherwise render a broken image where the initials belong. */
    if (picture) {
        return <img alt="" className="size-6 shrink-0 rounded-full object-cover" src={picture} />;
    }

    const initials =
        name
            .split(/\s+/)
            .filter(Boolean)
            .map(word => word[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "?";

    return (
        <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-[10px] leading-none text-primary-foreground"
        >
            {initials}
        </span>
    );
}

type ProfileMenuProps = {
    name: string;
    email?: string;
    picture?: string | null;
    /** Menu entries specific to a console, rendered above the sign-out item. */
    children?: ReactNode;
    /** Omitted when the console has sign-out disabled (`features.hasLogout`). */
    onSignOut?: () => void;
    signOutLabel?: string;
    /** `false` shows the avatar alone, for `features.hasUsername === false`. */
    showName?: boolean;
    triggerLabel: string;
    /**
     * Theme state from `useNebariTheme`, which the console's header owns.
     * `useThemePreference` must be mounted once per document, so this component
     * is handed the state rather than calling the hook a second time.
     */
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    /** `false` hides the picker, for a realm with Dark Mode switched off. */
    canChangeTheme?: boolean;
    "data-testid"?: string;
};

/**
 * The account control shared by both consoles' headers: avatar, name and
 * chevron in a **single** trigger that opens one menu.
 *
 * PatternFly's `KeycloakMasthead` split this into a username dropdown and a
 * separate avatar sitting beside it — two adjacent controls where the design
 * system has one, and the avatar was not clickable at all. Combining them is
 * what the canonical Nebari header specifies, and it also means the avatar now
 * participates in opening the menu.
 *
 * The trigger overrides `render` with a plain `<button>` deliberately. The
 * registry's `DropdownMenuTrigger` renders the Nebari `Button`, which takes
 * `ref` as a plain prop — the React 19 convention — and this app is on React 18,
 * where a function component cannot receive a ref, so Base UI's anchor ref came
 * back null and the menu never positioned itself. A DOM element gives Base UI a
 * real node, while `buttonVariants` keeps the design-system styling; the
 * registry exports that cva function precisely so it can be reused.
 */
export function ProfileMenu({
    name,
    email,
    picture,
    children,
    onSignOut,
    signOutLabel,
    showName = true,
    triggerLabel,
    themeMode,
    setThemeMode,
    canChangeTheme = true,
    "data-testid": testId
}: ProfileMenuProps) {
    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger
                aria-label={triggerLabel}
                className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-auto px-2.5 py-1 text-header-foreground",
                    HEADER_ACTION
                )}
                data-testid={testId}
                render={<button type="button" />}
            >
                <Avatar name={name} picture={picture} />
                {showName && <span className="max-w-40 truncate text-sm">{name}</span>}
                <ChevronDownIcon aria-hidden className="size-4 shrink-0" />
            </DropdownMenuTrigger>

            <DropdownMenuPortal>
                <DropdownMenuContent align="end" className="w-[248px] p-2">
                    <div className="border-b px-1.5 pb-2">
                        <p className="truncate font-medium text-foreground text-sm">{name}</p>
                        {email !== undefined && (
                            <p className="truncate text-muted-foreground text-xs">{email}</p>
                        )}
                    </div>

                    {canChangeTheme && (
                        <ThemePicker setThemeMode={setThemeMode} themeMode={themeMode} />
                    )}

                    {children}

                    {onSignOut !== undefined && (
                        <>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                className="text-sign-out-foreground data-[highlighted]:text-sign-out-foreground"
                                onClick={onSignOut}
                            >
                                <LogOutIcon aria-hidden className="size-4 shrink-0" />
                                {signOutLabel}
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenuPortal>
        </DropdownMenu>
    );
}

export { DropdownMenuItem as ProfileMenuItem };
