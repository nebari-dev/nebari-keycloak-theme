import {
    forwardRef,
    useId,
    useLayoutEffect,
    useRef,
    type ChangeEvent,
    type ComponentProps,
    type ForwardedRef,
    type ReactNode
} from "react";
import { Checkbox as NebariCheckbox } from "@/components/ui/checkbox";
import { Input as NebariInput } from "@/components/ui/input";
import { Switch as NebariSwitch } from "@/components/ui/switch";
import { Textarea as NebariTextarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * PatternFly reports validity as a string; Nebari (via Base UI) reads
 * `aria-invalid`, which also gives it the non-colour triangle cue. Only `error`
 * is a real invalid state — `warning` and `success` are advisory and must not
 * make the field announce itself as invalid to assistive tech.
 */
type Validated = "default" | "success" | "warning" | "error" | "noval";

function isInvalid(validated: Validated | undefined): true | undefined {
    return validated === "error" ? true : undefined;
}

/** Applied when `validated="warning"`, which has no Nebari counterpart. */
const WARNING_FIELD = "border-warning-foreground hover:border-warning-foreground";

/**
 * PatternFly's `readOnlyVariant` is how the Admin Console marks a field
 * immutable — the mapper type on a client-scope mapper, and a mapper's name once
 * it exists. It is a *behaviour* prop, not a styling one: PatternFly sets
 * `readOnly` on the input from it, independently of `isReadOnly`. Left
 * unmapped it fell through to the DOM as an unknown attribute and the field
 * stayed editable, so a react-hook-form-bound one could be changed and saved.
 *
 * `"plain"` additionally drops the field's chrome so the value reads as text.
 */
type ReadOnlyVariant = "default" | "plain";

const READ_ONLY_PLAIN = "border-transparent bg-transparent shadow-none";

function resolveReadOnly(
    readOnly: boolean | undefined,
    isReadOnly: boolean | undefined,
    readOnlyVariant: ReadOnlyVariant | undefined
): boolean | undefined {
    return readOnly ?? isReadOnly ?? (readOnlyVariant !== undefined ? true : undefined);
}

/** The second argument Base UI hands to `onCheckedChange`. */
type CheckedChangeEventDetails = {
    /** The native event behind the toggle — a change on the hidden input. */
    event: Event;
};

/**
 * Adapts Base UI's `onCheckedChange` to PatternFly's `onChange(event, checked)`.
 *
 * Base UI does not pass an event — it passes an `eventDetails` wrapper
 * (`{ reason, event, cancel, … }`) that has no `target` or `currentTarget`.
 * Handing that to a PatternFly consumer breaks them: `PartialImport` reads
 * `event.currentTarget.name` to work out which resource was ticked, and threw
 * the moment one was ticked.
 *
 * `eventDetails.event` is the way through — its `target` is the hidden `<input
 * type="checkbox">` that carries `name`, `checked` and `value` — but it is a
 * *native* event, so `currentTarget` is already cleared by the time a handler
 * runs. Consumers read the two interchangeably, so both are pinned to that input
 * here; verified in a browser to give `currentTarget.name` and `target.checked`.
 */
function toChangeEvent(
    details: CheckedChangeEventDetails
): ChangeEvent<HTMLInputElement> {
    const { event } = details;
    const target = event.target as HTMLInputElement;

    return {
        target,
        currentTarget: target,
        type: event.type,
        nativeEvent: event,
        bubbles: event.bubbles,
        cancelable: event.cancelable,
        defaultPrevented: event.defaultPrevented,
        eventPhase: event.eventPhase,
        isTrusted: event.isTrusted,
        timeStamp: event.timeStamp,
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
        isDefaultPrevented: () => event.defaultPrevented,
        isPropagationStopped: () => false,
        persist: () => {}
    } as ChangeEvent<HTMLInputElement>;
}

/**
 * Keeps a value-driven field controlled from its very first render.
 *
 * Base UI locks the controlled/uncontrolled decision once: `useControlled`
 * stores `controlled !== undefined` in a ref on mount and never revisits it. A
 * PatternFly `TextInput` is always value-driven, but plenty of Admin Console
 * fields get their value from an async fetch — the mapper type on a client-scope
 * mapper is one — so they mounted with `value === undefined`, were locked
 * uncontrolled, and stayed **permanently blank** once the data arrived.
 *
 * Prop *presence* is the discriminator, not definedness: a caller that spreads
 * `{...register(…)}` passes no `value` at all and must stay uncontrolled, while
 * a caller that passes `value={maybeUndefined}` means "controlled, empty for
 * now".
 */
function controlledValue<T extends { value?: unknown }>(props: T) {
    return "value" in props ? { value: (props.value ?? "") as T["value"] } : undefined;
}

function assignRef<T>(ref: ForwardedRef<T> | undefined, value: T | null) {
    if (typeof ref === "function") {
        ref(value);
    } else if (ref) {
        ref.current = value;
    }
}

/**
 * Hands the underlying control element to a forwarded ref.
 *
 * Refs matter here more than they look: 29 Admin Console views spread
 * `{...register(…)}` from react-hook-form onto these controls, and that spread
 * carries a callback ref. Without it react-hook-form never sees the element —
 * loaded values do not reach the field and edits do not reach the form, so a
 * user-profile tab renders blank and saves blank.
 *
 * The Nebari components are plain function components, and React 18 strips
 * `ref` from a plain function component's props before it can reach the DOM
 * node inside. Where the component is built on Base UI (see `TextInput`) the
 * `render` prop is the documented way through. Where it is not, the node is
 * resolved from a wrapper that is `display: contents`, so it participates in no
 * layout of its own.
 */
function useResolvedControl<T extends HTMLElement>(
    selector: string,
    forwarded: ForwardedRef<T> | undefined
) {
    const host = useRef<HTMLSpanElement | null>(null);

    useLayoutEffect(() => {
        assignRef(forwarded, host.current?.querySelector<T>(selector) ?? null);

        return () => assignRef(forwarded, null);
    }, [forwarded, selector]);

    return host;
}

type TextInputProps = {
    /** PatternFly signature: `(event, value)`, value second. */
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, value: string) => void;
    isDisabled?: boolean;
    isReadOnly?: boolean;
    /** PatternFly's immutable-field flag; implies `readOnly`. */
    readOnlyVariant?: ReadOnlyVariant;
    isRequired?: boolean;
    validated?: Validated;
    /** Rendered inside the field's trailing edge (PatternFly's search/calendar icons). */
    customIcon?: ReactNode;
    /** PatternFly's own ref prop; the Admin Console uses it for typeahead focus. */
    innerRef?: ForwardedRef<HTMLInputElement>;
} & Omit<ComponentProps<typeof NebariInput>, "onChange">;

