import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/shadcn/label";

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="field-group"
            className={cn(
                "group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3",
                className
            )}
            {...props}
        />
    );
}

function Field({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="field"
            role="group"
            className={cn(
                "group/field flex w-full gap-3 data-[invalid=true]:text-destructive flex-col",
                className
            )}
            {...props}
        />
    );
}

function FieldLabel({
    className,
    ...props
}: React.ComponentProps<typeof Label>) {
    return (
        <Label
            data-slot="field-label"
            className={cn(
                "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50",
                className
            )}
            {...props}
        />
    );
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
    return (
        <p
            data-slot="field-description"
            className={cn(
                "text-muted-foreground text-sm leading-normal font-normal group-has-[[data-orientation=horizontal]]/field:text-balance",
                className
            )}
            {...props}
        />
    );
}

function FieldError({
    className,
    children,
    errors,
    ...props
}: React.ComponentProps<"div"> & {
    errors?: Array<{ message?: string } | undefined>;
}) {
    const content = React.useMemo(() => {
        if (children) return children;
        if (!errors?.length) return null;
        if (errors.length === 1 && errors[0]?.message) return errors[0].message;

        return (
            <ul className="ml-4 flex list-disc flex-col gap-1">
                {errors.map(
                    (error, index) =>
                        error?.message && <li key={index}>{error.message}</li>
                )}
            </ul>
        );
    }, [children, errors]);

    if (!content) return null;

    return (
        <div
            role="alert"
            data-slot="field-error"
            className={cn("text-destructive text-sm font-normal", className)}
            {...props}
        >
            {content}
        </div>
    );
}

export { Field, FieldLabel, FieldDescription, FieldError, FieldGroup };