/** Nebari `Input` behind PatternFly's `TextInput` API. */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
    {
        onChange,
        isDisabled,
        isReadOnly,
        readOnlyVariant,
        isRequired,
        validated,
        customIcon,
        innerRef,
        className,
        disabled,
        readOnly,
        required,
        ...props
    },
    ref
) {
    return (
        <NebariInput
            {...props}
            aria-invalid={props["aria-invalid"] ?? isInvalid(validated)}
            className={cn(
                validated === "warning" && WARNING_FIELD,
                readOnlyVariant === "plain" && READ_ONLY_PLAIN,
                className
            )}
            disabled={disabled ?? isDisabled}
            endAdornment={customIcon}
            onChange={event => onChange?.(event, event.target.value)}
            readOnly={resolveReadOnly(readOnly, isReadOnly, readOnlyVariant)}
            /* Base UI's `Input` is a `forwardRef` component that merges the
             * render element's props — including its ref — onto the real
             * `<input>`. Going through `render` is what lets a ref survive the
             * plain function component in between. */
            render={<input ref={innerRef ?? ref} />}
            required={required ?? isRequired}
            {...controlledValue(props)}
        />
    );
});

type TextAreaProps = {
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>, value: string) => void;
    isDisabled?: boolean;
    isReadOnly?: boolean;
    /** PatternFly's immutable-field flag; implies `readOnly`. */
    readOnlyVariant?: ReadOnlyVariant;
    isRequired?: boolean;
    validated?: Validated;
    resizeOrientation?: "horizontal" | "vertical" | "both" | "none";
    innerRef?: ForwardedRef<HTMLTextAreaElement>;
} & Omit<ComponentProps<typeof NebariTextarea>, "onChange">;

const RESIZE = {
    horizontal: "resize-x",
    vertical: "resize-y",
    both: "resize",
    none: "resize-none"
} as const;

/**
 * Nebari `Textarea` behind PatternFly's `TextArea` API.
 *
 * `KeycloakTextArea` casts this component to a `ForwardRefExoticComponent`, so
 * it has to genuinely forward one. Nebari's `Textarea` is a plain `<textarea>`
 * with no Base UI `render` hatch, so the node is resolved from the wrapper.
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
    {
        onChange,
        isDisabled,
        isReadOnly,
        readOnlyVariant,
        isRequired,
        validated,
        resizeOrientation,
        innerRef,
        className,
        disabled,
        readOnly,
        required,
        ...props
    },
    ref
) {
    const host = useResolvedControl<HTMLTextAreaElement>(
        '[data-slot="textarea"]',
        innerRef ?? ref
    );

    return (
        <span ref={host} style={{ display: "contents" }}>
            <NebariTextarea
                {...props}
                aria-invalid={props["aria-invalid"] ?? isInvalid(validated)}
                className={cn(
                    resizeOrientation !== undefined && RESIZE[resizeOrientation],
                    validated === "warning" && WARNING_FIELD,
                    readOnlyVariant === "plain" && READ_ONLY_PLAIN,
                    className
                )}
                disabled={disabled ?? isDisabled}
                onChange={event => onChange?.(event, event.target.value)}
                readOnly={resolveReadOnly(readOnly, isReadOnly, readOnlyVariant)}
                required={required ?? isRequired}
                {...controlledValue(props)}
            />
        </span>
    );
});

type SwitchProps = {
    /** PatternFly signature: `(event, checked)`, checked second. */
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
    isChecked?: boolean;
    isDisabled?: boolean;
    /** Shown beside the switch; with `labelOff`, only while checked. */
    label?: ReactNode;
    /** Shown instead of `label` while unchecked. */
    labelOff?: ReactNode;
    /** Places the label before the switch. */
    isReversed?: boolean;
    id?: string;
    className?: string;
} & Omit<ComponentProps<typeof NebariSwitch>, "onChange" | "checked" | "className">;

/**
 * Nebari `Switch` behind PatternFly's `Switch` API.
 *
 * PatternFly bakes the label into the component; Nebari's is the control alone,
 * so the label is composed here. `label` / `labelOff` are a single slot that
 * swaps with state, not two independent labels.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
    { onChange, isChecked, isDisabled, label, labelOff, isReversed, id, className, disabled, ...props },
    ref
) {
    const generatedId = useId();
    const switchId = id ?? generatedId;
    const text = isChecked === false && labelOff !== undefined ? labelOff : label;
    const host = useResolvedControl<HTMLButtonElement>('[data-slot="switch"]', ref);

    const control = (
        <NebariSwitch
            {...props}
            checked={isChecked}
            disabled={disabled ?? isDisabled}
            id={switchId}
            onCheckedChange={(checked, details) => onChange?.(toChangeEvent(details), checked)}
        />
    );

    if (text === undefined) {
        return (
            <span className={className} ref={host}>
                {control}
            </span>
        );
    }

    return (
        <span className={cn("inline-flex items-center gap-2", className)} ref={host}>
            {isReversed && (
                <label className="cursor-pointer select-none text-foreground text-sm" htmlFor={switchId}>
                    {text}
                </label>
            )}
            {control}
            {!isReversed && (
                <label className="cursor-pointer select-none text-foreground text-sm" htmlFor={switchId}>
                    {text}
                </label>
            )}
        </span>
    );
});

type CheckboxProps = {
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
    isChecked?: boolean | null;
    isDisabled?: boolean;
    isRequired?: boolean;
    label?: ReactNode;
    description?: ReactNode;
    /** PatternFly renders this under the label; kept as a sibling block. */
    body?: ReactNode;
} & Omit<ComponentProps<typeof NebariCheckbox>, "onChange" | "checked" | "children" | "description">;

/**
 * Nebari `Checkbox` behind PatternFly's `Checkbox` API. PatternFly's
 * `isChecked={null}` means indeterminate.
 */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
    { onChange, isChecked, isDisabled, isRequired, label, description, body, disabled, required, ...props },
    ref
) {
    const host = useResolvedControl<HTMLButtonElement>('[data-slot="checkbox"]', ref);

    const checkbox = (
        <NebariCheckbox
            {...props}
            checked={isChecked === null ? false : isChecked}
            description={description}
            disabled={disabled ?? isDisabled}
            indeterminate={isChecked === null || undefined}
            onCheckedChange={(checked, details) => onChange?.(toChangeEvent(details), checked)}
            required={required ?? isRequired}
        >
            {label}
        </NebariCheckbox>
    );

    if (body === undefined) {
        return (
            <span ref={host} style={{ display: "contents" }}>
                {checkbox}
            </span>
        );
    }

    return (
        <span className="flex flex-col gap-1" ref={host}>
            {checkbox}
            <span className="pl-6">{body}</span>
        </span>
    );
});
